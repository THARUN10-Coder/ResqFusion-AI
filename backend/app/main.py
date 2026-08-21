from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
import uuid

from app.core.config import settings
from app.db.session import engine, Base, SessionLocal
from app.models import Report, Incident, Conflict, User
from app.api import reports, incidents, analytics, resources, simulator, ws, sources
from app.ingestion.service import IngestionService

# Initialize database tables
Base.metadata.create_all(bind=engine)

def seed_initial_demo_data():
    db = SessionLocal()
    try:
        # Check if reseed or rich dataset expansion is needed
        existing_count = db.query(Incident).count()
        if existing_count < 14:
            print("Seeding rich multi-disaster dataset across varied regions of Tamil Nadu & India...")
            db.query(Conflict).delete()
            db.query(Report).delete()
            db.query(Incident).delete()
            db.commit()

            now = datetime.now(timezone.utc)

            incidents_data = [
                Incident(
                    id="INC-TN-024",
                    title="Flood: Trapped Civilians in Velachery Residential Basin",
                    disaster_type="Flood",
                    location_name="Velachery Main Rd, Chennai",
                    latitude=12.9754,
                    longitude=80.2206,
                    severity="critical",
                    priority=96.5,
                    confidence=0.95,
                    people_affected=48,
                    medical_need="urgent",
                    status="In Progress",
                    assigned_team="NDRF Battalion 4",
                    source_count=5,
                    required_resources=[
                        {"type": "NDRF Rescue Boats", "count": 6, "status": "dispatched"},
                        {"type": "Ambulance", "count": 3, "status": "dispatched"},
                        {"type": "Food & Water Kits", "count": 150, "status": "pending"},
                        {"type": "Medical Kit", "count": 25, "status": "pending"}
                    ],
                    xai_explanation="Ranked #1 Critical Priority (Score: 96.5/100) due to 48 civilians trapped under 5.5ft rapid water rise, multiple elderly insulin-dependent individuals, corroborated across 5 independent multi-tier sources.",
                    xai_breakdown={
                        "narrative_explanation": "Incident INC-TN-024 is ranked #1 priority due to 48 people trapped, urgent medical need, and 5 multi-channel corroborations.",
                        "key_factors": ["Critical severity classification", "48 people reported trapped", "Urgent medical assistance required", "Multi-channel corroboration (Official, Citizen, Drone)", "Fast-rising flood waters"],
                        "rank": 1,
                        "priority_score": 96.5,
                        "confidence_score": 95
                    },
                    created_at=now - timedelta(minutes=45),
                    updated_at=now - timedelta(minutes=5)
                ),
                Incident(
                    id="INC-TN-042",
                    title="Cyclone: Severe Coastal Surge & Power Grid Destruction",
                    disaster_type="Cyclone",
                    location_name="Silver Beach & Port Area, Cuddalore",
                    latitude=11.7480,
                    longitude=79.7714,
                    severity="critical",
                    priority=93.0,
                    confidence=0.92,
                    people_affected=135,
                    medical_need="urgent",
                    status="In Progress",
                    assigned_team="Coastal Air Wing & SDRF",
                    source_count=4,
                    required_resources=[
                        {"type": "High-Capacity Generators", "count": 8, "status": "dispatched"},
                        {"type": "Emergency Food Supply", "count": 350, "status": "pending"},
                        {"type": "Medical Tents", "count": 6, "status": "pending"},
                        {"type": "Inflatable Rescue Rafts", "count": 8, "status": "dispatched"}
                    ],
                    xai_explanation="Ranked #2 Priority (Score: 93.0/100): Severe 115 km/h wind gusts caused tidal surge in fishing hamlets, leaving 135 fishermen stranded without power or fresh water.",
                    xai_breakdown={
                        "narrative_explanation": "Severe storm surge in Cuddalore coast isolating 135 individuals with downed 110kV power lines and saline flooding.",
                        "key_factors": ["Category-2 cyclone landfall", "135 people isolated", "Infrastructure power blackout", "Tidal inundation"],
                        "rank": 2,
                        "priority_score": 93.0,
                        "confidence_score": 92
                    },
                    created_at=now - timedelta(minutes=70),
                    updated_at=now - timedelta(minutes=10)
                ),
                Incident(
                    id="INC-TN-055",
                    title="Infrastructure: Multi-Storey Commercial Complex Collapse",
                    disaster_type="Infrastructure",
                    location_name="Gandhipuram Cross Cut Road, Coimbatore",
                    latitude=11.0168,
                    longitude=76.9558,
                    severity="critical",
                    priority=89.5,
                    confidence=0.89,
                    people_affected=22,
                    medical_need="urgent",
                    status="In Progress",
                    assigned_team="Fire & Rescue Brigade Unit 1",
                    source_count=4,
                    required_resources=[
                        {"type": "Hydraulic Jack & Cutters", "count": 6, "status": "dispatched"},
                        {"type": "Canine Search Squad", "count": 3, "status": "dispatched"},
                        {"type": "Trauma Ambulances", "count": 5, "status": "dispatched"},
                        {"type": "Life Detectors", "count": 4, "status": "pending"}
                    ],
                    xai_explanation="Ranked #3 Priority (Score: 89.5/100): Partial structural failure during renovation trapping estimated 22 workers in lower basement. Acoustic sensors detected viable life signals.",
                    xai_breakdown={
                        "narrative_explanation": "Building collapse in dense commercial zone with confirmed live signals beneath concrete slab rubble.",
                        "key_factors": ["22 persons trapped under debris", "Urgent trauma surgical care needed", "Heavy hydraulic extraction active", "Acoustic life verification"],
                        "rank": 3,
                        "priority_score": 89.5,
                        "confidence_score": 89
                    },
                    created_at=now - timedelta(minutes=55),
                    updated_at=now - timedelta(minutes=8)
                ),
                Incident(
                    id="INC-TN-031",
                    title="Earthquake: Mountain Landslide & Highway Blockade",
                    disaster_type="Earthquake",
                    location_name="Ooty-Mettupalayam Ghat Rd, Nilgiris",
                    latitude=11.3400,
                    longitude=76.7900,
                    severity="high",
                    priority=85.0,
                    confidence=0.88,
                    people_affected=32,
                    medical_need="yes",
                    status="Verified",
                    assigned_team="State Disaster Response Force Unit 3",
                    source_count=3,
                    required_resources=[
                        {"type": "Earth Movers / Heavy JCB", "count": 5, "status": "dispatched"},
                        {"type": "Mountain Rescue Team", "count": 3, "status": "dispatched"},
                        {"type": "First Aid Mobile Vans", "count": 3, "status": "pending"}
                    ],
                    xai_explanation="Ranked #4 Priority (Score: 85.0/100): Massive boulder slip blocking the primary arterial ghat highway at hairpin 9, stranding 9 vehicles and 32 passengers.",
                    xai_breakdown={
                        "narrative_explanation": "Landslide triggered by tremors and monsoon downpour blocking Nilgiris ghat highway.",
                        "key_factors": ["Arterial route blockade", "32 stranded passengers", "Risk of secondary slope failure"],
                        "rank": 4,
                        "priority_score": 85.0,
                        "confidence_score": 88
                    },
                    created_at=now - timedelta(minutes=110),
                    updated_at=now - timedelta(minutes=20)
                ),
                Incident(
                    id="INC-TN-019",
                    title="Fire: Chemical Plant Storage Explosion & Toxic Plume",
                    disaster_type="Fire",
                    location_name="SIPCOT Industrial Park, Sriperumbudur",
                    latitude=12.9674,
                    longitude=79.9455,
                    severity="high",
                    priority=79.0,
                    confidence=0.76,
                    people_affected=18,
                    medical_need="yes",
                    status="In Progress",
                    assigned_team="Hazmat Response Team & Industrial Fire Squad",
                    source_count=4,
                    required_resources=[
                        {"type": "Hazmat Foam Tenders", "count": 5, "status": "dispatched"},
                        {"type": "Air Quality Mobile Units", "count": 3, "status": "dispatched"},
                        {"type": "Oxygen Respirators", "count": 80, "status": "pending"}
                    ],
                    xai_explanation="Ranked #5 Priority (Score: 79.0/100): Chemical solvent explosion with conflicting perimeter toxicity reports. Hazmat teams active on boundary containment.",
                    xai_breakdown={
                        "narrative_explanation": "Industrial solvent fire with conflicting reports on gas toxicity. Hazmat protocol enacted.",
                        "key_factors": ["Toxic chemical risk", "Contradictory claims flagged", "Industrial proximity containment"],
                        "rank": 5,
                        "priority_score": 79.0,
                        "confidence_score": 76
                    },
                    created_at=now - timedelta(minutes=130),
                    updated_at=now - timedelta(minutes=15)
                ),
                Incident(
                    id="INC-TN-063",
                    title="Flood: Vaigai River Overflow & Temple Submersion",
                    disaster_type="Flood",
                    location_name="Goripalayam Causeway, Madurai",
                    latitude=9.9252,
                    longitude=78.1198,
                    severity="high",
                    priority=74.5,
                    confidence=0.87,
                    people_affected=42,
                    medical_need="no",
                    status="Verified",
                    assigned_team="Madurai Quick Response Force",
                    source_count=3,
                    required_resources=[
                        {"type": "Rescue Inflatable Rafts", "count": 4, "status": "dispatched"},
                        {"type": "Evacuation Busses", "count": 6, "status": "pending"},
                        {"type": "Emergency Food Supply", "count": 200, "status": "pending"}
                    ],
                    xai_explanation="Ranked #6 Priority (Score: 74.5/100): Vaigai river discharge breached floodwalls, inundating low-lying residential streets in Goripalayam. 42 families under evacuation.",
                    xai_breakdown={
                        "narrative_explanation": "River level spike triggering proactive evacuation for 42 families along northern river bank.",
                        "key_factors": ["River embankment breach", "42 displaced residents", "Low casualty risk"],
                        "rank": 6,
                        "priority_score": 74.5,
                        "confidence_score": 87
                    },
                    created_at=now - timedelta(minutes=95),
                    updated_at=now - timedelta(minutes=25)
                ),
                Incident(
                    id="INC-TN-078",
                    title="Cyclone: Port Vessel Collision & Oil Containment",
                    disaster_type="Cyclone",
                    location_name="V.O. Chidambaranar Port, Tuticorin",
                    latitude=8.7642,
                    longitude=78.1348,
                    severity="medium",
                    priority=64.0,
                    confidence=0.85,
                    people_affected=8,
                    medical_need="no",
                    status="In Progress",
                    assigned_team="Coast Guard Interceptor Unit",
                    source_count=3,
                    required_resources=[
                        {"type": "Oil Containment Booms", "count": 10, "status": "dispatched"},
                        {"type": "Tug Boats", "count": 3, "status": "dispatched"}
                    ],
                    xai_explanation="Ranked #7 Priority (Score: 64.0/100): Gale winds caused unmoored cargo barge to drift into harbor channel with localized fuel spillage.",
                    xai_breakdown={
                        "narrative_explanation": "Maritime incident caused by cyclone gusts; environmental cleanup and salvage underway.",
                        "key_factors": ["Harbor navigational hazard", "Fuel containment required", "8 crew safe"],
                        "rank": 7,
                        "priority_score": 64.0,
                        "confidence_score": 85
                    },
                    created_at=now - timedelta(minutes=150),
                    updated_at=now - timedelta(minutes=35)
                ),
                Incident(
                    id="INC-TN-089",
                    title="Fire: Forest Brushfire Threatening Hill Sanctuary",
                    disaster_type="Fire",
                    location_name="Yercaud Ghat Section 7, Salem",
                    latitude=11.7753,
                    longitude=78.2093,
                    severity="medium",
                    priority=59.0,
                    confidence=0.81,
                    people_affected=0,
                    medical_need="no",
                    status="New",
                    assigned_team=None,
                    source_count=2,
                    required_resources=[
                        {"type": "Helicopter Water Droppers", "count": 2, "status": "pending"},
                        {"type": "Forest Fire Squads", "count": 5, "status": "pending"}
                    ],
                    xai_explanation="Ranked #8 Priority (Score: 59.0/100): Dry weather brushfire spreading across 55 acres of Eastern Ghats reserve forest.",
                    xai_breakdown={
                        "narrative_explanation": "Wildfire detected by thermal sensors spreading toward tourist road; firebreaks being cleared.",
                        "key_factors": ["Wildlife habitat risk", "Forest firebreak deployment", "Zero direct human casualties"],
                        "rank": 8,
                        "priority_score": 59.0,
                        "confidence_score": 81
                    },
                    created_at=now - timedelta(minutes=180),
                    updated_at=now - timedelta(minutes=40)
                ),
                Incident(
                    id="INC-TN-094",
                    title="Medical: Mass Heatstroke & Dehydration Outbreak at Festival",
                    disaster_type="Medical",
                    location_name="Meenakshi Amman Temple Perimeter, Madurai",
                    latitude=9.9195,
                    longitude=78.1193,
                    severity="high",
                    priority=77.5,
                    confidence=0.91,
                    people_affected=54,
                    medical_need="urgent",
                    status="Assigned",
                    assigned_team="108 Emergency Ambulance Corps",
                    source_count=3,
                    required_resources=[
                        {"type": "Ambulance", "count": 6, "status": "dispatched"},
                        {"type": "ORS & Hydration Packs", "count": 500, "status": "pending"},
                        {"type": "Mobile Cooling Tents", "count": 4, "status": "dispatched"}
                    ],
                    xai_explanation="Ranked #9 Priority (Score: 77.5/100): Severe heatwave spike (42°C) causing multiple collapses among large religious procession gathering.",
                    xai_breakdown={
                        "narrative_explanation": "Mass heat illness requiring field triage and rapid electrolyte replenishment.",
                        "key_factors": ["54 heat exhaustion cases", "Urgent medical IV hydration needed", "Crowd density containment"],
                        "rank": 9,
                        "priority_score": 77.5,
                        "confidence_score": 91
                    },
                    created_at=now - timedelta(minutes=60),
                    updated_at=now - timedelta(minutes=12)
                ),
                Incident(
                    id="INC-TN-102",
                    title="Infrastructure: High-Voltage Transmission Tower Collapse",
                    disaster_type="Infrastructure",
                    location_name="Ennore Thermal Corridor, North Chennai",
                    latitude=13.2084,
                    longitude=80.3225,
                    severity="high",
                    priority=71.0,
                    confidence=0.86,
                    people_affected=0,
                    medical_need="no",
                    status="In Progress",
                    assigned_team="TANGEDCO Emergency Grid Restoration Team",
                    source_count=2,
                    required_resources=[
                        {"type": "Heavy Crane (50 Ton)", "count": 2, "status": "dispatched"},
                        {"type": "High-Capacity Generators", "count": 4, "status": "pending"}
                    ],
                    xai_explanation="Ranked #10 Priority (Score: 71.0/100): 230kV transmission pylon collapsed into wetland canal causing localized outage for 60,000 households.",
                    xai_breakdown={
                        "narrative_explanation": "Critical power transmission pylon structural failure impacting regional substation feeds.",
                        "key_factors": ["Power grid disruption", "No direct human casualties", "Industrial corridor impact"],
                        "rank": 10,
                        "priority_score": 71.0,
                        "confidence_score": 86
                    },
                    created_at=now - timedelta(minutes=140),
                    updated_at=now - timedelta(minutes=30)
                ),
                Incident(
                    id="INC-TN-115",
                    title="Flood: Railway Underpass Flash Inundation & Bus Trapped",
                    disaster_type="Flood",
                    location_name="Thillai Nagar Underpass, Tiruchirappalli",
                    latitude=10.8228,
                    longitude=78.6874,
                    severity="high",
                    priority=81.0,
                    confidence=0.90,
                    people_affected=24,
                    medical_need="yes",
                    status="In Progress",
                    assigned_team="Trichy City Fire & Rescue Unit",
                    source_count=3,
                    required_resources=[
                        {"type": "Rescue Boat", "count": 2, "status": "dispatched"},
                        {"type": "Ambulance", "count": 2, "status": "dispatched"},
                        {"type": "Heavy Submersible Water Pumps", "count": 4, "status": "pending"}
                    ],
                    xai_explanation="Ranked #11 Priority (Score: 81.0/100): State transport bus stranded in 4.5ft flash flood water inside railway underpass with 24 passengers aboard.",
                    xai_breakdown={
                        "narrative_explanation": "Flash flood entrapment in depressed transit subway with seniors requiring evacuation.",
                        "key_factors": ["24 passengers trapped in bus", "Rising drainage backflow", "Urgent extraction underway"],
                        "rank": 11,
                        "priority_score": 81.0,
                        "confidence_score": 90
                    },
                    created_at=now - timedelta(minutes=50),
                    updated_at=now - timedelta(minutes=5)
                ),
                Incident(
                    id="INC-TN-128",
                    title="Earthquake: Minor Tremors & Masonry Damage in Historic Fort",
                    disaster_type="Earthquake",
                    location_name="Vellore Fort & Jalakanteswarar Complex, Vellore",
                    latitude=12.9202,
                    longitude=79.1308,
                    severity="low",
                    priority=38.0,
                    confidence=0.82,
                    people_affected=0,
                    medical_need="no",
                    status="Verified",
                    assigned_team="ASI Structural Survey Squad",
                    source_count=2,
                    required_resources=[
                        {"type": "Structural Inspection Drone", "count": 1, "status": "dispatched"},
                        {"type": "Safety Barricades", "count": 20, "status": "pending"}
                    ],
                    xai_explanation="Ranked #12 Priority (Score: 38.0/100): Magnitude 3.4 tremor caused non-structural hairline cracks in outer rampart. Area cordoned off safely.",
                    xai_breakdown={
                        "narrative_explanation": "Low-intensity seismic tremor causing cosmetic hairline cracks to heritage structure without injuries.",
                        "key_factors": ["Low intensity tremor", "Zero injuries", "Precautionary cordoning active"],
                        "rank": 12,
                        "priority_score": 38.0,
                        "confidence_score": 82
                    },
                    created_at=now - timedelta(minutes=220),
                    updated_at=now - timedelta(minutes=90)
                ),
                Incident(
                    id="INC-TN-140",
                    title="Medical: Chlorine Gas Cylinder Leak at Water Treatment Plant",
                    disaster_type="Medical",
                    location_name="Kilpauk Water Works, Chennai",
                    latitude=13.0784,
                    longitude=80.2428,
                    severity="high",
                    priority=82.5,
                    confidence=0.89,
                    people_affected=16,
                    medical_need="urgent",
                    status="In Progress",
                    assigned_team="Chennai Hazmat Unit & 108 Fleet",
                    source_count=3,
                    required_resources=[
                        {"type": "Oxygen Respirators", "count": 40, "status": "dispatched"},
                        {"type": "Ambulance", "count": 4, "status": "dispatched"},
                        {"type": "Chemical Neutralizing Sprayers", "count": 2, "status": "dispatched"}
                    ],
                    xai_explanation="Ranked #13 Priority (Score: 82.5/100): Valve rupture released chlorine gas plume causing respiratory distress to 16 plant workers and nearby staff.",
                    xai_breakdown={
                        "narrative_explanation": "Toxic chlorine leak requiring emergency respiratory triage, evacuation, and plume neutralization.",
                        "key_factors": ["16 respiratory casualty cases", "Urgent medical oxygen needed", "Immediate plume containment"],
                        "rank": 13,
                        "priority_score": 82.5,
                        "confidence_score": 89
                    },
                    created_at=now - timedelta(minutes=35),
                    updated_at=now - timedelta(minutes=6)
                ),
                Incident(
                    id="INC-TN-155",
                    title="Flood: Cauvery Delta Canal Breach & Paddy Fields Inundation",
                    disaster_type="Flood",
                    location_name="Kallanai Grand Anicut, Thanjavur",
                    latitude=10.8336,
                    longitude=78.8197,
                    severity="medium",
                    priority=58.5,
                    confidence=0.88,
                    people_affected=15,
                    medical_need="no",
                    status="New",
                    assigned_team=None,
                    source_count=2,
                    required_resources=[
                        {"type": "Sandbag Delivery Trucks", "count": 8, "status": "pending"},
                        {"type": "Rescue Inflatable Rafts", "count": 2, "status": "pending"}
                    ],
                    xai_explanation="Ranked #14 Priority (Score: 58.5/100): Irrigation canal bund weakened by heavy inflow, water overflowing into 120 acres of paddy fields and 5 farmsteads.",
                    xai_breakdown={
                        "narrative_explanation": "Agricultural canal breach threatening crops and 5 farmstead families without immediate threat to life.",
                        "key_factors": ["Canal bund breach", "15 farmers safely relocated", "Agrarian economic impact"],
                        "rank": 14,
                        "priority_score": 58.5,
                        "confidence_score": 88
                    },
                    created_at=now - timedelta(minutes=160),
                    updated_at=now - timedelta(minutes=45)
                )
            ]

            db.add_all(incidents_data)
            db.commit()

            # Add Rich Reports
            reports_data = [
                Report(
                    id="REP-TN-101",
                    source="TNSDMA Official Alert",
                    source_type="official",
                    timestamp=now - timedelta(minutes=44),
                    latitude=12.9754,
                    longitude=80.2206,
                    raw_text="Official Alert: Severe flooding in Velachery residential areas. Citizens advised to move to higher floors.",
                    disaster_type="Flood",
                    severity="critical",
                    people_affected=0,
                    medical_need=False,
                    resource_requirements=["Rescue Boat"],
                    confidence=0.95,
                    incident_id="INC-TN-024"
                ),
                Report(
                    id="REP-TN-105",
                    source="Citizen #4092 (Verified)",
                    source_type="verified_citizen",
                    timestamp=now - timedelta(minutes=40),
                    latitude=12.9756,
                    longitude=80.2208,
                    raw_text="Over 40 people stuck in Ram Nagar, Velachery! Water level reached 5.5ft, children and senior citizens stranded!",
                    disaster_type="Flood",
                    severity="critical",
                    people_affected=48,
                    medical_need=True,
                    resource_requirements=["Rescue Boat", "NDRF Rescue Team", "Ambulance"],
                    confidence=0.88,
                    incident_id="INC-TN-024"
                ),
                Report(
                    id="REP-TN-107",
                    source="TNEB Local Substation Log",
                    source_type="agency",
                    timestamp=now - timedelta(minutes=35),
                    latitude=12.9750,
                    longitude=80.2202,
                    raw_text="Velachery 33kV substation shutdown due to water ingress. Power cut across wards 175-179.",
                    disaster_type="Flood",
                    severity="high",
                    people_affected=0,
                    medical_need=False,
                    resource_requirements=["High-Capacity Generators"],
                    confidence=0.92,
                    incident_id="INC-TN-024"
                ),
                Report(
                    id="REP-TN-109",
                    source="Citizen Drone Recon Recon-4",
                    source_type="verified_citizen",
                    timestamp=now - timedelta(minutes=20),
                    latitude=12.9758,
                    longitude=80.2210,
                    raw_text="Drone footage reveals 6 rooftop clusters with signaling cloths in Ram Nagar 3rd street.",
                    disaster_type="Flood",
                    severity="critical",
                    people_affected=30,
                    medical_need=True,
                    resource_requirements=["NDRF Rescue Boats", "Life Jackets"],
                    confidence=0.93,
                    incident_id="INC-TN-024"
                ),
                Report(
                    id="REP-TN-120",
                    source="IMD Cyclone Warning Centre",
                    source_type="official",
                    timestamp=now - timedelta(minutes=68),
                    latitude=11.7480,
                    longitude=79.7714,
                    raw_text="Red Cyclone Warning: Cuddalore coastal surge exceeding 2.8 meters. Complete power grid blackout in coastal taluks.",
                    disaster_type="Cyclone",
                    severity="critical",
                    people_affected=135,
                    medical_need=True,
                    resource_requirements=["Emergency Food Supply", "High-Capacity Generators"],
                    confidence=0.98,
                    incident_id="INC-TN-042"
                ),
                Report(
                    id="REP-TN-122",
                    source="Cuddalore Fishermen Cooperative",
                    source_type="verified_citizen",
                    timestamp=now - timedelta(minutes=55),
                    latitude=11.7475,
                    longitude=79.7720,
                    raw_text="Seawater entered 60 thatched huts near Silver Beach. 135 people relocated to community hall, need dry food and drinking water.",
                    disaster_type="Cyclone",
                    severity="critical",
                    people_affected=135,
                    medical_need=False,
                    resource_requirements=["Emergency Food Supply", "Drinking Water Units"],
                    confidence=0.86,
                    incident_id="INC-TN-042"
                ),
                Report(
                    id="REP-TN-124",
                    source="Highways Patrol Nilgiris",
                    source_type="agency",
                    timestamp=now - timedelta(minutes=108),
                    latitude=11.3400,
                    longitude=76.7900,
                    raw_text="Severe rockslide at 9th hairpin bend Ooty ghat. Multiple vehicles trapped between boulders.",
                    disaster_type="Earthquake",
                    severity="high",
                    people_affected=32,
                    medical_need=True,
                    resource_requirements=["Earth Movers / Heavy JCB"],
                    confidence=0.92,
                    incident_id="INC-TN-031"
                ),
                Report(
                    id="REP-TN-126",
                    source="Nilgiris District Police Control",
                    source_type="official",
                    timestamp=now - timedelta(minutes=90),
                    latitude=11.3405,
                    longitude=76.7912,
                    raw_text="Traffic halted completely on ghat section. 9 private cars and 1 bus stranded safely between milestone 14 and 16.",
                    disaster_type="Earthquake",
                    severity="high",
                    people_affected=32,
                    medical_need=False,
                    resource_requirements=["Earth Movers / Heavy JCB", "First Aid Mobile Vans"],
                    confidence=0.94,
                    incident_id="INC-TN-031"
                ),
                Report(
                    id="REP-TN-135",
                    source="Coimbatore City Police Dispatch",
                    source_type="agency",
                    timestamp=now - timedelta(minutes=53),
                    latitude=11.0168,
                    longitude=76.9558,
                    raw_text="Emergency Dispatch: 4-storey commercial shopping complex collapse in Gandhipuram. Immediate SAR team required.",
                    disaster_type="Infrastructure",
                    severity="critical",
                    people_affected=22,
                    medical_need=True,
                    resource_requirements=["Hydraulic Jack & Cutters", "Canine Search Squad"],
                    confidence=0.94,
                    incident_id="INC-TN-055"
                ),
                Report(
                    id="REP-TN-138",
                    source="Coimbatore Medical College Hospital (CMCH) Triage",
                    source_type="official",
                    timestamp=now - timedelta(minutes=30),
                    latitude=11.0172,
                    longitude=76.9562,
                    raw_text="Green corridor activated for Gandhipuram collapse victims. 5 trauma ambulances dispatched.",
                    disaster_type="Infrastructure",
                    severity="critical",
                    people_affected=22,
                    medical_need=True,
                    resource_requirements=["Trauma Ambulances"],
                    confidence=0.96,
                    incident_id="INC-TN-055"
                ),
                Report(
                    id="REP-TN-142",
                    source="Madurai District Collectorate",
                    source_type="official",
                    timestamp=now - timedelta(minutes=92),
                    latitude=9.9252,
                    longitude=78.1198,
                    raw_text="Vaigai dam discharge increased to 25,000 cusecs. Low level causeway at Goripalayam flooded.",
                    disaster_type="Flood",
                    severity="high",
                    people_affected=42,
                    medical_need=False,
                    resource_requirements=["Rescue Inflatable Rafts"],
                    confidence=0.93,
                    incident_id="INC-TN-063"
                ),
                Report(
                    id="REP-TN-150",
                    source="Tuticorin Port Trust",
                    source_type="agency",
                    timestamp=now - timedelta(minutes=148),
                    latitude=8.7642,
                    longitude=78.1348,
                    raw_text="Barge broke loose under 45 knot gusts colliding with outer breakwater. Deploying containment booms.",
                    disaster_type="Cyclone",
                    severity="medium",
                    people_affected=8,
                    medical_need=False,
                    resource_requirements=["Oil Containment Booms"],
                    confidence=0.88,
                    incident_id="INC-TN-078"
                ),
                Report(
                    id="REP-TN-161",
                    source="Salem District Forest Office",
                    source_type="official",
                    timestamp=now - timedelta(minutes=175),
                    latitude=11.7753,
                    longitude=78.2093,
                    raw_text="Forest fire spreading across Yercaud ghat reserve slopes. Forest teams and water tankers deployed.",
                    disaster_type="Fire",
                    severity="medium",
                    people_affected=0,
                    medical_need=False,
                    resource_requirements=["Forest Fire Squads"],
                    confidence=0.90,
                    incident_id="INC-TN-089"
                ),
                Report(
                    id="REP-TN-170",
                    source="Madurai 108 Emergency Control",
                    source_type="official",
                    timestamp=now - timedelta(minutes=58),
                    latitude=9.9195,
                    longitude=78.1193,
                    raw_text="Mass casualty alert: Over 50 devotees collapsed due to severe heat exhaustion and dehydration around temple chariot route.",
                    disaster_type="Medical",
                    severity="high",
                    people_affected=54,
                    medical_need=True,
                    resource_requirements=["Ambulance", "ORS & Hydration Packs"],
                    confidence=0.95,
                    incident_id="INC-TN-094"
                ),
                Report(
                    id="REP-TN-180",
                    source="TANGEDCO Grid Operations",
                    source_type="agency",
                    timestamp=now - timedelta(minutes=135),
                    latitude=13.2084,
                    longitude=80.3225,
                    raw_text="Tower #42 on 230kV Ennore-Manali feeder buckled. Emergency load shedding in effect.",
                    disaster_type="Infrastructure",
                    severity="high",
                    people_affected=0,
                    medical_need=False,
                    resource_requirements=["Heavy Crane (50 Ton)"],
                    confidence=0.93,
                    incident_id="INC-TN-102"
                ),
                Report(
                    id="REP-TN-190",
                    source="Trichy Fire Control Room",
                    source_type="official",
                    timestamp=now - timedelta(minutes=48),
                    latitude=10.8228,
                    longitude=78.6874,
                    raw_text="TNSTC bus trapped in flooded Thillai Nagar underpass. 24 passengers including 6 children on vehicle roof.",
                    disaster_type="Flood",
                    severity="high",
                    people_affected=24,
                    medical_need=True,
                    resource_requirements=["Rescue Boat", "Ambulance"],
                    confidence=0.95,
                    incident_id="INC-TN-115"
                ),
                Report(
                    id="REP-TN-195",
                    source="Citizen Video Upload @TrichyLive",
                    source_type="verified_citizen",
                    timestamp=now - timedelta(minutes=42),
                    latitude=10.8230,
                    longitude=78.6872,
                    raw_text="Water reaching windows of the bus! Rescue team boat just arrived.",
                    disaster_type="Flood",
                    severity="high",
                    people_affected=24,
                    medical_need=False,
                    resource_requirements=["Rescue Boat"],
                    confidence=0.85,
                    incident_id="INC-TN-115"
                ),
                Report(
                    id="REP-TN-200",
                    source="National Seismological Centre (NCS)",
                    source_type="official",
                    timestamp=now - timedelta(minutes=215),
                    latitude=12.9202,
                    longitude=79.1308,
                    raw_text="M3.4 Earthquake recorded with epicenter 14km SW of Vellore, depth 10km.",
                    disaster_type="Earthquake",
                    severity="low",
                    people_affected=0,
                    medical_need=False,
                    resource_requirements=["Structural Inspection Drone"],
                    confidence=0.98,
                    incident_id="INC-TN-128"
                ),
                Report(
                    id="REP-TN-210",
                    source="Chennai Metro Water Operations",
                    source_type="official",
                    timestamp=now - timedelta(minutes=33),
                    latitude=13.0784,
                    longitude=80.2428,
                    raw_text="Emergency: Minor chlorine dosing cylinder valve failure at Kilpauk headworks. Immediate containment protocol initiated.",
                    disaster_type="Medical",
                    severity="high",
                    people_affected=16,
                    medical_need=True,
                    resource_requirements=["Oxygen Respirators", "Chemical Neutralizing Sprayers"],
                    confidence=0.96,
                    incident_id="INC-TN-140"
                ),
                Report(
                    id="REP-TN-215",
                    source="Kilpauk Resident Association",
                    source_type="verified_citizen",
                    timestamp=now - timedelta(minutes=28),
                    latitude=13.0786,
                    longitude=80.2432,
                    raw_text="Pungent chemical smell in neighborhood, people coughing. Ambulances arriving on scene.",
                    disaster_type="Medical",
                    severity="high",
                    people_affected=16,
                    medical_need=True,
                    resource_requirements=["Oxygen Respirators", "Ambulance"],
                    confidence=0.87,
                    incident_id="INC-TN-140"
                ),
                Report(
                    id="REP-TN-220",
                    source="Thanjavur PWD Irrigation Wing",
                    source_type="official",
                    timestamp=now - timedelta(minutes=155),
                    latitude=10.8336,
                    longitude=78.8197,
                    raw_text="Right main canal bund breach at chainage 4.2km. Flow diverted to surplus weir.",
                    disaster_type="Flood",
                    severity="medium",
                    people_affected=15,
                    medical_need=False,
                    resource_requirements=["Sandbag Delivery Trucks"],
                    confidence=0.94,
                    incident_id="INC-TN-155"
                ),
                # Standalone unverified reports waiting for triage
                Report(
                    id="REP-TN-301",
                    source="Citizen Mobile App User #8129",
                    source_type="unverified_citizen",
                    timestamp=now - timedelta(minutes=15),
                    latitude=13.0827,
                    longitude=80.2707,
                    raw_text="Water logging in Perambur railway bridge subway, 2 feet deep, two wheelers getting stuck.",
                    disaster_type="Flood",
                    severity="low",
                    people_affected=0,
                    medical_need=False,
                    resource_requirements=["Drainage Pumps"],
                    confidence=0.65,
                    incident_id=None
                ),
                Report(
                    id="REP-TN-302",
                    source="Social Media Post @chennairains",
                    source_type="social",
                    timestamp=now - timedelta(minutes=10),
                    latitude=12.9249,
                    longitude=80.1000,
                    raw_text="Tree branch fallen on electricity wire in Tambaram Sanatorium road. Sparking seen!",
                    disaster_type="Infrastructure",
                    severity="medium",
                    people_affected=0,
                    medical_need=False,
                    resource_requirements=["TNEB Squad"],
                    confidence=0.50,
                    incident_id=None
                ),
                Report(
                    id="REP-TN-303",
                    source="Citizen SMS Helpline",
                    source_type="unverified_citizen",
                    timestamp=now - timedelta(minutes=8),
                    latitude=11.9416,
                    longitude=79.8083,
                    raw_text="Heavy rain in Puducherry border, requesting sandbags near lake bund.",
                    disaster_type="Flood",
                    severity="low",
                    people_affected=0,
                    medical_need=False,
                    resource_requirements=["Sandbags"],
                    confidence=0.62,
                    incident_id=None
                )
            ]

            db.add_all(reports_data)
            db.commit()

            # Seed Conflicts
            conf1 = Conflict(
                id="CONF-TN-001",
                incident_id="INC-TN-019",
                report_a_id="REP-TN-201",
                report_b_id="REP-TN-202",
                claim_a='[Social Media Post] "Toxic chemical gas is leaking everywhere! 50 affected."',
                claim_b='[Fire Department] "NO chemical leak detected. Fire contained to storage yard."',
                conflict_type="Chemical Leak Status",
                resolution_status="Unverified"
            )
            conf2 = Conflict(
                id="CONF-TN-002",
                incident_id="INC-TN-031",
                report_a_id="REP-TN-124",
                report_b_id="REP-TN-126",
                claim_a='[Social Media Post] "Entire mountain road collapsed into gorge, all vehicles fallen!"',
                claim_b='[Highways Patrol] "Only rockslide debris on pavement. Vehicles are intact and stationary on road."',
                conflict_type="Structural Integrity Claim",
                resolution_status="Unverified"
            )
            db.add_all([conf1, conf2])
            db.commit()

            # Seed Demo Users
            if db.query(User).count() == 0:
                u1 = User(id="USR-001", username="admin", role="admin", full_name="TNSDMA Commander")
                u2 = User(id="USR-002", username="responder", role="responder", full_name="NDRF Battalion 4")
                u3 = User(id="USR-003", username="citizen", role="citizen", full_name="Citizen Reporter")
                db.add_all([u1, u2, u3])
                db.commit()

            print("Database successfully seeded with 14 comprehensive multi-disaster incidents across Tamil Nadu!")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_initial_demo_data()
    # Start background ingestion schedulers for external feeds
    ingestion_service = IngestionService.get_instance()
    await ingestion_service.start_scheduler()
    yield
    # Stop background schedulers on shutdown
    await ingestion_service.stop_scheduler()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="ResQFusion AI - Full-Stack Disaster Intelligence & Response Platform",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(incidents.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(resources.router, prefix=settings.API_V1_STR)
app.include_router(sources.router, prefix=settings.API_V1_STR)
app.include_router(simulator.router, prefix=settings.API_V1_STR)
app.include_router(ws.router)

@app.get("/api/health", tags=["Health"])
def health_check():
    ingestion_service = IngestionService.get_instance()
    statuses = ingestion_service.get_connectors_status()
    
    connector_map = {}
    is_degraded = False
    for st in statuses:
        src = st["source"].lower()
        stat = st["status"].lower()
        connector_map[src] = stat
        if stat == "error":
            is_degraded = True

    return {
        "status": "degraded" if is_degraded else "healthy",
        "database": "connected",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "ai_provider": settings.AI_PROVIDER,
        "ai_key_configured": bool(settings.AI_API_KEY),
        "connectors": connector_map
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
