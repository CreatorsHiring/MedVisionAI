from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User, UserRole
from app.models.screening import Screening
from app.models.report import Report
from app.models.patient import Patient
from app.auth.deps import get_current_user, require_role
from app.reports.pdf_generator import generate_pdf_report
from app.notifications.email import send_notification
from fastapi.responses import FileResponse

router = APIRouter()

@router.post("/{screening_id}/generate")
def generate_report(
    screening_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.HEALTHCARE_WORKER, UserRole.ADMIN]))
):
    screening = db.query(Screening).filter(Screening.id == screening_id).first()
    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")
        
    patient = db.query(Patient).filter(Patient.id == screening.patient_id).first()
    
    # Generate PDF
    pdf_path = generate_pdf_report(screening, patient)
    
    # Create DB entry
    report = Report(screening_id=screening.id, pdf_path=pdf_path)
    db.add(report)
    db.commit()
    db.refresh(report)
    
    # Push to RAG Store
    from app.rag.store import chroma_store
    report_text = f"Screening ID: {screening.screening_id}. Prediction: {screening.prediction}. Confidence: {screening.confidence * 100:.1f}%. Risk Level: {screening.risk_level}. Recommendation: {screening.recommendation}"
    chroma_store.add_report(patient.id, screening.screening_id, report_text)
    
    return {"status": "success", "report_id": report.id}

@router.post("/{report_id}/publish")
def publish_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.HEALTHCARE_WORKER, UserRole.ADMIN]))
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    report.is_published = True
    db.commit()
    
    patient = db.query(Patient).filter(Patient.id == report.screening.patient_id).first()
    
    # Notify patient
    if patient.email:
        send_notification(patient.email, report.screening.screening_id)
        
    return {"status": "success", "message": "Report published and notification sent"}

@router.get("/{report_id}/download")
def download_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    # Patient authorization check
    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or report.screening.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this report")
            
    if not report.is_published and current_user.role == UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Report is not published yet")

    return FileResponse(report.pdf_path, media_type="application/pdf", filename=f"MedVisionAI_Report_{report.screening.screening_id}.pdf")

@router.get("/screening/{screening_id}/download")
def download_screening_report(
    screening_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Lookup screening by screening_id string or integer id
    screening = None
    if screening_id.isdigit():
        screening = db.query(Screening).filter(Screening.id == int(screening_id)).first()
    if not screening:
        screening = db.query(Screening).filter(Screening.screening_id == screening_id).first()
        
    if not screening:
        raise HTTPException(status_code=404, detail="Screening record not found")
        
    patient = db.query(Patient).filter(Patient.id == screening.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
        
    # Authorization check for patients
    if current_user.role == UserRole.PATIENT:
        if patient.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this report")
            
    # Check if report already exists and file is on disk
    report = db.query(Report).filter(Report.screening_id == screening.id).first()
    if not report or not report.pdf_path or not os.path.exists(report.pdf_path):
        # Auto-generate PDF report
        pdf_path = generate_pdf_report(screening, patient)
        if not report:
            report = Report(screening_id=screening.id, pdf_path=pdf_path, is_published=True)
            db.add(report)
        else:
            report.pdf_path = pdf_path
            report.is_published = True
        db.commit()
        db.refresh(report)

    return FileResponse(
        report.pdf_path,
        media_type="application/pdf",
        filename=f"MedVisionAI_Report_{screening.screening_id}.pdf"
    )

@router.get("/my-reports")
def get_my_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.PATIENT]))
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
        
    reports = db.query(Report).join(Screening).filter(
        Screening.patient_id == patient.id,
        Report.is_published == True
    ).order_by(Report.created_at.desc()).all()
    
    return [
        {
            "id": r.id,
            "screening_id": r.screening.screening_id,
            "prediction": r.screening.prediction,
            "confidence": r.screening.confidence,
            "created_at": r.created_at,
            "pdf_path": r.pdf_path
        } for r in reports
    ]

