import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any
import logging
from app.connectors.base import DataConnector
from app.schemas.signal import UnifiedSignal

logger = logging.getLogger("resqfusion.connectors.usgs")

class USGSConnector(DataConnector):
    """
    USGS Earthquake Hazards Program Connector.
    Uses official machine-readable GeoJSON feed for real-time seismic events.
    Feed: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson (or all_day.geojson)
    """
    def __init__(self, feed_url: str = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson", enabled: bool = True):
        super().__init__(name="USGS", source_type="earthquake", enabled=enabled)
        self.feed_url = feed_url

    async def fetch(self) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(self.feed_url)
            resp.raise_for_status()
            return resp.json()

    def parse(self, raw_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        features = raw_data.get("features", [])
        parsed = []
        for feat in features:
            props = feat.get("properties", {})
            geom = feat.get("geometry", {})
            coords = geom.get("coordinates", [0.0, 0.0, 0.0])
            
            # coords are [longitude, latitude, depth_km]
            if len(coords) >= 2:
                lon = float(coords[0])
                lat = float(coords[1])
                depth = float(coords[2]) if len(coords) > 2 else 0.0
                
                parsed.append({
                    "id": feat.get("id") or props.get("code"),
                    "title": props.get("title") or f"M {props.get('mag')} Earthquake",
                    "place": props.get("place") or "Unknown Region",
                    "mag": props.get("mag"),
                    "time_ms": props.get("time"),
                    "url": props.get("url"),
                    "tsunami": props.get("tsunami", 0),
                    "status": props.get("status"),
                    "alert": props.get("alert"), # e.g. "green", "yellow", "red"
                    "latitude": lat,
                    "longitude": lon,
                    "depth_km": depth,
                    "raw": feat
                })
        return parsed

    def normalize(self, parsed_items: List[Dict[str, Any]]) -> List[UnifiedSignal]:
        signals = []
        for item in parsed_items:
            ext_id = str(item["id"])
            mag = float(item["mag"]) if item["mag"] is not None else 0.0
            
            # Map severity based on Magnitude & USGS Alert
            if mag >= 6.5 or item.get("alert") == "red":
                severity = "critical"
            elif mag >= 5.0 or item.get("alert") == "yellow":
                severity = "high"
            elif mag >= 3.5:
                severity = "medium"
            else:
                severity = "low"

            ts = datetime.fromtimestamp(item["time_ms"] / 1000.0, tz=timezone.utc) if item["time_ms"] else datetime.now(timezone.utc)
            
            desc = f"M {mag} Earthquake detected at {item['place']}. Depth: {item['depth_km']}km. USGS Status: {item['status']}."
            if item.get("tsunami") == 1:
                desc += " ⚠ Tsunami warning flag active."

            sig = UnifiedSignal(
                external_id=ext_id,
                source="USGS",
                source_type="earthquake",
                event_type="Earthquake",
                title=item["title"],
                description=desc,
                timestamp=ts,
                latitude=item["latitude"],
                longitude=item["longitude"],
                severity=severity,
                urgency="Immediate" if mag >= 5.0 else "Expected",
                certainty="Observed",
                confidence=0.95, # Scientific sensor measurement
                people_affected=None, # Not provided by raw sensor feed
                medical_need=None,
                resource_requirements=["Earth Movers / Heavy JCB", "Structural Inspection Drone"] if mag >= 5.5 else [],
                is_near_real_time=False,
                is_demo=False,
                raw_data=item["raw"],
                metadata={
                    "magnitude": mag,
                    "depth_km": item["depth_km"],
                    "usgs_url": item.get("url"),
                    "tsunami_flag": item.get("tsunami"),
                    "usgs_alert": item.get("alert")
                }
            )
            signals.append(sig)
        return signals

    def get_demo_signals(self) -> List[UnifiedSignal]:
        now = datetime.now(timezone.utc)
        return [
            UnifiedSignal(
                external_id="USGS-DEMO-2026-M54",
                source="USGS",
                source_type="earthquake",
                event_type="Earthquake",
                title="M 5.4 - 18 km SW of Vellore, Tamil Nadu, India",
                description="M 5.4 Earthquake recorded in Northern Tamil Nadu. Depth: 12.4km. DEMO DATA",
                timestamp=now,
                latitude=12.8202,
                longitude=79.0308,
                severity="high",
                urgency="Immediate",
                certainty="Observed",
                confidence=0.90,
                is_demo=True,
                metadata={"magnitude": 5.4, "depth_km": 12.4, "mode": "DEMO DATA"}
            )
        ]
