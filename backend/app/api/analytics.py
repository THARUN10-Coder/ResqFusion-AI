from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List

from app.db.session import get_db
from app.models.incident import Incident
from app.models.report import Report
from app.models.conflict import Conflict
from app.services.resource_engine import ResourceEngine

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("")
def get_analytics(db: Session = Depends(get_db)) -> Dict[str, Any]:
    active_incidents = db.query(Incident).filter(Incident.status != "Resolved").all()
    critical_count = len([i for i in active_incidents if i.severity == "critical"])
    
    total_people_affected = sum(i.people_affected for i in active_incidents)
    unverified_reports = db.query(Report).filter(Report.incident_id == None).count()
    
    avg_confidence = 0.0
    if active_incidents:
        avg_confidence = round(sum(i.confidence for i in active_incidents) / len(active_incidents) * 100, 1)

    # Disaster type breakdown
    type_counts = {}
    severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    status_counts = {"New": 0, "Verified": 0, "Assigned": 0, "In Progress": 0, "Resolved": 0}

    all_incidents = db.query(Incident).all()
    for inc in all_incidents:
        type_counts[inc.disaster_type] = type_counts.get(inc.disaster_type, 0) + 1
        severity_counts[inc.severity] = severity_counts.get(inc.severity, 0) + 1
        status_counts[inc.status] = status_counts.get(inc.status, 0) + 1

    # Source breakdown
    sources = db.query(Report.source_type, func.count(Report.id)).group_by(Report.source_type).all()
    source_distribution = [{"source_type": s[0], "count": s[1]} for s in sources]

    # Resource requirements breakdown
    resource_demands = ResourceEngine.aggregate_resource_demands(db)

    # Priority distribution timeline / buckets
    priority_buckets = {
        "Critical (90-100)": len([i for i in active_incidents if i.priority >= 90]),
        "High (70-89)": len([i for i in active_incidents if 70 <= i.priority < 90]),
        "Medium (40-69)": len([i for i in active_incidents if 40 <= i.priority < 70]),
        "Low (0-39)": len([i for i in active_incidents if i.priority < 40]),
    }

    return {
        "summary": {
            "active_incidents": len(active_incidents),
            "critical_incidents": critical_count,
            "people_affected": total_people_affected,
            "unverified_reports": unverified_reports,
            "average_confidence": avg_confidence,
            "unresolved_conflicts": db.query(Conflict).filter(Conflict.resolution_status == "Unverified").count()
        },
        "disaster_type_distribution": [{"type": k, "count": v} for k, v in type_counts.items()],
        "severity_distribution": [{"severity": k.capitalize(), "count": v} for k, v in severity_counts.items()],
        "status_distribution": [{"status": k, "count": v} for k, v in status_counts.items()],
        "source_distribution": source_distribution,
        "resource_demands": resource_demands["summary_list"],
        "priority_distribution": [{"range": k, "count": v} for k, v in priority_buckets.items()]
    }
