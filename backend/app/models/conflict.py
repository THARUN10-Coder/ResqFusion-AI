from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime, timezone
from app.db.session import Base

class Conflict(Base):
    __tablename__ = "conflicts"

    id = Column(String, primary_key=True, index=True)
    incident_id = Column(String, nullable=False, index=True)
    report_a_id = Column(String, nullable=False)
    report_b_id = Column(String, nullable=False)
    claim_a = Column(Text, nullable=False)
    claim_b = Column(Text, nullable=False)
    conflict_type = Column(String, nullable=False)  # "Passability", "Casualties", "Damage", "Status"
    detected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resolution_status = Column(String, default="Unverified") # "Unverified", "Resolved", "Flagged"
