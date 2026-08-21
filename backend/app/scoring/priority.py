from datetime import datetime, timezone
from typing import Optional
from app.core.config import settings

class PriorityEngine:
    @staticmethod
    def calculate_priority(
        severity: str,
        people_affected: Optional[int],
        medical_need: Optional[str],
        resource_count: int,
        confidence: float,
        updated_at: datetime,
        weights: dict = None
    ) -> dict:
        """
        Calculates normalized Rescue Priority Score (0–100) and returns component breakdown.
        Safely handles unknown / None values without artificial zeroing.
        """
        w = weights or {
            "severity": settings.WEIGHT_SEVERITY,
            "people": settings.WEIGHT_PEOPLE_AFFECTED,
            "medical": settings.WEIGHT_MEDICAL_EMERGENCY,
            "resource": settings.WEIGHT_RESOURCE_CRITICALITY,
            "confidence": settings.WEIGHT_CONFIDENCE,
            "recency": settings.WEIGHT_RECENCY,
        }

        # 1. Severity Subscore (0-100)
        sev_map = {"critical": 100.0, "high": 75.0, "medium": 50.0, "low": 25.0}
        sev_score = sev_map.get((severity or "medium").lower(), 50.0)

        # 2. People Affected Subscore (0-100)
        # If None/unknown, assign a baseline unverified weight (25.0) instead of hard 0
        if people_affected is None:
            people_score = 25.0
        else:
            people_score = min(100.0, people_affected * 8.0)

        # 3. Medical Emergency Subscore (0-100)
        if medical_need is None:
            medical_score = 20.0
        else:
            medical_map = {"urgent": 100.0, "yes": 80.0, "no": 10.0}
            medical_score = medical_map.get(str(medical_need).lower(), 10.0)

        # 4. Resource Criticality Subscore (0-100)
        resource_score = min(100.0, resource_count * 25.0)

        # 5. Confidence Subscore (0-100)
        confidence_score = (confidence or 0.8) * 100.0

        # 6. Recency Subscore (0-100)
        now = datetime.now(timezone.utc)
        if updated_at is None:
            updated_at = now
        elif updated_at.tzinfo is None:
            updated_at = updated_at.replace(tzinfo=timezone.utc)
        
        age_hours = max(0.0, (now - updated_at).total_seconds() / 3600.0)
        recency_score = max(20.0, 100.0 - (age_hours * 15.0))

        # Weighted calculation
        total_priority = (
            w["severity"] * sev_score +
            w["people"] * people_score +
            w["medical"] * medical_score +
            w["resource"] * resource_score +
            w["confidence"] * confidence_score +
            w["recency"] * recency_score
        )

        final_score = round(max(0.0, min(100.0, total_priority)), 1)

        breakdown = {
            "final_priority": final_score,
            "severity_subscore": sev_score,
            "people_subscore": people_score,
            "medical_subscore": medical_score,
            "resource_subscore": resource_score,
            "confidence_subscore": confidence_score,
            "recency_subscore": recency_score,
            "weights_used": w
        }

        return breakdown
