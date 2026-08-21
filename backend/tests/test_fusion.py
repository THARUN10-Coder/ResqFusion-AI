import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone
import uuid

from app.db.session import Base
from app.models import Report, Incident
from app.fusion.engine import FusionEngine, haversine_distance_km, calculate_text_similarity

# Setup in-memory test database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_haversine_distance():
    # Distance between two nearby Chennai coordinates (~0.5 km)
    dist = haversine_distance_km(13.0827, 80.2707, 13.0831, 80.2712)
    assert 0.0 < dist < 1.0

def test_text_similarity():
    sim = calculate_text_similarity("People trapped inside XYZ School building", "8 students stuck inside XYZ School")
    assert sim > 0.3

def test_report_fusion(db):
    # Create initial incident
    inc = Incident(
        id="INC-TEST01",
        title="Flood: Trapped at XYZ School",
        disaster_type="Flood",
        location_name="XYZ School",
        latitude=13.0827,
        longitude=80.2707,
        severity="high",
        priority=75.0,
        confidence=0.8,
        people_affected=5,
        medical_need="no",
        status="New",
        source_count=1,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(inc)
    db.commit()

    # Incoming report nearby with matching text
    report = Report(
        id="REP-TEST01",
        source="Citizen #999",
        source_type="unverified_citizen",
        timestamp=datetime.now(timezone.utc),
        latitude=13.0829,
        longitude=80.2709,
        raw_text="8 students trapped inside XYZ School flood!",
        disaster_type="Flood",
        severity="critical",
        people_affected=8,
        medical_need=True,
        resource_requirements=["Rescue Boat"],
        confidence=0.65
    )
    db.add(report)
    db.commit()

    # Process fusion
    fused_inc, is_merged, match_conf, breakdown = FusionEngine.process_incoming_report(db, report)
    
    assert is_merged is True
    assert fused_inc.id == "INC-TEST01"
    assert fused_inc.source_count == 2
    assert fused_inc.people_affected == 8
    assert fused_inc.medical_need == "urgent"
