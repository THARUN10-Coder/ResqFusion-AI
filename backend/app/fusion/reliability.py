from typing import List, Union
from app.models.report import Report
from app.models.signal import SourceSignal
from app.models.conflict import Conflict
from app.core.config import settings

class ReliabilityEngine:
    @staticmethod
    def get_source_weight(source_type: str) -> float:
        st = source_type.lower()
        if "official_india" in st or "official_alert" in st:
            return settings.RELIABILITY_OFFICIAL_ALERT
        elif "official_global" in st:
            return settings.RELIABILITY_OFFICIAL_GLOBAL
        elif "agency" in st:
            return settings.RELIABILITY_EMERGENCY_AGENCY
        elif "earthquake" in st or "sensor" in st or "scientific" in st:
            return settings.RELIABILITY_SCIENTIFIC_SENSOR
        elif "satellite" in st or "fire" in st:
            return settings.RELIABILITY_SATELLITE_FIRE
        elif "verified" in st and "citizen" in st:
            return settings.RELIABILITY_VERIFIED_CITIZEN
        elif "citizen" in st:
            return settings.RELIABILITY_UNVERIFIED_CITIZEN
        elif "social" in st:
            return settings.RELIABILITY_SOCIAL_MEDIA
        elif "official" in st:
            return settings.RELIABILITY_OFFICIAL_ALERT
        return 0.70

    @staticmethod
    def calculate_incident_confidence(reports: List[Union[Report, SourceSignal]], conflicts: List[Conflict]) -> float:
        if not reports:
            return 0.50

        # Base confidence from highest reliable source
        source_weights = [ReliabilityEngine.get_source_weight(r.source_type) for r in reports]
        max_source_conf = max(source_weights)

        # Confirmation bonus: +0.03 per additional corroborating source (max +0.15)
        confirmation_bonus = min(0.15, (len(reports) - 1) * 0.03)

        # Image or sensor evidence bonus
        has_image = any(getattr(r, "image_url", None) for r in reports)
        has_sensor = any(getattr(r, "source_type", "") in ["satellite_fire", "earthquake"] for r in reports)
        evidence_bonus = 0.04 if (has_image or has_sensor) else 0.0

        # Conflict penalty
        unresolved_conflicts = [c for c in conflicts if c.resolution_status == "Unverified"]
        conflict_penalty = 0.15 if unresolved_conflicts else 0.0

        final_conf = max_source_conf + confirmation_bonus + evidence_bonus - conflict_penalty
        return round(max(0.10, min(0.99, final_conf)), 2)
