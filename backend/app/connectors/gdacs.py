import httpx
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import List, Dict, Any
import logging
from app.connectors.base import DataConnector
from app.schemas.signal import UnifiedSignal

logger = logging.getLogger("resqfusion.connectors.gdacs")

class GDACSConnector(DataConnector):
    """
    Global Disaster Alert and Coordination System (GDACS) Connector.
    Uses official RSS/XML and GeoJSON feeds for multi-hazard global disaster events.
    Feed: https://www.gdacs.org/xml/rss.xml
    """
    def __init__(self, feed_url: str = "https://www.gdacs.org/xml/rss.xml", enabled: bool = True):
        super().__init__(name="GDACS", source_type="official_global", enabled=enabled)
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
            channel = root.find("channel")
            if channel is None:
                return []

            # Namespace definitions used by GDACS RSS
            ns = {
                "geo": "http://www.w3.org/2003/01/geo/wgs84_pos#",
                "georss": "http://www.georss.org/georss",
                "gdacs": "http://www.gdacs.org"
            }

            for item in channel.findall("item"):
                title_elem = item.find("title")
                desc_elem = item.find("description")
                link_elem = item.find("link")
                pub_date_elem = item.find("pubDate")
                guid_elem = item.find("guid")

                # Extract coordinates (from geo:lat/geo:long or georss:point)
                lat = 0.0
                lon = 0.0
                
                lat_elem = item.find("geo:lat", ns)
                lon_elem = item.find("geo:long", ns)
                if lat_elem is not None and lon_elem is not None:
                    try:
                        lat = float(lat_elem.text.strip())
                        lon = float(lon_elem.text.strip())
                    except (ValueError, AttributeError):
                        pass
                else:
                    point_elem = item.find("georss:point", ns)
                    if point_elem is not None and point_elem.text:
                        parts = point_elem.text.strip().split()
                        if len(parts) >= 2:
                            try:
                                lat = float(parts[0])
                                lon = float(parts[1])
                            except ValueError:
                                pass

                # GDACS specific tags
                event_type_elem = item.find("gdacs:eventtype", ns)
                alert_level_elem = item.find("gdacs:alertlevel", ns)
                country_elem = item.find("gdacs:country", ns)
                event_id_elem = item.find("gdacs:eventid", ns)

                event_type = event_type_elem.text.strip() if event_type_elem is not None and event_type_elem.text else "Disaster"
                alert_level = alert_level_elem.text.strip() if alert_level_elem is not None and alert_level_elem.text else "Green"
                event_id = event_id_elem.text.strip() if event_id_elem is not None and event_id_elem.text else (guid_elem.text if guid_elem is not None else title_elem.text[:30])

                parsed.append({
                    "id": f"GDACS-{event_id}",
                    "title": title_elem.text if title_elem is not None else "GDACS Alert",
                    "description": desc_elem.text if desc_elem is not None else "",
                    "link": link_elem.text if link_elem is not None else "",
                    "pub_date": pub_date_elem.text if pub_date_elem is not None else "",
                    "latitude": lat,
                    "longitude": lon,
                    "event_type": event_type,
                    "alert_level": alert_level,
                    "country": country_elem.text if country_elem is not None else ""
                })
        except Exception as e:
            logger.error(f"[GDACS] Error parsing XML feed: {e}")

        return parsed

    def normalize(self, parsed_items: List[Dict[str, Any]]) -> List[UnifiedSignal]:
        signals = []
        
        # Mapping GDACS event codes to ResQFusion event types
        type_map = {
            "TC": "Cyclone",
            "EQ": "Earthquake",
            "FL": "Flood",
            "VO": "Volcano",
            "DR": "Drought",
            "WF": "Fire",
            "TS": "Tsunami"
        }

        for item in parsed_items:
            # Skip if invalid lat/lon
            if item["latitude"] == 0.0 and item["longitude"] == 0.0:
                continue

            alert_str = str(item.get("alert_level", "")).lower()
            if "red" in alert_str:
                severity = "critical"
            elif "orange" in alert_str or "yellow" in alert_str:
                severity = "high"
            else:
                severity = "medium"

            e_type = type_map.get(item["event_type"], item["event_type"].capitalize() if item["event_type"] else "Disaster")
            
            # Parse RFC 822 date
            ts = datetime.now(timezone.utc)
            if item.get("pub_date"):
                try:
                    # e.g. "Fri, 21 Aug 2026 06:30:00 GMT"
                    from email.utils import parsedate_to_datetime
                    ts = parsedate_to_datetime(item["pub_date"])
                except Exception:
                    pass

            sig = UnifiedSignal(
                external_id=str(item["id"]),
                source="GDACS",
                source_type="official_global",
                event_type=e_type,
                title=item["title"],
                description=item["description"] or f"Global Disaster Alert: {item['title']} in {item.get('country', 'Region')}",
                timestamp=ts,
                latitude=item["latitude"],
                longitude=item["longitude"],
                severity=severity,
                urgency="Immediate" if severity in ["critical", "high"] else "Expected",
                certainty="Observed",
                confidence=0.90,
                people_affected=None,
                medical_need=None,
                resource_requirements=["Emergency Relief Kit"],
                is_near_real_time=False,
                is_demo=False,
                raw_data=item,
                metadata={
                    "gdacs_alert_level": item.get("alert_level"),
                    "country": item.get("country"),
                    "link": item.get("link")
                }
            )
            signals.append(sig)
        return signals

    def get_demo_signals(self) -> List[UnifiedSignal]:
        now = datetime.now(timezone.utc)
        return [
            UnifiedSignal(
                external_id="GDACS-DEMO-TC-2026-01",
                source="GDACS",
                source_type="official_global",
                event_type="Cyclone",
                title="Tropical Cyclone Landfall Alert - Bay of Bengal & Cuddalore Coast",
                description="GDACS RED Alert: Category 2 Tropical Cyclone system moving towards Coastal Tamil Nadu. DEMO DATA",
                timestamp=now,
                latitude=11.7480,
                longitude=79.7714,
                severity="critical",
                urgency="Immediate",
                certainty="Likely",
                confidence=0.92,
                is_demo=True,
                metadata={"gdacs_alert_level": "Red", "country": "India", "mode": "DEMO DATA"}
            )
        ]
