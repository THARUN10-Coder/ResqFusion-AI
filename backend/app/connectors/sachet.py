import httpx
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import List, Dict, Any
import logging
from app.connectors.base import DataConnector
from app.schemas.signal import UnifiedSignal

logger = logging.getLogger("resqfusion.connectors.sachet")

class SACHETConnector(DataConnector):
    """
    SACHET / NDMA (National Disaster Management Authority, India) CAP Feed Connector.
    Parses Common Alerting Protocol (CAP XML / RSS) alerts for meteorological, flood, and cyclone warnings.
    Supports official NDMA endpoints and live CAP Open Disaster Hub feeds for India.
    """
    def __init__(self, feed_url: str = "https://cap-sources.s3.amazonaws.com/in-imd-en/rss.xml", enabled: bool = True):
        super().__init__(name="SACHET", source_type="official_india_alert", enabled=enabled)
        self.feed_url = feed_url

    async def fetch(self) -> str:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/rss+xml, application/xml, text/xml;q=0.9"
        }
        async with httpx.AsyncClient(timeout=15.0, headers=headers, follow_redirects=True) as client:
            resp = await client.get(self.feed_url)
            resp.raise_for_status()
            return resp.text

    def parse(self, raw_xml: str) -> List[Dict[str, Any]]:
        parsed = []
        try:
            root = ET.fromstring(raw_xml)

            # Check if RSS container with item links
            channel = root.find("channel")
            if channel is not None and channel.findall("item"):
                for item in channel.findall("item"):
                    title = item.findtext("title") or "India National Disaster Alert"
                    desc = item.findtext("description") or title
                    link = item.findtext("link") or ""
                    guid = item.findtext("guid") or link or title[:30]
                    pub_date = item.findtext("pubDate") or ""

                    # Default centroids if district specific polygon parsed
                    lat = 13.0827 # Chennai default centroid
                    lon = 80.2707

                    # Check geo tags if present in RSS
                    geo_lat = item.findtext("{http://www.w3.org/2003/01/geo/wgs84_pos#}lat")
                    geo_lon = item.findtext("{http://www.w3.org/2003/01/geo/wgs84_pos#}long")
                    if geo_lat and geo_lon:
                        try:
                            lat = float(geo_lat)
                            lon = float(geo_lon)
                        except ValueError:
                            pass

                    parsed.append({
                        "identifier": f"SACHET-{guid.split('/')[-1].replace('.xml', '')}",
                        "event": "Flood / Extreme Weather" if "rain" in title.lower() or "flood" in title.lower() else title,
                        "urgency": "Immediate" if "heavy" in title.lower() or "severe" in title.lower() else "Expected",
                        "severity": "critical" if "extremely heavy" in title.lower() else "high" if "heavy" in title.lower() else "medium",
                        "certainty": "Observed",
                        "headline": title,
                        "description": desc,
                        "area_desc": "South India / Tamil Nadu Region",
                        "latitude": lat,
                        "longitude": lon,
                        "link": link,
                        "pub_date": pub_date
                    })
            else:
                # Direct CAP alert format (handles any default xml namespace)
                alerts = []
                if root.tag.endswith("alert") or root.tag == "alert":
                    alerts.append(root)
                else:
                    for child in root.iter():
                        if child.tag.endswith("alert") or child.tag == "alert":
                            alerts.append(child)

                for alert in alerts:
                    def find_text(p, t, d=""):
                        for child in p.iter():
                            if child.tag.endswith(t) or child.tag == t:
                                return child.text.strip() if child.text else d
                        return d

                    identifier = find_text(alert, "identifier", f"SACHET-{datetime.now().timestamp()}")
                    event = find_text(alert, "event", "Disaster Alert")
                    headline = find_text(alert, "headline", event)
                    desc = find_text(alert, "description", headline)
                    urgency = find_text(alert, "urgency", "Expected")
                    severity = find_text(alert, "severity", "Moderate")

                    lat = 13.0827
                    lon = 80.2707
                    circle = find_text(alert, "circle", "")
                    polygon = find_text(alert, "polygon", "")
                    if circle:
                        parts = circle.strip().split(",")
                        if len(parts) >= 2:
                            try:
                                lat = float(parts[0])
                                lon = float(parts[1].split()[0])
                            except ValueError:
                                pass
                    elif polygon:
                        pairs = polygon.strip().split()
                        if pairs:
                            p0 = pairs[0].split(",")
                            if len(p0) >= 2:
                                try:
                                    lat = float(p0[0])
                                    lon = float(p0[1])
                                except ValueError:
                                    pass

                    parsed.append({
                        "identifier": identifier,
                        "event": event,
                        "urgency": urgency,
                        "severity": severity,
                        "certainty": "Observed",
                        "headline": headline,
                        "description": desc,
                        "area_desc": find_text(alert, "areaDesc", "India / Tamil Nadu"),
                        "latitude": lat,
                        "longitude": lon
                    })

        except Exception as e:
            logger.error(f"[SACHET] XML Parse error: {e}")

        return parsed

    def normalize(self, parsed_items: List[Dict[str, Any]]) -> List[UnifiedSignal]:
        signals = []
        for item in parsed_items:
            sev_str = str(item.get("severity", "")).lower()
            if "critical" in sev_str or "extreme" in sev_str:
                severity = "critical"
            elif "high" in sev_str or "severe" in sev_str or "heavy" in sev_str:
                severity = "high"
            elif "medium" in sev_str or "moderate" in sev_str:
                severity = "medium"
            else:
                severity = "low"

            e_lower = str(item.get("event", "")).lower()
            if "rain" in e_lower or "flood" in e_lower or "inundat" in e_lower:
                event_type = "Flood"
            elif "cyclone" in e_lower or "storm" in e_lower or "wind" in e_lower:
                event_type = "Cyclone"
            elif "fire" in e_lower:
                event_type = "Fire"
            elif "quake" in e_lower:
                event_type = "Earthquake"
            else:
                event_type = item.get("event", "Disaster Alert")

            sig = UnifiedSignal(
                external_id=str(item["identifier"]),
                source="SACHET",
                source_type="official_india_alert",
                event_type=event_type,
                title=item["headline"],
                description=f"NDMA / IMD Alert: {item['description']} (Region: {item.get('area_desc', 'India')})",
                timestamp=datetime.now(timezone.utc),
                latitude=item["latitude"],
                longitude=item["longitude"],
                severity=severity,
                urgency=item.get("urgency"),
                certainty=item.get("certainty"),
                confidence=0.96, # Official National Alert Authority
                people_affected=None,
                medical_need=None,
                resource_requirements=["NDRF Rescue Team", "Emergency Inflatable Boats"] if event_type in ["Flood", "Cyclone"] else [],
                is_near_real_time=False,
                is_demo=False,
                raw_data=item,
                metadata={
                    "area_desc": item.get("area_desc"),
                    "link": item.get("link"),
                    "pub_date": item.get("pub_date")
                }
            )
            signals.append(sig)
        return signals

    def get_demo_signals(self) -> List[UnifiedSignal]:
        now = datetime.now(timezone.utc)
        return [
            UnifiedSignal(
                external_id="SACHET-DEMO-TN-FL-101",
                source="SACHET",
                source_type="official_india_alert",
                event_type="Flood",
                title="NDMA Official Red Alert: Inundation in Adyar & Velachery Basin",
                description="Official SACHET Alert: River Adyar discharge exceeded danger mark. Water level rising across low-lying wards. DEMO DATA",
                timestamp=now,
                latitude=12.9754,
                longitude=80.2206,
                severity="critical",
                urgency="Immediate",
                certainty="Observed",
                confidence=0.96,
                is_demo=True,
                metadata={"area_desc": "Chennai District, Tamil Nadu", "mode": "DEMO DATA"}
            )
        ]
