from fastapi import APIRouter
from typing import List, Dict, Any
from app.ingestion.service import IngestionService

router = APIRouter(prefix="/data-sources", tags=["Data Sources"])

@router.get("", response_model=List[Dict[str, Any]])
def get_data_sources_status():
    """
    Returns real-time operational status, connection health, and ingestion telemetry
    for all external disaster data feeds (SACHET, GDACS, NASA FIRMS, USGS).
    """
    ingestion_service = IngestionService.get_instance()
    return ingestion_service.get_connectors_status()
