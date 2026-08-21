import math
from datetime import datetime, timezone
from typing import Tuple, List, Optional
from sqlalchemy.orm import Session
from app.models.report import Report
from app.models.incident import Incident
import uuid

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the Great Circle distance between two coordinates in kilometers."""
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * (math.sin(dlon / 2.0) ** 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def calculate_text_similarity(text1: str, text2: str) -> float:
    """Calculates word-overlap Jaccard similarity between two texts."""
    words1 = set(w.lower() for w in text1.split() if len(w) > 2)
    words2 = set(w.lower() for w in text2.split() if len(w) > 2)
    if not words1 or not words2:
        return 0.5
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    return len(intersection) / len(union)

class FusionEngine:
    @staticmethod
    def calculate_match_score(report: Report, incident: Incident) -> Tuple[float, dict]:
        """
        Calculates multi-dimensional incident matching score.
        Returns total score (0.0 - 1.0) and breakdown components.
        """
        # 1. Spatial Similarity
        dist_km = haversine_distance_km(report.latitude, report.longitude, incident.latitude, incident.longitude)
        if dist_km <= 0.3:
            spatial_score = 1.0
        elif dist_km <= 1.0:
            spatial_score = 0.85
        elif dist_km <= 2.5:
            spatial_score = 0.60
        else:
            spatial_score = max(0.0, 1.0 - (dist_km / 5.0))

        # 2. Disaster Type Similarity
        if report.disaster_type.lower() == incident.disaster_type.lower():
            type_score = 1.0
        else:
            type_score = 0.3

        # 3. Time Proximity
        report_time = report.timestamp
        incident_time = incident.updated_at or incident.created_at
        if report_time.tzinfo is None:
            report_time = report_time.replace(tzinfo=timezone.utc)
        if incident_time.tzinfo is None:
            incident_time = incident_time.replace(tzinfo=timezone.utc)

        time_diff_minutes = abs((report_time - incident_time).total_seconds()) / 60.0
        if time_diff_minutes <= 30:
            time_score = 1.0
        elif time_diff_minutes <= 120:
            time_score = 0.8
        elif time_diff_minutes <= 360:
            time_score = 0.5
        else:
            time_score = 0.2

        # 4. Text / Semantic Similarity
        text_score = calculate_text_similarity(report.raw_text, incident.title)

        # Weighted combination
        total_score = (0.40 * spatial_score) + (0.30 * text_score) + (0.15 * type_score) + (0.15 * time_score)
        
        breakdown = {
            "spatial_similarity": round(spatial_score * 100, 1),
            "text_similarity": round(text_score * 100, 1),
            "type_similarity": round(type_score * 100, 1),
            "time_similarity": round(time_score * 100, 1),
            "distance_km": round(dist_km, 2),
            "total_match_confidence": round(total_score * 100, 1)
        }

        return total_score, breakdown

    @staticmethod
    def process_incoming_report(db: Session, report: Report) -> Tuple[Incident, bool, float, dict]:
        """
        Attempts to match an incoming report to an existing active incident.
        Returns: (Incident, is_merged, match_confidence_pct, breakdown)
        """
        # Fetch active incidents
        active_incidents = db.query(Incident).filter(Incident.status != "Resolved").all()
        
        best_incident = None
        best_score = 0.0
        best_breakdown = {}

        for incident in active_incidents:
            score, breakdown = FusionEngine.calculate_match_score(report, incident)
            if score > best_score:
                best_score = score
                best_incident = incident
                best_breakdown = breakdown

        # Threshold for duplicate fusion match (65%)
        FUSION_THRESHOLD = 0.60

        if best_incident and best_score >= FUSION_THRESHOLD:
            # Merge report into existing incident
            report.incident_id = best_incident.id
            best_incident.source_count += 1
            
            # Update affected people count (use maximum or smart accumulation)
            best_incident.people_affected = max(best_incident.people_affected, report.people_affected)
            if report.people_affected > 0 and best_incident.people_affected < report.people_affected + 2:
                best_incident.people_affected = max(best_incident.people_affected, report.people_affected)

            # Update medical need flag
            if report.medical_need:
                best_incident.medical_need = "urgent"

            # Merge required resources
            existing_resources = [r.get("type") for r in (best_incident.required_resources or [])]
            for req in (report.resource_requirements or []):
                if req not in existing_resources:
                    best_incident.required_resources.append({"type": req, "count": 1, "status": "pending"})

            best_incident.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(best_incident)
            db.refresh(report)

            return best_incident, True, round(best_score * 100, 1), best_breakdown

        else:
            # Create a brand new incident
            inc_id = f"INC-{uuid.uuid4().hex[:6].upper()}"
            
            # Derive title from report text
            title_text = report.raw_text[:60] + "..." if len(report.raw_text) > 60 else report.raw_text
            
            # Build initial resources
            req_resources = []
            for req in (report.resource_requirements or []):
                req_resources.append({"type": req, "count": 1, "status": "pending"})

            new_incident = Incident(
                id=inc_id,
                title=f"{report.disaster_type}: {title_text}",
                disaster_type=report.disaster_type,
                location_name=f"Lat {round(report.latitude, 4)}, Lon {round(report.longitude, 4)}",
                latitude=report.latitude,
                longitude=report.longitude,
                severity=report.severity,
                priority=50.0, # Will be computed by PriorityEngine
                confidence=report.confidence,
                people_affected=report.people_affected,
                medical_need="urgent" if report.medical_need else "no",
                status="New",
                required_resources=req_resources,
                source_count=1,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )

            db.add(new_incident)
            db.commit()
            db.refresh(new_incident)

            report.incident_id = new_incident.id
            db.commit()

            return new_incident, False, 100.0, {"status": "New Incident Created"}
