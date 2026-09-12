from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime
from app.database.session import Base
import enum

class UserRole(str, enum.Enum):
    PATIENT = "PATIENT"
    HEALTHCARE_WORKER = "HEALTHCARE_WORKER"
    SPECIALIST = "SPECIALIST"
    ADMIN = "ADMIN"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=True)  # NULL until patient sets password
    role = Column(Enum(UserRole), default=UserRole.PATIENT)
    is_active = Column(Boolean, default=True)
    is_activated = Column(Boolean, default=False)
    require_password_change = Column(Boolean, default=False)
    reset_token = Column(String, unique=True, nullable=True, index=True)
    reset_token_expires = Column(DateTime, nullable=True)

