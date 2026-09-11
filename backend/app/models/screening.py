from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.session import Base

class Screening(Base):
    __tablename__ = "screenings"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(String, unique=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    healthcare_worker_id = Column(Integer, ForeignKey("users.id"))
    
    image_path = Column(String)
    heatmap_path = Column(String, nullable=True)
    
    prediction = Column(String)
    probability_dr = Column(Float)
    probability_no_dr = Column(Float)
    confidence = Column(Float)
    risk_level = Column(String)
    recommendation = Column(Text)
    ai_context = Column(Text, nullable=True)
    reviewed = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("Patient", back_populates="screenings")
    healthcare_worker = relationship("User", foreign_keys=[healthcare_worker_id])
    report = relationship("Report", back_populates="screening", uselist=False)
