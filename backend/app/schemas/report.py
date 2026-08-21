from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class ReportCreate(BaseModel):
    source: str = Field(default="Citizen App", description="Source description")
    source_type: str = Field(default="unverified_citizen", description="official, agency, verified_citizen, unverified_citizen, social")
    latitude: float
    longitude: float
    raw_text: str
    disaster_type: str = Field(default="Flood")
    severity: Optional[str] = "medium"
    people_affected: Optional[int] = 0
    medical_need: Optional[bool] = False
    resource_requirements: Optional[List[str]] = []
    image_url: Optional[str] = None

class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source: str
    source_type: str
    timestamp: datetime
    latitude: float
    longitude: float
    raw_text: str
    disaster_type: str
    severity: str
    people_affected: int
    medical_need: bool
    resource_requirements: List[str]
    image_url: Optional[str] = None
    extracted_entities: Dict[str, Any] = {}
    confidence: float
    incident_id: Optional[str] = None

class ImageAnalysisResponse(BaseModel):
    disaster_type: str
    severity: str
    objects_detected: List[str]
    damaged_structures: List[str]
    road_blockage: bool
    trapped_people_est: int
    confidence: float
    ai_mode: str
