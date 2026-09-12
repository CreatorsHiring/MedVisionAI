from datetime import timedelta, datetime
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from app.core.config import settings
from app.database.session import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.schemas.user import Token, UserCreate, UserResponse
from app.auth.security import verify_password, get_password_hash, create_access_token
from app.auth.deps import get_current_user

router = APIRouter()

class SetPasswordRequest(BaseModel):
    token: str
    new_password: str

class VerifyPatientRequest(BaseModel):
    email: str
    date_of_birth: str  # YYYY-MM-DD

class SetPatientPasswordRequest(BaseModel):
    email: str
    date_of_birth: str  # YYYY-MM-DD
    new_password: str

@router.post("/login", response_model=Token)
def login_access_token(
    response: Response,
    db: Session = Depends(get_db), 
    form_data: OAuth2PasswordRequestForm = Depends()
):
    username_clean = form_data.username.lower().strip()
    user = db.query(User).filter(func.lower(User.username) == username_clean).first()
    
    # Check if account exists but password not yet set
    if user and user.hashed_password is None:
        if user.role == UserRole.PATIENT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ACCOUNT_PENDING_ACTIVATION",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account not activated. Please contact your administrator.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    
    # Set HTTP-only secure cookie for authentication
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
def logout(response: Response):
    """Clear HTTP-only access_token authentication cookie."""
    response.delete_cookie(key="access_token", path="/")
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/verify-patient")
def verify_patient(data: VerifyPatientRequest, db: Session = Depends(get_db)):
    """Verify patient email and Date of Birth match clinical records."""
    email_clean = data.email.lower().strip()
    patient = db.query(Patient).filter(func.lower(Patient.email) == email_clean).first()
    
    if not patient or not patient.date_of_birth or str(patient.date_of_birth) != data.date_of_birth.strip():
        raise HTTPException(
            status_code=400,
            detail="We couldn't verify your details — please check with your healthcare provider."
        )

    return {
        "verified": True,
        "email": patient.email,
        "patient_access_id": patient.patient_access_id,
        "name": f"{patient.first_name} {patient.last_name}",
    }


@router.post("/set-patient-password")
def set_patient_password(
    data: SetPatientPasswordRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """Confirm identity with DOB, set password, and log patient into their portal."""
    email_clean = data.email.lower().strip()
    patient = db.query(Patient).filter(func.lower(Patient.email) == email_clean).first()

    if not patient or not patient.date_of_birth or str(patient.date_of_birth) != data.date_of_birth.strip():
        raise HTTPException(
            status_code=400,
            detail="We couldn't verify your details — please check with your healthcare provider."
        )

    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    user = patient.user
    if not user:
        user = db.query(User).filter(func.lower(User.username) == email_clean).first()
        if not user:
            raise HTTPException(
                status_code=400, 
                detail="We couldn't verify your details — please check with your healthcare provider."
            )

    user.hashed_password = get_password_hash(data.new_password)
    user.is_activated = True
    user.is_active = True
    user.require_password_change = False
    db.commit()

    # Automatically issue access token & cookie to log in
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "message": "Password set successfully. You are now logged in."
    }


@router.post("/set-password")
def set_password(data: SetPasswordRequest, db: Session = Depends(get_db)):
    """Legacy token-based password setting fallback."""
    user = db.query(User).filter(User.reset_token == data.token).first()

    if not user:
        raise HTTPException(
            status_code=400, 
            detail="This link has already been used to activate your account or is invalid. If you already set your password, please log in."
        )

    if user.reset_token_expires and datetime.utcnow() > user.reset_token_expires:
        raise HTTPException(
            status_code=400, 
            detail="This activation link has expired (48-hour limit). Please contact your clinic to request a new link."
        )

    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    user.hashed_password = get_password_hash(data.new_password)
    user.is_activated = True
    user.reset_token = None
    user.reset_token_expires = None
    user.require_password_change = False
    db.commit()

    return {"message": "Password set successfully. You can now log in to the patient portal."}


@router.get("/verify-token/{token}")
def verify_reset_token(token: str, db: Session = Depends(get_db)):
    """Legacy token verification."""
    user = db.query(User).filter(User.reset_token == token).first()
    if not user:
        raise HTTPException(
            status_code=400, 
            detail="This activation link has already been used or is invalid."
        )
    if user.reset_token_expires and datetime.utcnow() > user.reset_token_expires:
        raise HTTPException(
            status_code=400, 
            detail="This activation link has expired (48-hour limit)."
        )
    return {"valid": True, "username": user.username}


