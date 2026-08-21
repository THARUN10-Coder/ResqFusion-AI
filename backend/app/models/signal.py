from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, Boolean, UniqueConstraint
from datetime import datetime, timezone
from app.db.session import Base

class SourceSignal(Base):
    __tablename__ = "source_signals"

    id = Column(String, primary_key=True, index=True) # e.g. "SIG-USGS-US7000M123"
    external_id = Column(String, nullable=False, index=True)
    source = Column(String, nullable=False, index=True)       # "SACHET", "GDACS", "NASA_FIRMS", "USGS", "RESQFUSION_CITIZEN"
    source_type = Column(String, nullable=False, index=True)  # "official_india_alert", "official_global", "satellite_fire", "earthquake", "citizen_report"
    event_type = Column(String, nullable=False, index=True)   # "Flood", "Cyclone", "Earthquake", "Fire", etc.
    
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    
    severity = Column(String, default="medium")
    urgency = Column(String, nullable=True)
    certainty = Column(String, nullable=True)
    confidence = Column(Float, default=0.8)
    
    people_affected = Column(Integer, nullable=True)
    medical_need = Column(Boolean, nullable=True)
    resource_requirements = Column(JSON, default=list)
    
    is_near_real_time = Column(Boolean, default=False)
    is_demo = Column(Boolean, default=False)
    
    # Associated incident linkage
    incident_id = Column(String, nullable=True, index=True)
    
    raw_data = Column(JSON, default=dict)
    metadata_json = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint('source', 'external_id', name='uq_source_external_id'),
    )


class IncidentSignal(Base):
    """
    Explicit junction recording how raw signals link to unified incidents,
    recording match confidence, relationship type, and audit trail.
    """
    __tablename__ = "incident_signals"

    id = Column(String, primary_key=True, index=True)
    incident_id = Column(String, nullable=False, index=True)
    signal_id = Column(String, nullable=False, index=True)
    match_score = Column(Float, default=1.0)
    relationship_type = Column(String, default="supporting_evidence") # "primary", "supporting_evidence", "duplicate", "conflicting", "related"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
