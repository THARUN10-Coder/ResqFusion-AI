from typing import List, Dict, Any, Union
from app.models.incident import Incident
from app.models.report import Report
from app.models.signal import SourceSignal
from app.models.conflict import Conflict

class XAIEngine:
    @staticmethod
    def generate_explanation(
        incident: Incident,
        reports: List[Union[Report, SourceSignal]],
        conflicts: List[Conflict],
        rank: int = 1,
        priority_breakdown: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Generates human-readable Explainable AI (XAI) justification narratives.
        Works across both Reports and SourceSignal models.
        """
        reasons = []

        # Severity
        if (incident.severity or "").lower() in ["critical", "high"]:
            reasons.append(f"{incident.severity.capitalize()} severity disaster classification")

        # Casualties / People
        if incident.people_affected and incident.people_affected > 0:
            reasons.append(f"{incident.people_affected} people reported trapped or affected")

        # Medical Need
        if (incident.medical_need or "").lower() in ["urgent", "yes"]:
            reasons.append("Urgent medical assistance required")

        # Multi-source confirmation
        if len(reports) > 1:
            reasons.append(f"Confirmed by {len(reports)} independent multi-tier sources")
        elif len(reports) == 1:
            reasons.append(f"Reported via verified source ({reports[0].source})")

        # Resource demand
        if incident.required_resources:
            res_types = [r.get("type", "Resource") for r in incident.required_resources[:3]]
            reasons.append(f"Requires immediate dispatch of {', '.join(res_types)}")

        # Conflicts check
        has_conflicts = any(c.resolution_status == "Unverified" for c in conflicts)
        if has_conflicts:
            reasons.append("⚠ Note: Contains unverified conflicting claims requiring field verification")

        # Build primary summary sentence
        summary = (
            f"Incident {incident.id} is ranked #{rank} priority (Score: {incident.priority}/100) because "
            f"{' and '.join(reasons[:3])} with {round(incident.confidence * 100)}% confidence."
        )

        evidence_list = []
        for r in reports:
            # Handle both Report (raw_text) and SourceSignal (description)
            snippet = getattr(r, "raw_text", None) or getattr(r, "description", "") or getattr(r, "title", "")
            evidence_list.append({
                "report_id": r.id,
                "source": r.source,
                "source_type": r.source_type,
                "timestamp": r.timestamp.isoformat() if hasattr(r.timestamp, 'isoformat') else str(r.timestamp),
                "snippet": snippet,
                "confidence": r.confidence
            })

        return {
            "narrative_explanation": summary,
            "key_factors": reasons,
            "rank": rank,
            "priority_score": incident.priority,
            "confidence_score": round(incident.confidence * 100),
            "evidence_count": len(reports),
            "evidence_chain": evidence_list,
            "has_unresolved_conflicts": has_conflicts,
            "breakdown": priority_breakdown or {}
        }
