from sqlalchemy import Column, String, Integer, DateTime
from datetime import datetime, timezone
from app.db.session import Base

class ResourceAllocation(Base):
    __tablename__ = "resource_allocations"

    id = Column(String, primary_key=True, index=True)
    incident_id = Column(String, nullable=False, index=True)
    resource_type = Column(String, nullable=False) # e.g. "Ambulance", "Rescue Boat", "Medical Kit", "Water Units"
    quantity_required = Column(Integer, default=1)
    quantity_dispatched = Column(Integer, default=0)
    status = Column(String, default="Pending") # "Pending", "Dispatched", "Fulfilled"
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    role = Column(String, default="responder") # "admin", "responder", "citizen"
    full_name = Column(String, nullable=True)
