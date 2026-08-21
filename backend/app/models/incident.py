from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON
from datetime import datetime, timezone
from app.db.session import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, index=True) # e.g. "INC-024"
    title = Column(String, nullable=False)
    disaster_type = Column(String, nullable=False)
    location_name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    severity = Column(String, default="high")          # "critical", "high", "medium", "low"
    priority = Column(Float, default=50.0)             # Rescue Priority Score 0 - 100
    confidence = Column(Float, default=0.7)           # Reliability score 0.0 - 1.0
    people_affected = Column(Integer, default=0)
    medical_need = Column(String, default="no")        # "urgent", "yes", "no"
    status = Column(String, default="New")             # "New", "Verified", "Assigned", "In Progress", "Resolved"
    assigned_team = Column(String, nullable=True)      # e.g., "NDRF Team 4"
    required_resources = Column(JSON, default=list)    # [{type: "Ambulance", count: 2, status: "pending"}]
    source_count = Column(Integer, default=1)
    
    # Explainable AI summary
    xai_explanation = Column(Text, nullable=True)
    xai_breakdown = Column(JSON, default=dict)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
