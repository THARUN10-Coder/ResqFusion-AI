from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
import uuid

from app.db.session import get_db
from app.models.report import Report
from app.models.incident import Incident
from app.models.conflict import Conflict
from app.schemas.report import ReportCreate, ReportResponse, ImageAnalysisResponse
from app.ai.provider import get_ai_provider
from app.fusion.engine import FusionEngine
from app.fusion.conflict import ConflictDetector
from app.fusion.reliability import ReliabilityEngine
from app.scoring.priority import PriorityEngine
from app.scoring.xai import XAIEngine
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.post("", response_model=ReportResponse)
async def submit_report(report_in: ReportCreate, db: Session = Depends(get_db)):
    ai_provider = get_ai_provider()
    extracted = ai_provider.extract_entities(report_in.raw_text)

    source_type = report_in.source_type
    confidence = ReliabilityEngine.get_source_weight(source_type)

    report = Report(
        id=f"REP-{uuid.uuid4().hex[:6].upper()}",
        source=report_in.source,
        source_type=source_type,
        timestamp=datetime.now(timezone.utc),
        latitude=report_in.latitude,
        longitude=report_in.longitude,
        raw_text=report_in.raw_text,
        disaster_type=extracted.get("disaster_type", report_in.disaster_type),
        severity=extracted.get("severity", report_in.severity or "medium"),
        people_affected=max(report_in.people_affected or 0, extracted.get("people_affected", 0)),
        medical_need=report_in.medical_need or extracted.get("medical_need", False),
        resource_requirements=report_in.resource_requirements or extracted.get("resource_requirements", []),
        image_url=report_in.image_url,
        extracted_entities=extracted,
        confidence=confidence
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    # Fusion & Deduplication
    incident, is_merged, match_conf, breakdown = FusionEngine.process_incoming_report(db, report)

    # Also record into SourceSignal for unified lineage and incident signals
    from app.models.signal import SourceSignal, IncidentSignal
    sig_id = f"SIG-{report.id}"
    db_signal = SourceSignal(
        id=sig_id,
        external_id=report.id,
        source="RESQFUSION_CITIZEN",
        source_type="citizen_report",
        event_type=report.disaster_type,
        title=f"Citizen Report: {report.raw_text[:60]}",
        description=report.raw_text,
        timestamp=report.timestamp,
        latitude=report.latitude,
        longitude=report.longitude,
        severity=report.severity,
        confidence=report.confidence,
        people_affected=report.people_affected,
        medical_need=report.medical_need,
        resource_requirements=report.resource_requirements,
        incident_id=incident.id,
        raw_data={"extracted": extracted, "source": report.source}
    )
    db.add(db_signal)
    
    inc_sig = IncidentSignal(
        id=f"IS-{uuid.uuid4().hex[:8].upper()}",
        incident_id=incident.id,
        signal_id=sig_id,
        match_score=match_conf / 100.0 if match_conf else 1.0,
        relationship_type="duplicate" if is_merged else "primary"
    )
    db.add(inc_sig)
    db.commit()

    # Conflict Check
    conflict = ConflictDetector.check_for_conflicts(db, incident.id, report)

    # Reliability & Confidence update
    incident_reports = db.query(Report).filter(Report.incident_id == incident.id).all()
    incident_conflicts = db.query(Conflict).filter(Conflict.incident_id == incident.id).all()
    
    incident.confidence = ReliabilityEngine.calculate_incident_confidence(incident_reports, incident_conflicts)

    # Priority update
    old_priority = incident.priority
    priority_info = PriorityEngine.calculate_priority(
        severity=incident.severity,
        people_affected=incident.people_affected,
        medical_need=incident.medical_need,
        resource_count=len(incident.required_resources or []),
        confidence=incident.confidence,
        updated_at=incident.updated_at
    )
    incident.priority = priority_info["final_priority"]

    # XAI update
    all_incidents = db.query(Incident).filter(Incident.status != "Resolved").order_by(Incident.priority.desc()).all()
    rank = next((idx + 1 for idx, inc in enumerate(all_incidents) if inc.id == incident.id), 1)
    xai_info = XAIEngine.generate_explanation(incident, incident_reports, incident_conflicts, rank=rank, priority_breakdown=priority_info)
    incident.xai_explanation = xai_info["narrative_explanation"]
    incident.xai_breakdown = xai_info

    db.commit()
    db.refresh(report)

    # Broadcast real-time events
    await ws_manager.broadcast({
        "type": "REPORT_RECEIVED",
        "report_id": report.id,
        "source": report.source,
        "text": report.raw_text,
        "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S")
    })

    if is_merged:
        await ws_manager.broadcast({
            "type": "INCIDENT_FUSED",
            "incident_id": incident.id,
            "report_id": report.id,
            "match_confidence": match_conf,
            "breakdown": breakdown,
            "message": f"Report {report.id} fused with {incident.id} ({match_conf}% confidence)",
            "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S")
        })

    if conflict:
        await ws_manager.broadcast({
            "type": "CONFLICT_DETECTED",
            "incident_id": incident.id,
            "conflict_id": conflict.id,
            "message": f"⚠ CONFLICT DETECTED on Incident {incident.id}",
            "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S")
        })

    return report

@router.get("", response_model=List[ReportResponse])
def get_reports(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Report).order_by(Report.timestamp.desc()).offset(skip).limit(limit).all()

@router.get("/{report_id}", response_model=ReportResponse)
def get_report(report_id: str, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@router.post("/analyze-image", response_model=ImageAnalysisResponse)
async def analyze_image_file(file: UploadFile = File(...)):
    ai_provider = get_ai_provider()
    content = await file.read()
    analysis = ai_provider.analyze_image(content, filename=file.filename or "")
    return ImageAnalysisResponse(**analysis)
