from app.database.session import SessionLocal, engine
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.auth.security import get_password_hash
import app.models


# ─── Credentials ───────────────────────────────────────────
ADMIN_USERNAME  = "medvision.admin"
ADMIN_PASSWORD  = "Adm!nV1s10n#2026"

DOCTOR_USERNAME = "dr.screening"
DOCTOR_PASSWORD = "D0ct0r@Scan#2026"
# ────────────────────────────────────────────────────────────

def init_db():
    db = SessionLocal()

    # Admin — force update if already exists
    admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if admin:
        admin.username = ADMIN_USERNAME
        admin.hashed_password = get_password_hash(ADMIN_PASSWORD)
        db.commit()
        print(f"Admin updated  -> username: {ADMIN_USERNAME}")
    else:
        admin = User(
            username=ADMIN_USERNAME,
            hashed_password=get_password_hash(ADMIN_PASSWORD),
            role=UserRole.ADMIN
        )
        db.add(admin)
        db.commit()
        print(f"Admin created  -> username: {ADMIN_USERNAME}")

    # Healthcare Worker (Doctor) -- force update if already exists
    hw = db.query(User).filter(User.role == UserRole.HEALTHCARE_WORKER).first()
    if hw:
        hw.username = DOCTOR_USERNAME
        hw.hashed_password = get_password_hash(DOCTOR_PASSWORD)
        db.commit()
        print(f"Doctor updated -> username: {DOCTOR_USERNAME}")
    else:
        hw = User(
            username=DOCTOR_USERNAME,
            hashed_password=get_password_hash(DOCTOR_PASSWORD),
            role=UserRole.HEALTHCARE_WORKER
        )
        db.add(hw)
        db.commit()
        print(f"Doctor created -> username: {DOCTOR_USERNAME}")

    # Seed Sample Patient
    PATIENT_USERNAME = "patient@medvisionai.com"
    PATIENT_PASSWORD = "Patient@Pass#2026"
    patient_user = db.query(User).filter(User.role == UserRole.PATIENT).first()
    if patient_user:
        patient_user.username = PATIENT_USERNAME
        patient_user.hashed_password = get_password_hash(PATIENT_PASSWORD)
        patient_user.is_activated = True
        db.commit()
        print(f"Patient updated -> username: {PATIENT_USERNAME}")
    else:
        patient_user = User(
            username=PATIENT_USERNAME,
            hashed_password=get_password_hash(PATIENT_PASSWORD),
            role=UserRole.PATIENT,
            is_activated=True
        )
        db.add(patient_user)
        db.commit()

        from datetime import date
        sample_patient = Patient(
            user_id=patient_user.id,
            patient_access_id="MV-PAT-1001",
            first_name="John",
            last_name="Doe",
            date_of_birth=date(1985, 6, 15),
            email=PATIENT_USERNAME,
            diabetes_type="Type 2",
            year_of_diagnosis=2018
        )
        db.add(sample_patient)
        db.commit()
        print(f"Patient created -> username: {PATIENT_USERNAME}")


    db.close()
    print("\n=== SAVE THESE CREDENTIALS (do not share publicly) ===")
    print(f"  Admin   -> {ADMIN_USERNAME}  /  {ADMIN_PASSWORD}")
    print(f"  Doctor  -> {DOCTOR_USERNAME}  /  {DOCTOR_PASSWORD}")
    print(f"  Patient -> {PATIENT_USERNAME} / {PATIENT_PASSWORD}")
    print("=======================================================")


if __name__ == "__main__":
    app.models.Base.metadata.create_all(bind=engine)
    init_db()

