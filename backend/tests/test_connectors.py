import pytest
from app.connectors.usgs import USGSConnector
from app.connectors.gdacs import GDACSConnector
from app.connectors.sachet import SACHETConnector
from app.connectors.firms import NASA_FIRMSConnector

def test_usgs_parser():
    connector = USGSConnector(enabled=True)
    sample_geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "id": "us7000test",
                "properties": {
                    "mag": 5.8,
                    "place": "12 km SW of Cuddalore, India",
                    "time": 1700000000000,
                    "url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000test",
                    "status": "reviewed",
                    "tsunami": 0,
                    "alert": "yellow",
                    "title": "M 5.8 - 12 km SW of Cuddalore, India"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [79.77, 11.74, 10.5]
                }
            }
        ]
    }
    parsed = connector.parse(sample_geojson)
    assert len(parsed) == 1
    signals = connector.normalize(parsed)
    assert len(signals) == 1
    sig = signals[0]
    assert sig.external_id == "us7000test"
    assert sig.source == "USGS"
    assert sig.source_type == "earthquake"
    assert sig.event_type == "Earthquake"
    assert sig.severity == "high"
    assert sig.latitude == 11.74
    assert sig.longitude == 79.77
    assert sig.metadata["magnitude"] == 5.8
    assert sig.people_affected is None

def test_gdacs_parser():
    connector = GDACSConnector(enabled=True)
    sample_xml = """<?xml version="1.0" encoding="utf-8"?>
    <rss version="2.0" xmlns:geo="http://www.w3.org/2003/01/geo/wgs84_pos#" xmlns:gdacs="http://www.gdacs.org">
      <channel>
        <title>GDACS Alerts</title>
        <item>
          <title>Tropical Cyclone Landfall Alert</title>
          <description>Red Alert for Cyclone landfall in Southern India</description>
          <link>https://www.gdacs.org/report.aspx?eventid=100012</link>
          <pubDate>Fri, 21 Aug 2026 05:00:00 GMT</pubDate>
          <guid>GDACS_TC_100012</guid>
          <geo:lat>11.7480</geo:lat>
          <geo:long>79.7714</geo:long>
          <gdacs:eventtype>TC</gdacs:eventtype>
          <gdacs:alertlevel>Red</gdacs:alertlevel>
          <gdacs:country>India</gdacs:country>
          <gdacs:eventid>100012</gdacs:eventid>
        </item>
      </channel>
    </rss>
    """
    parsed = connector.parse(sample_xml)
    assert len(parsed) == 1
    signals = connector.normalize(parsed)
    assert len(signals) == 1
    sig = signals[0]
    assert sig.source == "GDACS"
    assert sig.event_type == "Cyclone"
    assert sig.severity == "critical"
    assert sig.latitude == 11.7480
    assert sig.longitude == 79.7714

def test_sachet_parser():
    connector = SACHETConnector(enabled=True)
    sample_cap_xml = """<?xml version="1.0" encoding="UTF-8"?>
    <alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
      <identifier>SACHET-TN-ALERT-991</identifier>
      <info>
        <event>Flash Flood</event>
        <urgency>Immediate</urgency>
        <severity>Extreme</severity>
        <certainty>Observed</certainty>
        <headline>Severe Inundation Warning for Velachery</headline>
        <description>Water levels in Velachery basin reached 5 feet</description>
        <area>
          <areaDesc>Chennai District, Tamil Nadu</areaDesc>
          <circle>12.9754,80.2206,5.0</circle>
        </area>
      </info>
    </alert>
    """
    parsed = connector.parse(sample_cap_xml)
    assert len(parsed) == 1
    signals = connector.normalize(parsed)
    assert len(signals) == 1
    sig = signals[0]
    assert sig.source == "SACHET"
    assert sig.source_type == "official_india_alert"
    assert sig.event_type == "Flood"
    assert sig.severity == "critical"
    assert sig.latitude == 12.9754
    assert sig.longitude == 80.2206

def test_firms_parser():
    connector = NASA_FIRMSConnector(map_key="test_key", enabled=True)
    sample_csv = "latitude,longitude,frp,confidence,acq_date,acq_time,satellite,daynight\n11.7753,78.2093,35.4,h,2026-08-21,0430,VIIRS/SNPP,D\n"
    parsed = connector.parse(sample_csv)
    assert len(parsed) == 1
    signals = connector.normalize(parsed)
    assert len(signals) == 1
    sig = signals[0]
    assert sig.source == "NASA_FIRMS"
    assert sig.source_type == "satellite_fire"
    assert sig.event_type == "Fire"
    assert sig.severity == "high"
    assert sig.is_near_real_time is True
    assert sig.metadata["frp_mw"] == 35.4
