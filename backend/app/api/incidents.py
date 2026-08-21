from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime, timezone

from app.db.session import get_db
from app.models.incident import Incident
from app.models.report import Report
from app.models.conflict import Conflict
from app.models.signal import SourceSignal
from app.schemas.incident import IncidentResponse, IncidentDetailResponse, ConflictResponse, IncidentStatusUpdate, SignalResponse
from app.schemas.report import ReportResponse
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/incidents", tags=["Incidents"])

@router.get("", response_model=List[IncidentResponse])
def list_incidents(status: str = None, disaster_type: str = None, db: Session = Depends(get_db)):
    query = db.query(Incident)
    if status:
        query = query.filter(Incident.status == status)
    if disaster_type:
        query = query.filter(Incident.disaster_type == disaster_type)
    return query.order_by(Incident.priority.desc()).all()

@router.get("/{incident_id}", response_model=IncidentDetailResponse)
def get_incident_detail(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    reports = db.query(Report).filter(Report.incident_id == incident_id).order_by(Report.timestamp.desc()).all()
    signals = db.query(SourceSignal).filter(SourceSignal.incident_id == incident_id).order_by(SourceSignal.timestamp.desc()).all()
    conflicts = db.query(Conflict).filter(Conflict.incident_id == incident_id).all()

    return IncidentDetailResponse(
        **incident.__dict__,
        reports=[ReportResponse.model_validate(r) for r in reports],
        signals=[SignalResponse.model_validate(s) for s in signals],
        conflicts=[ConflictResponse.model_validate(c) for c in conflicts]
    )

@router.get("/{incident_id}/evidence", response_model=List[Dict[str, Any]])
def get_incident_evidence(incident_id: str, db: Session = Depends(get_db)):
    reports = db.query(Report).filter(Report.incident_id == incident_id).order_by(Report.timestamp.desc()).all()
    signals = db.query(SourceSignal).filter(SourceSignal.incident_id == incident_id).order_by(SourceSignal.timestamp.desc()).all()
    
    evidence_list = []
    for r in reports:
        evidence_list.append({
            "type": "citizen_report",
            "id": r.id,
            "source": r.source,
            "source_type": r.source_type,
            "text": r.raw_text,
            "timestamp": r.timestamp.isoformat(),
            "image_url": r.image_url,
            "confidence": r.confidence
        })
    for s in signals:
        evidence_list.append({
            "type": "external_signal",
            "id": s.id,
            "source": s.source,
            "source_type": s.source_type,
            "text": s.description,
            "timestamp": s.timestamp.isoformat(),
            "is_near_real_time": s.is_near_real_time,
            "is_demo": s.is_demo,
            "confidence": s.confidence,
            "metadata": s.metadata_json
        })
    return evidence_list

@router.get("/{incident_id}/conflicts", response_model=List[ConflictResponse])
def get_incident_conflicts(incident_id: str, db: Session = Depends(get_db)):
    return db.query(Conflict).filter(Conflict.incident_id == incident_id).all()

@router.post("/{incident_id}/verify", response_model=IncidentResponse)
async def verify_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident.status = "Verified"
    incident.confidence = min(0.98, incident.confidence + 0.15)
    incident.updated_at = datetime.now(timezone.utc)
    
    # Resolve related conflicts if any
    conflicts = db.query(Conflict).filter(Conflict.incident_id == incident_id).all()
    for c in conflicts:
        c.resolution_status = "Resolved"

    db.commit()
    db.refresh(incident)

    await ws_manager.broadcast({
        "type": "INCIDENT_UPDATED",
        "incident_id": incident.id,
        "status": incident.status,
        "message": f"Incident {incident.id} verified by responder",
        "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S")
    })

    return incident

@router.post("/{incident_id}/assign", response_model=IncidentResponse)
async def assign_response_team(incident_id: str, update: IncidentStatusUpdate, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident.status = "Assigned"
    if update.assigned_team:
        incident.assigned_team = update.assigned_team
    incident.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(incident)

    await ws_manager.broadcast({
        "type": "INCIDENT_UPDATED",
        "incident_id": incident.id,
        "status": incident.status,
        "assigned_team": incident.assigned_team,
        "message": f"Incident {incident.id} assigned to {incident.assigned_team}",
        "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S")
    })

    return incident

@router.post("/{incident_id}/resolve", response_model=IncidentResponse)
async def resolve_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident.status = "Resolved"
    incident.priority = 0.0
    incident.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(incident)

    await ws_manager.broadcast({
        "type": "INCIDENT_UPDATED",
        "incident_id": incident.id,
        "status": incident.status,
        "message": f"Incident {incident.id} marked as RESOLVED",
        "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S")
    })

    return incident
