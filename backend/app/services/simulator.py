import asyncio
import uuid
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.report import Report
from app.models.incident import Incident
from app.models.conflict import Conflict
from app.ai.provider import get_ai_provider
from app.fusion.engine import FusionEngine
from app.fusion.conflict import ConflictDetector
from app.fusion.reliability import ReliabilityEngine
from app.scoring.priority import PriorityEngine
from app.scoring.xai import XAIEngine
from app.websocket.manager import ws_manager

logger = logging.getLogger("resqfusion.simulator")

SIMULATION_REPORTS = [
    {
        "source": "SACHET Official Alert",
        "source_type": "official",
        "raw_text": "Flash Flood Alert: Severe flooding reported near XYZ High School, River Ward. Water rising rapidly.",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "disaster_type": "Flood",
        "severity": "high",
        "people_affected": 0,
        "medical_need": False,
        "resource_requirements": ["Rescue Boat"],
        "image_url": None,
        "delay": 1
    },
    {
        "source": "Citizen App #1024",
        "source_type": "verified_citizen",
        "raw_text": "Urgent! 8 people stuck inside XYZ High School ground floor. Water level is 4ft and rising fast!",
        "latitude": 13.0831,
        "longitude": 80.2712,
        "disaster_type": "Flood",
        "severity": "critical",
        "people_affected": 8,
        "medical_need": False,
        "resource_requirements": ["Rescue Boat", "NDRF Rescue Team"],
        "image_url": None,
        "delay": 3
    },
    {
        "source": "Citizen App #1088",
        "source_type": "unverified_citizen",
        "raw_text": "Critical medical assistance needed at XYZ High School! An elderly teacher requires urgent insulin and medical checkup.",
        "latitude": 13.0829,
        "longitude": 80.2709,
        "disaster_type": "Flood",
        "severity": "critical",
        "people_affected": 12,
        "medical_need": True,
        "resource_requirements": ["Ambulance", "Medical Kit"],
        "image_url": None,
        "delay": 3
    },
    {
        "source": "News Feed - Regional Times",
        "source_type": "agency",
        "raw_text": "Duplicate Confirmation: 8 to 12 students trapped in flooded building near XYZ High School campus.",
        "latitude": 13.0825,
        "longitude": 80.2715,
        "disaster_type": "Flood",
        "severity": "high",
        "people_affected": 10,
        "medical_need": False,
        "resource_requirements": ["Rescue Boat"],
        "image_url": None,
        "delay": 3
    },
    {
        "source": "Social Media Monitor",
        "source_type": "social",
        "raw_text": "Main river access bridge near XYZ School completely collapsed! No vehicles can pass!",
        "latitude": 13.0850,
        "longitude": 80.2730,
        "disaster_type": "Infrastructure",
        "severity": "high",
        "people_affected": 0,
        "medical_need": False,
        "resource_requirements": ["Heavy Cutter Equipment"],
        "image_url": None,
        "delay": 4
    },
    {
        "source": "Traffic Control Dispatch",
        "source_type": "official",
        "raw_text": "Vehicles are still crossing the main river access bridge slowly. Bridge structure is intact with minor lane blockage.",
        "latitude": 13.0852,
        "longitude": 80.2732,
        "disaster_type": "Infrastructure",
        "severity": "medium",
        "people_affected": 0,
        "medical_need": False,
        "resource_requirements": [],
        "image_url": None,
        "delay": 3
    },
    {
        "source": "Citizen Drone Upload",
        "source_type": "verified_citizen",
        "raw_text": "Aerial image evidence showing flooded school entrance and stranded civilians on second floor balcony.",
        "latitude": 13.0828,
        "longitude": 80.2710,
        "disaster_type": "Flood",
        "severity": "critical",
        "people_affected": 12,
        "medical_need": True,
        "resource_requirements": ["NDRF Rescue Team", "Life Jackets"],
        "image_url": "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80",
        "delay": 3
    }
]

class DisasterSimulator:
    is_running = False

    @classmethod
    async def run_simulation(cls):
        cls.is_running = True
        logger.info("Disaster Simulation Started")
        
        await ws_manager.broadcast({
            "type": "SIMULATION_STARTED",
            "message": "Disaster simulation sequence initialized."
        })

        ai_provider = get_ai_provider()

        for step_idx, r_data in enumerate(SIMULATION_REPORTS):
            if not cls.is_running:
                logger.info("Disaster Simulation Aborted")
                break

            await asyncio.sleep(r_data["delay"])

            db = SessionLocal()
            try:
                # 1. AI Extraction
                extracted = ai_provider.extract_entities(r_data["raw_text"])

                # Create Report object
                report = Report(
                    id=f"REP-{uuid.uuid4().hex[:6].upper()}",
                    source=r_data["source"],
                    source_type=r_data["source_type"],
                    timestamp=datetime.now(timezone.utc),
                    latitude=r_data["latitude"],
                    longitude=r_data["longitude"],
                    raw_text=r_data["raw_text"],
                    disaster_type=extracted.get("disaster_type", r_data["disaster_type"]),
                    severity=extracted.get("severity", r_data["severity"]),
                    people_affected=max(r_data["people_affected"], extracted.get("people_affected", 0)),
                    medical_need=r_data["medical_need"] or extracted.get("medical_need", False),
                    resource_requirements=r_data["resource_requirements"],
                    image_url=r_data.get("image_url"),
                    extracted_entities=extracted,
                    confidence=ReliabilityEngine.get_source_weight(r_data["source_type"])
                )

                db.add(report)
                db.commit()
                db.refresh(report)

                # Broadcast raw report arrival
                await ws_manager.broadcast({
                    "type": "REPORT_RECEIVED",
                    "report_id": report.id,
                    "source": report.source,
                    "text": report.raw_text,
                    "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S")
                })

                # 2. Information Fusion & Deduplication
                incident, is_merged, match_conf, breakdown = FusionEngine.process_incoming_report(db, report)

                # 3. Check for Conflicts
                conflict = ConflictDetector.check_for_conflicts(db, incident.id, report)

                # 4. Calculate Reliability Confidence
                incident_reports = db.query(Report).filter(Report.incident_id == incident.id).all()
                incident_conflicts = db.query(Conflict).filter(Conflict.incident_id == incident.id).all()
                
                new_confidence = ReliabilityEngine.calculate_incident_confidence(incident_reports, incident_conflicts)
                incident.confidence = new_confidence

                # 5. Recalculate Priority Score
                res_count = len(incident.required_resources or [])
                old_priority = incident.priority

                priority_info = PriorityEngine.calculate_priority(
                    severity=incident.severity,
                    people_affected=incident.people_affected,
                    medical_need=incident.medical_need,
                    resource_count=res_count,
                    confidence=incident.confidence,
                    updated_at=incident.updated_at
                )
                incident.priority = priority_info["final_priority"]

                # 6. Generate XAI Narrative
                all_active_incidents = db.query(Incident).filter(Incident.status != "Resolved").order_by(Incident.priority.desc()).all()
                rank = 1
                for idx, inc in enumerate(all_active_incidents):
                    if inc.id == incident.id:
                        rank = idx + 1
                        break

                xai_info = XAIEngine.generate_explanation(incident, incident_reports, incident_conflicts, rank=rank, priority_breakdown=priority_info)
                incident.xai_explanation = xai_info["narrative_explanation"]
                incident.xai_breakdown = xai_info

                db.commit()
                db.refresh(incident)

                # 7. Broadcast Events
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
                else:
                    await ws_manager.broadcast({
                        "type": "INCIDENT_CREATED",
                        "incident_id": incident.id,
                        "title": incident.title,
                        "priority": incident.priority,
                        "message": f"New Incident {incident.id} created",
                        "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S")
                    })

                if conflict:
                    await ws_manager.broadcast({
                        "type": "CONFLICT_DETECTED",
                        "incident_id": incident.id,
                        "conflict_id": conflict.id,
                        "claim_a": conflict.claim_a,
                        "claim_b": conflict.claim_b,
                        "message": f"⚠ CONFLICT DETECTED on Incident {incident.id}",
                        "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S")
                    })

                if abs(incident.priority - old_priority) > 0.5:
                    await ws_manager.broadcast({
                        "type": "PRIORITY_UPDATED",
                        "incident_id": incident.id,
                        "old_priority": round(old_priority, 1),
                        "new_priority": incident.priority,
                        "rank": rank,
                        "message": f"Priority updated for {incident.id}: {round(old_priority, 1)} → {incident.priority}",
                        "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S")
                    })

            except Exception as e:
                logger.error(f"Error in simulator step: {e}")
            finally:
                db.close()

        cls.is_running = False
        await ws_manager.broadcast({
            "type": "SIMULATION_COMPLETED",
            "message": "Disaster simulation sequence completed."
        })
