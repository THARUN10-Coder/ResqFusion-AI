from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.schemas.report import ReportResponse

class SignalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    external_id: str
    source: str
    source_type: str
    event_type: str
    title: str
    description: str
    timestamp: datetime
    latitude: float
    longitude: float
    severity: str
    urgency: Optional[str] = None
    certainty: Optional[str] = None
    confidence: float
    people_affected: Optional[int] = None
    medical_need: Optional[bool] = None
    resource_requirements: List[str] = []
    is_near_real_time: bool = False
    is_demo: bool = False
    incident_id: Optional[str] = None
    metadata_json: Dict[str, Any] = {}

class ConflictResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    incident_id: str
    report_a_id: str
    report_b_id: str
    claim_a: str
    claim_b: str
    conflict_type: str
    detected_at: datetime
    resolution_status: str

class IncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    disaster_type: str
    location_name: str
    latitude: float
    longitude: float
    severity: str
    priority: float
    confidence: float
    people_affected: int
    medical_need: str
    status: str
    assigned_team: Optional[str] = None
    required_resources: List[Dict[str, Any]] = []
    source_count: int
    xai_explanation: Optional[str] = None
    xai_breakdown: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

class IncidentDetailResponse(IncidentResponse):
    reports: List[ReportResponse] = []
    signals: List[SignalResponse] = []
    conflicts: List[ConflictResponse] = []

class IncidentStatusUpdate(BaseModel):
    status: str
    assigned_team: Optional[str] = None
    note: Optional[str] = None

class WeightConfigUpdate(BaseModel):
    WEIGHT_SEVERITY: float
    WEIGHT_PEOPLE_AFFECTED: float
    WEIGHT_MEDICAL_EMERGENCY: float
    WEIGHT_RESOURCE_CRITICALITY: float
    WEIGHT_CONFIDENCE: float
    WEIGHT_RECENCY: float
