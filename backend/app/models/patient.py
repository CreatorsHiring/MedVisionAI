from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    patient_access_id = Column(String, unique=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    date_of_birth = Column(Date, nullable=True)
    diabetes_type = Column(String, nullable=True)
    year_of_diagnosis = Column(Integer, nullable=True)
    existing_eye_conditions = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)

    user = relationship("User", backref="patient_profile")
    screenings = relationship("Screening", back_populates="patient")
