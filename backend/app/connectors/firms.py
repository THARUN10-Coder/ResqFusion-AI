import httpx
import csv
import io
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import logging
from app.connectors.base import DataConnector
from app.schemas.signal import UnifiedSignal

logger = logging.getLogger("resqfusion.connectors.firms")

class NASA_FIRMSConnector(DataConnector):
    """
    NASA FIRMS (Fire Information for Resource Management System) Connector.
    Pulls satellite thermal anomaly & active wildfire detections from MODIS / VIIRS instruments.
    Supports official Open Data 24h regional feed for South Asia / India as well as custom MAP_KEY area queries.
    """
    def __init__(self, map_key: Optional[str] = None, enabled: bool = True, region: str = "76,8,81,14"):
        super().__init__(name="NASA_FIRMS", source_type="satellite_fire", enabled=enabled)
        self.map_key = map_key
        self.region = region
        # Open data live feed (No key required for South Asia NRT)
        self.open_feed_url = "https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_South_Asia_24h.csv"

    async def fetch(self) -> str:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        # If MAP_KEY provided, use custom area bounding box API, otherwise use official open feed
        if self.map_key:
            url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{self.map_key}/VIIRS_SNPP_NRT/{self.region}/1"
        else:
            url = self.open_feed_url

        async with httpx.AsyncClient(timeout=20.0, headers=headers, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.text

    def parse(self, raw_csv: str) -> List[Dict[str, Any]]:
        parsed = []
        try:
            reader = csv.DictReader(io.StringIO(raw_csv))
            for row in reader:
                lat = float(row.get("latitude", 0.0))
                lon = float(row.get("longitude", 0.0))
                frp = float(row.get("frp", 0.0)) if row.get("frp") else 0.0
                confidence = row.get("confidence", "nominal")
                acq_date = row.get("acq_date", "")
                acq_time = row.get("acq_time", "")
                satellite = row.get("satellite", "VIIRS/SNPP")

                parsed.append({
                    "id": f"FIRMS-{lat:.4f}-{lon:.4f}-{acq_date}-{acq_time}",
                    "latitude": lat,
                    "longitude": lon,
                    "frp": frp, # Fire Radiative Power (MW)
                    "confidence": confidence,
                    "acq_date": acq_date,
                    "acq_time": acq_time,
                    "satellite": satellite,
                    "daynight": row.get("daynight", "D"),
                    "raw": row
                })
        except Exception as e:
            logger.error(f"[NASA_FIRMS] Error parsing CSV: {e}")

        return parsed

    def normalize(self, parsed_items: List[Dict[str, Any]]) -> List[UnifiedSignal]:
        signals = []
        for item in parsed_items:
            frp = item["frp"]
            
            # Map severity based on FRP (Fire Radiative Power)
            if frp >= 50.0:
                severity = "critical"
            elif frp >= 20.0:
                severity = "high"
            elif frp >= 5.0:
                severity = "medium"
            else:
                severity = "low"

            # Parse confidence
            conf_str = str(item["confidence"]).lower()
            conf_val = 0.90 if conf_str in ["h", "high"] else 0.82 if conf_str in ["n", "nominal"] else 0.65

            desc = f"Satellite Active Fire Detection: {item['satellite']} recorded FRP {frp:.1f} MW. Day/Night: {item['daynight']}."

            sig = UnifiedSignal(
                external_id=item["id"],
                source="NASA_FIRMS",
                source_type="satellite_fire",
                event_type="Fire",
                title=f"Satellite Thermal Anomaly (FRP {frp:.1f} MW)",
                description=desc,
                timestamp=datetime.now(timezone.utc),
                latitude=item["latitude"],
                longitude=item["longitude"],
                severity=severity,
                urgency="Expected",
                certainty="Observed",
                confidence=conf_val,
                people_affected=None, # Satellite sensors detect thermal emissions, not casualty counts
                medical_need=None,
                resource_requirements=["Forest Fire Squads", "Helicopter Water Droppers"] if frp >= 25.0 else [],
                is_near_real_time=True, # Explicit Near-Real-Time designation
                is_demo=False,
                raw_data=item.get("raw", {}),
                metadata={
                    "frp_mw": frp,
                    "satellite": item["satellite"],
                    "acq_date": item["acq_date"],
                    "acq_time": item["acq_time"],
                    "daynight": item["daynight"]
                }
            )
            signals.append(sig)
        return signals

    def get_demo_signals(self) -> List[UnifiedSignal]:
        now = datetime.now(timezone.utc)
        return [
            UnifiedSignal(
                external_id="FIRMS-DEMO-2026-YERC-01",
                source="NASA_FIRMS",
                source_type="satellite_fire",
                event_type="Fire",
                title="Satellite Thermal Anomaly: Yercaud Forest Slopes (FRP 34.2 MW)",
                description="Near-Real-Time VIIRS Satellite thermal hotspot detection over Eastern Ghats reserve forest. FRP: 34.2 MW. DEMO DATA",
                timestamp=now,
                latitude=11.7753,
                longitude=78.2093,
                severity="high",
                urgency="Expected",
                certainty="Observed",
                confidence=0.88,
                is_near_real_time=True,
                is_demo=True,
                resource_requirements=["Forest Fire Squads", "Helicopter Water Droppers"],
                metadata={"frp_mw": 34.2, "satellite": "VIIRS/SNPP", "mode": "DEMO DATA"}
            )
        ]
