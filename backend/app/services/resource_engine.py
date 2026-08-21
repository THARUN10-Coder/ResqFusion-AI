from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.incident import Incident

class ResourceEngine:
    @staticmethod
    def derive_resources(disaster_type: str, people_affected: int, medical_need: bool, text: str) -> List[Dict[str, Any]]:
        resources = []
        
        # Medical
        if medical_need:
            resources.append({"type": "Ambulance", "count": max(1, math.ceil(people_affected / 4)), "status": "pending"})
            resources.append({"type": "Medical Kit", "count": max(2, people_affected), "status": "pending"})

        # Flood / Water rescue
        if disaster_type.lower() in ["flood", "cyclone"]:
            resources.append({"type": "Rescue Boat", "count": max(1, math.ceil(people_affected / 6)), "status": "pending"})
            resources.append({"type": "Life Jackets", "count": max(5, people_affected * 2), "status": "pending"})
            resources.append({"type": "Drinking Water Units", "count": max(10, people_affected * 5), "status": "pending"})

        # Trapped / Collapse / Fire
        if disaster_type.lower() in ["earthquake", "infrastructure", "fire"] or "trapped" in text.lower():
            resources.append({"type": "NDRF Rescue Team", "count": max(1, math.ceil(people_affected / 8)), "status": "pending"})
            resources.append({"type": "Heavy Cutter Equipment", "count": 1, "status": "pending"})

        # General relief fallback
        if not resources:
            resources.append({"type": "Emergency Relief Kit", "count": 5, "status": "pending"})

        return resources

    @staticmethod
    def aggregate_resource_demands(db: Session) -> Dict[str, Any]:
        incidents = db.query(Incident).filter(Incident.status != "Resolved").all()
        
        demand_totals: Dict[str, int] = {}
        for inc in incidents:
            res_list = inc.required_resources or []
            for r in res_list:
                rtype = r.get("type", "General")
                count = r.get("count", 1)
                demand_totals[rtype] = demand_totals.get(rtype, 0) + count

        return {
            "total_active_incidents": len(incidents),
            "demands": demand_totals,
            "summary_list": [{"resource_type": k, "total_count": v} for k, v in demand_totals.items()]
        }
import math
