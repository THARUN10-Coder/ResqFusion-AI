from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.report import Report
from app.models.conflict import Conflict
import uuid

CONTRADICTION_PAIRS = [
    (["collapsed", "destroyed", "washed away", "broken"], ["vehicles crossing", "traffic moving", "open", "passable", "intact"]),
    (["blocked", "impassable", "flooded road", "submerged"], ["clear", "passable", "cars driving", "open road"]),
    (["all evacuated", "everyone safe", "no one trapped"], ["trapped", "stranded", "stuck inside", "need rescue"]),
    (["no medical emergency", "minor injuries"], ["critical medical", "bleeding", "insulin required", "fatalities"]),
]

class ConflictDetector:
    @staticmethod
    def check_for_conflicts(db: Session, incident_id: str, new_report: Report) -> Optional[Conflict]:
        """
        Scans existing reports associated with the incident to find contradictory assertions.
        """
        existing_reports = db.query(Report).filter(
            Report.incident_id == incident_id,
            Report.id != new_report.id
        ).all()

        if not existing_reports:
            return None

        new_text = new_report.raw_text.lower()

        for old_report in existing_reports:
            old_text = old_report.raw_text.lower()
            
            for set_a, set_b in CONTRADICTION_PAIRS:
                # Check if old has set_a and new has set_b, or vice versa
                has_old_a = any(kw in old_text for kw in set_a)
                has_old_b = any(kw in old_text for kw in set_b)
                has_new_a = any(kw in new_text for kw in set_a)
                has_new_b = any(kw in new_text for kw in set_b)

                if (has_old_a and has_new_b) or (has_old_b and has_new_a):
                    # Check if conflict already exists for this pair
                    existing_conflict = db.query(Conflict).filter(
                        Conflict.incident_id == incident_id,
                        ((Conflict.report_a_id == old_report.id) & (Conflict.report_b_id == new_report.id)) |
                        ((Conflict.report_a_id == new_report.id) & (Conflict.report_b_id == old_report.id))
                    ).first()

                    if not existing_conflict:
                        conflict_type = "Infrastructure Passability" if any(w in new_text for w in ["bridge", "road", "crossing"]) else "Casualty / Safety Status"
                        
                        conflict = Conflict(
                            id=f"CONF-{uuid.uuid4().hex[:6].upper()}",
                            incident_id=incident_id,
                            report_a_id=old_report.id,
                            report_b_id=new_report.id,
                            claim_a=f"[{old_report.source}] \"{old_report.raw_text}\"",
                            claim_b=f"[{new_report.source}] \"{new_report.raw_text}\"",
                            conflict_type=conflict_type,
                            resolution_status="Unverified"
                        )
                        db.add(conflict)
                        db.commit()
                        db.refresh(conflict)
                        return conflict

        return None
