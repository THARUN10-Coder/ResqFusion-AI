import pytest
from datetime import datetime, timezone
from app.scoring.priority import PriorityEngine
from app.fusion.conflict import ConflictDetector
from app.models import Report, Conflict
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.session import Base

def test_priority_score_range():
    # Critical incident with medical emergency and trapped people
    res = PriorityEngine.calculate_priority(
        severity="critical",
        people_affected=12,
        medical_need="urgent",
        resource_count=3,
        confidence=0.95,
        updated_at=datetime.now(timezone.utc)
    )
    score = res["final_priority"]
    assert 90.0 <= score <= 100.0

def test_priority_score_low():
    # Low severity incident with zero people affected
    res = PriorityEngine.calculate_priority(
        severity="low",
        people_affected=0,
        medical_need="no",
        resource_count=0,
        confidence=0.50,
        updated_at=datetime.now(timezone.utc)
    )
    score = res["final_priority"]
    assert score < 40.0

# Setup memory DB for conflict testing
engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def test_conflict_detection():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    rep1 = Report(
        id="R1",
        source="Source 1",
        source_type="social",
        timestamp=datetime.now(timezone.utc),
        latitude=13.0, longitude=80.0,
        raw_text="Main bridge completely collapsed!",
        disaster_type="Infrastructure",
        incident_id="INC-CONF"
    )
    rep2 = Report(
        id="R2",
        source="Source 2",
        source_type="official",
        timestamp=datetime.now(timezone.utc),
        latitude=13.0, longitude=80.0,
        raw_text="Vehicles are still crossing the main bridge, traffic moving.",
        disaster_type="Infrastructure",
        incident_id="INC-CONF"
    )
    db.add(rep1)
    db.commit()

    conflict = ConflictDetector.check_for_conflicts(db, "INC-CONF", rep2)
    assert conflict is not None
    assert "Bridge" in conflict.claim_a or "bridge" in conflict.claim_a.lower()
    assert conflict.resolution_status == "Unverified"
    
    db.close()
