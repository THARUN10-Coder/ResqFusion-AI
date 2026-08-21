from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON
from datetime import datetime, timezone
from app.db.session import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, index=True)
    source = Column(String, nullable=False)            # e.g., "Citizen #1024", "SACHET Alert", "NDTV News Feed"
    source_type = Column(String, nullable=False)       # "official", "agency", "verified_citizen", "unverified_citizen", "social"
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    raw_text = Column(Text, nullable=False)
    disaster_type = Column(String, nullable=False)      # "Flood", "Cyclone", "Earthquake", "Fire", "Infrastructure", "Medical"
    severity = Column(String, default="medium")        # "critical", "high", "medium", "low"
    people_affected = Column(Integer, default=0)
    medical_need = Column(Boolean, default=False)
    resource_requirements = Column(JSON, default=list)  # List of strings e.g. ["Ambulance", "Rescue Team"]
    image_url = Column(String, nullable=True)
    extracted_entities = Column(JSON, default=dict)     # Structured AI extracted metadata
    confidence = Column(Float, default=0.7)            # 0.0 - 1.0 confidence score
    incident_id = Column(String, nullable=True, index=True)  # Fused Incident linkage
