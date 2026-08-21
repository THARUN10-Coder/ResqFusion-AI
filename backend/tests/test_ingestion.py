import pytest
import asyncio
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.session import Base
from app.models.signal import SourceSignal, IncidentSignal
from app.models.incident import Incident
from app.schemas.signal import UnifiedSignal
from app.ingestion.service import IngestionService

engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.mark.asyncio
async def test_signal_ingestion_and_incident_creation():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    ingestion = IngestionService.get_instance()

    now = datetime.now(timezone.utc)
    sig1 = UnifiedSignal(
        external_id="TEST-USGS-001",
        source="USGS",
        source_type="earthquake",
        event_type="Earthquake",
        title="M 5.6 - Nilgiris Region",
        description="Earthquake causing tremors on Nilgiris ghat highway",
        timestamp=now,
        latitude=11.3400,
        longitude=76.7900,
        severity="high",
        confidence=0.95
    )

    incident = await ingestion.process_single_signal(db, sig1)
    assert incident is not None
    assert incident.disaster_type == "Earthquake"
    assert incident.latitude == 11.3400

    # Test deduplication: Same signal submitted again must return None
    duplicate = await ingestion.process_single_signal(db, sig1)
    assert duplicate is None

    # Test fusion: Corroborating signal within 1km merges into the same incident
    sig2 = UnifiedSignal(
        external_id="TEST-SACHET-002",
        source="SACHET",
        source_type="official_india_alert",
        event_type="Earthquake",
        title="NDMA Alert: Nilgiris Tremor Advisory",
        description="Earthquake rockslide advisory on Nilgiris road",
        timestamp=now,
        latitude=11.3410,
        longitude=76.7905,
        severity="high",
        confidence=0.96
    )

    fused_incident = await ingestion.process_single_signal(db, sig2)
    assert fused_incident is not None
    assert fused_incident.id == incident.id
    assert fused_incident.source_count >= 2

    db.close()
