from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database.session import get_db
from app.models.user import User, UserRole
from app.models.screening import Screening
from app.models.patient import Patient
from app.auth.deps import get_current_user, require_role
from app.services.inference import inference_service
from app.rag.llm import generate_ai_clinical_context
import shutil
import os
import uuid

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def path_to_url(path: str | None) -> str | None:
    if not path:
        return None
    norm = path.replace("\\", "/")
    if norm.startswith("uploads/"):
        return f"http://localhost:8000/{norm}"
    return f"http://localhost:8000/uploads/{norm}"

@router.get("/stats")
def get_screening_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.HEALTHCARE_WORKER, UserRole.ADMIN]))
):
    now = datetime.now()
    today_start = datetime(now.year, now.month, now.day, 0, 0, 0)
    
    total = db.query(Screening).count()
    today_count = db.query(Screening).filter(Screening.created_at >= today_start).count()
    dr_count = db.query(Screening).filter(Screening.prediction == "DR PRESENT").count()
    no_dr_count = db.query(Screening).filter(Screening.prediction == "NO DR").count()
    
    return {
        "total_screenings": total,
        "screenings_today": today_count,
        "dr_present_count": dr_count,
        "no_dr_count": no_dr_count
    }

@router.get("/dashboard-stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.HEALTHCARE_WORKER, UserRole.ADMIN]))
):
    now = datetime.now()
    today_start = datetime(now.year, now.month, now.day, 0, 0, 0)
    seven_days_ago = today_start - timedelta(days=7)

    # Stat card totals & trends
    total_screenings = db.query(Screening).count()
    screenings_today = db.query(Screening).filter(Screening.created_at >= today_start).count()
    
    total_patients = db.query(Patient).count()
    
    screenings_this_week = db.query(Screening).filter(Screening.created_at >= seven_days_ago).count()
    
    dr_cases_total = db.query(Screening).filter(Screening.prediction == "DR PRESENT").count()
    dr_cases_this_week = db.query(Screening).filter(Screening.prediction == "DR PRESENT", Screening.created_at >= seven_days_ago).count()

    # Trends strings
    today_trend = f"+{screenings_today} today" if screenings_today > 0 else "0 today"
    patients_trend = f"{total_patients} registered"
    screenings_trend = f"+{screenings_this_week} this week"
    dr_trend = f"+{dr_cases_this_week} this week"

    # Volume chart (last 14 days)
    volume_chart = []
    for i in range(14):
        day_date = (today_start - timedelta(days=13 - i)).date()
        day_start = datetime(day_date.year, day_date.month, day_date.day, 0, 0, 0)
        day_end = day_start + timedelta(days=1)
        
        day_screenings = db.query(Screening).filter(
            Screening.created_at >= day_start,
            Screening.created_at < day_end
        ).all()
        
        total_day = len(day_screenings)
        dr_day = sum(1 for s in day_screenings if s.prediction == "DR PRESENT")
        no_dr_day = total_day - dr_day
        
        volume_chart.append({
            "date": day_date.strftime("%b %d"),
            "full_date": str(day_date),
            "screenings": total_day,
            "dr_cases": dr_day,
            "no_dr_cases": no_dr_day
        })

    # Risk distribution
    all_screenings = db.query(Screening).all()
    high_count = 0
    med_count = 0
    low_count = 0
    for s in all_screenings:
        is_dr = (s.prediction == "DR PRESENT")
        conf = s.confidence or 0.0
        if is_dr and conf >= 0.80:
            high_count += 1
        elif is_dr and conf >= 0.50:
            med_count += 1
        else:
            low_count += 1
            
    risk_distribution = [
        {"name": "High Risk", "value": high_count, "color": "#E11D48"},
        {"name": "Medium Risk", "value": med_count, "color": "#F59E0B"},
        {"name": "Low Risk", "value": low_count, "color": "#10B981"}
    ]

    # High-Risk alerts (unreviewed only)
    high_risk_screenings = db.query(Screening).filter(
        Screening.prediction == "DR PRESENT",
        Screening.confidence >= 0.80,
        (Screening.reviewed == False) | (Screening.reviewed == None)
    ).order_by(Screening.created_at.desc()).limit(5).all()

    high_risk_alerts = []
    for s in high_risk_screenings:
        p = s.patient
        high_risk_alerts.append({
            "id": s.id,
            "screening_id": s.screening_id,
            "patient_id": s.patient_id,
            "patient_name": f"{p.first_name} {p.last_name}" if p else "Unknown Patient",
            "patient_access_id": p.patient_access_id if p else "N/A",
            "prediction": s.prediction,
            "confidence": s.confidence,
            "risk_level": s.risk_level or "HIGH",
            "recommendation": s.recommendation,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "reviewed": s.reviewed or False
        })

    # Recent activity strip (last 5 screenings)
    recent_list = db.query(Screening).order_by(Screening.created_at.desc()).limit(5).all()
    recent_activity = []
    for s in recent_list:
        p = s.patient
        recent_activity.append({
            "id": s.id,
            "screening_id": s.screening_id,
            "patient_id": s.patient_id,
            "patient_name": f"{p.first_name} {p.last_name}" if p else "Unknown Patient",
            "patient_access_id": p.patient_access_id if p else "N/A",
            "prediction": s.prediction,
            "confidence": s.confidence,
            "risk_level": s.risk_level or ("HIGH" if s.prediction == "DR PRESENT" and s.confidence >= 0.80 else "MEDIUM" if s.prediction == "DR PRESENT" else "LOW"),
            "created_at": s.created_at.isoformat() if s.created_at else None
        })

    return {
        "stats": {
            "screenings_today": screenings_today,
            "screenings_today_trend": today_trend,
            "total_patients": total_patients,
            "patients_trend": patients_trend,
            "total_screenings": total_screenings,
            "screenings_trend": screenings_trend,
            "dr_cases_count": dr_cases_total,
            "dr_cases_trend": dr_trend
        },
        "volume_chart": volume_chart,
        "risk_distribution": risk_distribution,
        "high_risk_alerts": high_risk_alerts,
        "recent_activity": recent_activity
    }

@router.patch("/{screening_id}/review")
@router.post("/{screening_id}/review")
def mark_screening_reviewed(
    screening_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.HEALTHCARE_WORKER, UserRole.ADMIN]))
):
    query = db.query(Screening)
    if screening_id.isdigit():
        screening = query.filter((Screening.id == int(screening_id)) | (Screening.screening_id == screening_id)).first()
    else:
        screening = query.filter(Screening.screening_id == screening_id).first()
        
    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")
        
    screening.reviewed = True
    db.commit()
    db.refresh(screening)
    return {
        "status": "ok",
        "id": screening.id,
        "screening_id": screening.screening_id,
        "reviewed": True
    }

@router.post("/", response_model=dict)
def screen_image(
    patient_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.HEALTHCARE_WORKER, UserRole.ADMIN]))
):
    # Validate patient
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Must be an image.")

    # Save file temporarily
    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Run inference
        result = inference_service.predict(file_path)
        
        # Grad-CAM quadrant explanation
        heatmap_explanation = result.get("heatmap_explanation", "")
        
        # Combine quadrant explanation with Grok AI clinical context if available
        ai_context_text = heatmap_explanation
        if result.get("ai_context"):
            ai_context_text = f"{heatmap_explanation} {result.get('ai_context')}"
        elif generate_ai_clinical_context:
            grok_ctx = generate_ai_clinical_context(
                prediction=result.get("prediction", "NO DR"),
                confidence=result.get("confidence", 0.0),
                risk_level=result.get("risk_level", "LOW"),
                probability_dr=result.get("probability_dr", 0.0),
                probability_no_dr=result.get("probability_no_dr", 0.0)
            )
            if grok_ctx:
                ai_context_text = f"{heatmap_explanation} {grok_ctx}"
        
        # Save screening record
        screening_id_str = f"MV-{uuid.uuid4().hex[:8].upper()}"
        
        new_screening = Screening(
            screening_id=screening_id_str,
            patient_id=patient.id,
            healthcare_worker_id=current_user.id,
            image_path=file_path,
            heatmap_path=result.get("heatmap_path"),
            prediction=result.get("prediction"),
            probability_dr=result.get("probability_dr"),
            probability_no_dr=result.get("probability_no_dr"),
            confidence=result.get("confidence"),
            risk_level=result.get("risk_level"),
            recommendation=result.get("recommendation"),
            ai_context=ai_context_text
        )
        db.add(new_screening)
        db.commit()
        db.refresh(new_screening)
        
        return {
            "id": new_screening.id,
            "screening_id": new_screening.screening_id,
            "patient_id": patient.id,
            "patient_name": f"{patient.first_name} {patient.last_name}",
            "patient_access_id": patient.patient_access_id,
            "prediction": new_screening.prediction,
            "probability_dr": new_screening.probability_dr,
            "probability_no_dr": new_screening.probability_no_dr,
            "confidence": new_screening.confidence,
            "risk_level": new_screening.risk_level,
            "recommendation": new_screening.recommendation,
            "heatmap_explanation": heatmap_explanation,
            "ai_context": new_screening.ai_context,
            "image_url": path_to_url(new_screening.image_path),
            "heatmap_url": path_to_url(new_screening.heatmap_path),
            "created_at": new_screening.created_at.isoformat() if new_screening.created_at else None
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print("Screening exception:", e)
        raise HTTPException(status_code=500, detail="Inference failed")


@router.get("/recent")
def get_recent_screenings(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.HEALTHCARE_WORKER, UserRole.ADMIN]))
):
    screenings = db.query(Screening).order_by(Screening.created_at.desc()).limit(limit).all()
    results = []
    for s in screenings:
        p = s.patient
        report = s.report
        results.append({
            "id": s.id,
            "screening_id": s.screening_id,
            "patient_id": s.patient_id,
            "patient_name": f"{p.first_name} {p.last_name}" if p else "Unknown Patient",
            "patient_access_id": p.patient_access_id if p else "N/A",
            "prediction": s.prediction,
            "confidence": s.confidence,
            "probability_dr": s.probability_dr,
            "probability_no_dr": s.probability_no_dr,
            "risk_level": s.risk_level,
            "recommendation": s.recommendation,
            "ai_context": s.ai_context,
            "heatmap_explanation": s.ai_context,
            "image_url": path_to_url(s.image_path),
            "heatmap_url": path_to_url(s.heatmap_path),
            "has_report": report is not None,
            "is_published": report.is_published if report else False,
            "created_at": s.created_at.isoformat() if s.created_at else None
        })
    return results


@router.get("/patient/{patient_id}")
def get_patient_screenings(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.HEALTHCARE_WORKER, UserRole.ADMIN]))
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    screenings = db.query(Screening).filter(Screening.patient_id == patient_id).order_by(Screening.created_at.desc()).all()
    results = []
    for s in screenings:
        report = s.report
        results.append({
            "id": s.id,
            "screening_id": s.screening_id,
            "patient_id": s.patient_id,
            "patient_name": f"{patient.first_name} {patient.last_name}",
            "patient_access_id": patient.patient_access_id,
            "prediction": s.prediction,
            "confidence": s.confidence,
            "probability_dr": s.probability_dr,
            "probability_no_dr": s.probability_no_dr,
            "risk_level": s.risk_level,
            "recommendation": s.recommendation,
            "ai_context": s.ai_context,
            "heatmap_explanation": s.ai_context,
            "image_url": path_to_url(s.image_path),
            "heatmap_url": path_to_url(s.heatmap_path),
            "has_report": report is not None,
            "is_published": report.is_published if report else False,
            "created_at": s.created_at.isoformat() if s.created_at else None
        })
    return results



