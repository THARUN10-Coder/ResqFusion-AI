import asyncio
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.core.config import settings
from app.models.signal import SourceSignal, IncidentSignal
from app.models.incident import Incident
from app.models.conflict import Conflict
from app.schemas.signal import UnifiedSignal
from app.connectors.usgs import USGSConnector
from app.connectors.gdacs import GDACSConnector
from app.connectors.sachet import SACHETConnector
from app.connectors.firms import NASA_FIRMSConnector
from app.fusion.engine import FusionEngine, haversine_distance_km
from app.fusion.reliability import ReliabilityEngine
from app.fusion.conflict import ConflictDetector
from app.scoring.priority import PriorityEngine
from app.scoring.xai import XAIEngine
from app.websocket.manager import ws_manager

logger = logging.getLogger("resqfusion.ingestion")

class IngestionService:
    """
    Central Ingestion Hub responsible for:
    1. Polling external connectors (USGS, GDACS, SACHET, NASA FIRMS)
    2. Processing UnifiedSignal objects (both external and citizen generated)
    3. Deduplication via UNIQUE(source, external_id)
    4. Hierarchical Geo + Temporal + Type candidate filtering
    5. Incident Matching, Merging, Evidence Linking, and Prioritization
    6. Real-time WebSocket broadcasting
    """
    _instance = None
    
    def __init__(self):
        self.connectors = {
            "usgs": USGSConnector(feed_url=settings.USGS_FEED_URL, enabled=settings.USGS_ENABLED),
            "gdacs": GDACSConnector(feed_url=settings.GDACS_FEED_URL, enabled=settings.GDACS_ENABLED),
            "sachet": SACHETConnector(feed_url=settings.SACHET_FEED_URL, enabled=settings.SACHET_ENABLED),
            "firms": NASA_FIRMSConnector(map_key=settings.FIRMS_MAP_KEY, enabled=settings.FIRMS_ENABLED, region=settings.FIRMS_REGION)
        }
        self.is_running = False
        self._tasks: List[asyncio.Task] = []

    @classmethod
    def get_instance(cls) -> "IngestionService":
        if cls._instance is None:
            cls._instance = IngestionService()
        return cls._instance

    def get_connectors_status(self) -> List[Dict[str, Any]]:
        """Returns live health and status report for all registered connectors."""
        return [connector.get_status_summary() for connector in self.connectors.values()]

    async def start_scheduler(self):
        """Launches non-blocking background polling tasks for each active connector."""
        if self.is_running:
            return
        self.is_running = True
        logger.info("Starting Real-World Disaster Data Ingestion Schedulers...")

        # Spawn independent background polling loops with individual interval configs
        self._tasks.append(asyncio.create_task(self._poll_connector_loop("usgs", settings.USGS_POLL_SECONDS)))
        self._tasks.append(asyncio.create_task(self._poll_connector_loop("gdacs", settings.GDACS_POLL_SECONDS)))
        self._tasks.append(asyncio.create_task(self._poll_connector_loop("sachet", settings.SACHET_POLL_SECONDS)))
        self._tasks.append(asyncio.create_task(self._poll_connector_loop("firms", settings.FIRMS_POLL_SECONDS)))

    async def stop_scheduler(self):
        """Gracefully stops all background polling tasks."""
        self.is_running = False
        for task in self._tasks:
            task.cancel()
        self._tasks.clear()
        logger.info("Real-World Ingestion Schedulers Stopped.")

    async def _poll_connector_loop(self, connector_key: str, interval_seconds: int):
        """Resilient polling loop that handles failure isolation without crashing backend."""
        connector = self.connectors[connector_key]
        # Initial run immediate or short delay
        await asyncio.sleep(2)

        while self.is_running:
            try:
                signals = await connector.ingest()
                if signals:
                    logger.info(f"[{connector.name}] Fetched and normalized {len(signals)} signals.")
                    await self.process_batch_signals(signals)
                    
                    # Broadcast data source status update
                    await ws_manager.broadcast({
                        "type": "DATA_SOURCE_STATUS_CHANGED",
                        "source": connector.name,
                        "status": connector.status,
                        "signal_count": len(signals),
                        "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S")
                    })
            except Exception as e:
                logger.error(f"[{connector.name}] Polling failure: {e}")
            
            # Wait for next polling interval safely
            await asyncio.sleep(max(10, interval_seconds))

    async def process_batch_signals(self, signals: List[UnifiedSignal]):
        """Processes a stream of UnifiedSignal instances."""
        db = SessionLocal()
        try:
            for signal in signals:
                await self.process_single_signal(db, signal)
        finally:
            db.close()

    async def process_single_signal(self, db: Session, signal: UnifiedSignal) -> Optional[Incident]:
        """
        Ingests, deduplicates, filters, fuses, and prioritizes a single UnifiedSignal.
        """
        # 1. Deduplication check via (source, external_id)
        existing_sig = db.query(SourceSignal).filter(
            SourceSignal.source == signal.source,
            SourceSignal.external_id == signal.external_id
        ).first()

        if existing_sig:
            # Signal was already ingested previously -> skip duplicate processing
            return None

        # 2. Persist SourceSignal in DB
        sig_id = f"SIG-{uuid.uuid4().hex[:8].upper()}"
        db_signal = SourceSignal(
            id=sig_id,
            external_id=signal.external_id,
            source=signal.source,
            source_type=signal.source_type,
            event_type=signal.event_type,
            title=signal.title,
            description=signal.description,
            timestamp=signal.timestamp,
            latitude=signal.latitude,
            longitude=signal.longitude,
            severity=signal.severity,
            urgency=signal.urgency,
            certainty=signal.certainty,
            confidence=signal.confidence,
            people_affected=signal.people_affected,
            medical_need=signal.medical_need,
            resource_requirements=signal.resource_requirements,
            is_near_real_time=signal.is_near_real_time,
            is_demo=signal.is_demo,
            raw_data=signal.raw_data,
            metadata_json=signal.metadata
        )
        db.add(db_signal)
        db.commit()
        db.refresh(db_signal)

        # Broadcast NEW_SIGNAL event
        await ws_manager.broadcast({
            "type": "NEW_SIGNAL",
            "signal_id": db_signal.id,
            "source": db_signal.source,
            "source_type": db_signal.source_type,
            "event_type": db_signal.event_type,
            "title": db_signal.title,
            "latitude": db_signal.latitude,
            "longitude": db_signal.longitude,
            "is_near_real_time": db_signal.is_near_real_time,
            "is_demo": db_signal.is_demo,
            "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S")
        })

        # 3. Candidate Incident Filtering (Scalable Hierarchical Filter)
        # Filter candidate incidents by: (a) status != Resolved, (b) time window (+- 24 hrs), (c) bounding box
        now = datetime.now(timezone.utc)
        sig_time = db_signal.timestamp
        if sig_time.tzinfo is None:
            sig_time = sig_time.replace(tzinfo=timezone.utc)

        # Bounding box ~ 50km (~0.5 degrees lat/lon)
        lat_min, lat_max = db_signal.latitude - 0.5, db_signal.latitude + 0.5
        lon_min, lon_max = db_signal.longitude - 0.5, db_signal.longitude + 0.5

        candidate_incidents = db.query(Incident).filter(
            Incident.status != "Resolved",
            Incident.latitude >= lat_min, Incident.latitude <= lat_max,
            Incident.longitude >= lon_min, Incident.longitude <= lon_max
        ).all()

        best_incident = None
        best_match_score = 0.0
        best_breakdown = {}

        # 4. Perform Detailed Incident Matching against Candidates
        for cand in candidate_incidents:
            dist_km = haversine_distance_km(db_signal.latitude, db_signal.longitude, cand.latitude, cand.longitude)
            
            # Spatial score
            if dist_km <= 1.0:
                spatial_score = 1.0
            elif dist_km <= 5.0:
                spatial_score = 0.85
            elif dist_km <= 15.0:
                spatial_score = 0.50
            else:
                spatial_score = max(0.0, 1.0 - (dist_km / 25.0))

            # Event type score
            type_score = 1.0 if cand.disaster_type.lower() == db_signal.event_type.lower() else 0.35

            # Text / semantic score
            from app.fusion.engine import calculate_text_similarity
            text_score = calculate_text_similarity(db_signal.description, cand.title)

            total_score = (0.50 * spatial_score) + (0.30 * type_score) + (0.20 * text_score)

            if total_score > best_match_score:
                best_match_score = total_score
                best_incident = cand
                best_breakdown = {
                    "distance_km": round(dist_km, 2),
                    "spatial_score": round(spatial_score * 100, 1),
                    "type_score": round(type_score * 100, 1),
                    "text_score": round(text_score * 100, 1),
                    "match_confidence": round(total_score * 100, 1)
                }

        FUSION_THRESHOLD = 0.60 # 60% confidence threshold for merging

        if best_incident and best_match_score >= FUSION_THRESHOLD:
            # 5. ATTACH SIGNAL TO EXISTING INCIDENT
            db_signal.incident_id = best_incident.id
            best_incident.source_count += 1
            
            # Update severity if signal is higher severity
            sev_levels = {"low": 1, "medium": 2, "high": 3, "critical": 4}
            if sev_levels.get(db_signal.severity.lower(), 2) > sev_levels.get(best_incident.severity.lower(), 2):
                best_incident.severity = db_signal.severity

            # Update people affected if signal provides concrete evidence
            if db_signal.people_affected is not None and db_signal.people_affected > 0:
                best_incident.people_affected = max(best_incident.people_affected or 0, db_signal.people_affected)

            # Update medical need if signal reports urgency
            if db_signal.medical_need:
                best_incident.medical_need = "urgent"

            # Merge resources
            existing_res = [r.get("type") for r in (best_incident.required_resources or [])]
            for r_req in (db_signal.resource_requirements or []):
                if r_req not in existing_res:
                    best_incident.required_resources.append({"type": r_req, "count": 1, "status": "pending"})

            # Create IncidentSignal relation
            rel = IncidentSignal(
                id=f"IS-{uuid.uuid4().hex[:8].upper()}",
                incident_id=best_incident.id,
                signal_id=db_signal.id,
                match_score=best_match_score,
                relationship_type="supporting_evidence"
            )
            db.add(rel)

            # Update Reliability Confidence & Priority
            all_signals = db.query(SourceSignal).filter(SourceSignal.incident_id == best_incident.id).all()
            all_conflicts = db.query(Conflict).filter(Conflict.incident_id == best_incident.id).all()
            
            best_incident.confidence = ReliabilityEngine.calculate_incident_confidence(all_signals, all_conflicts)
            
            p_info = PriorityEngine.calculate_priority(
                severity=best_incident.severity,
                people_affected=best_incident.people_affected,
                medical_need=best_incident.medical_need,
                resource_count=len(best_incident.required_resources or []),
                confidence=best_incident.confidence,
                updated_at=datetime.now(timezone.utc)
            )
            best_incident.priority = p_info["final_priority"]
            best_incident.updated_at = datetime.now(timezone.utc)

            # Update Explainable AI Explanation
            all_incidents = db.query(Incident).filter(Incident.status != "Resolved").order_by(Incident.priority.desc()).all()
            rank = next((idx + 1 for idx, inc in enumerate(all_incidents) if inc.id == best_incident.id), 1)
            xai = XAIEngine.generate_explanation(best_incident, all_signals, all_conflicts, rank=rank, priority_breakdown=p_info)
            best_incident.xai_explanation = xai["narrative_explanation"]
            best_incident.xai_breakdown = xai

            db.commit()
            db.refresh(best_incident)

            # Broadcast FUSED event
            await ws_manager.broadcast({
                "type": "SIGNAL_FUSED",
                "incident_id": best_incident.id,
                "signal_id": db_signal.id,
                "source": db_signal.source,
                "match_confidence": round(best_match_score * 100, 1),
                "message": f"Signal from {db_signal.source} fused into {best_incident.id} ({round(best_match_score * 100, 1)}% match)",
                "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S")
            })

            return best_incident

        else:
            # 6. CREATE BRAND NEW INCIDENT FROM SIGNAL
            inc_id = f"INC-{db_signal.source[:3]}-{uuid.uuid4().hex[:8].upper()}"
            
            p_info = PriorityEngine.calculate_priority(
                severity=db_signal.severity,
                people_affected=db_signal.people_affected,
                medical_need="urgent" if db_signal.medical_need else "no",
                resource_count=len(db_signal.resource_requirements or []),
                confidence=db_signal.confidence,
                updated_at=datetime.now(timezone.utc)
            )

            req_res = [{"type": req, "count": 1, "status": "pending"} for req in (db_signal.resource_requirements or [])]

            new_incident = Incident(
                id=inc_id,
                title=f"{db_signal.event_type}: {db_signal.title[:65]}",
                disaster_type=db_signal.event_type,
                location_name=f"Lat {round(db_signal.latitude, 4)}, Lon {round(db_signal.longitude, 4)}",
                latitude=db_signal.latitude,
                longitude=db_signal.longitude,
                severity=db_signal.severity,
                priority=p_info["final_priority"],
                confidence=db_signal.confidence,
                people_affected=db_signal.people_affected or 0,
                medical_need="urgent" if db_signal.medical_need else "no",
                status="New",
                required_resources=req_res,
                source_count=1,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )

            db.add(new_incident)
            db.commit()
            db.refresh(new_incident)

            db_signal.incident_id = new_incident.id

            rel = IncidentSignal(
                id=f"IS-{uuid.uuid4().hex[:8].upper()}",
                incident_id=new_incident.id,
                signal_id=db_signal.id,
                match_score=1.0,
                relationship_type="primary"
            )
            db.add(rel)

            # Generate XAI explanation
            xai = XAIEngine.generate_explanation(new_incident, [db_signal], [], rank=1, priority_breakdown=p_info)
            new_incident.xai_explanation = xai["narrative_explanation"]
            new_incident.xai_breakdown = xai

            db.commit()
            db.refresh(new_incident)

            # Broadcast INCIDENT_CREATED event
            await ws_manager.broadcast({
                "type": "INCIDENT_CREATED",
                "incident_id": new_incident.id,
                "title": new_incident.title,
                "priority": new_incident.priority,
                "source": db_signal.source,
                "message": f"New Incident {new_incident.id} created from {db_signal.source} signal",
                "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S")
            })

            return new_incident
