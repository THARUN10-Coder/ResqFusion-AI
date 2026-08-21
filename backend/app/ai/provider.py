from abc import ABC, abstractmethod
from typing import Dict, Any
import re
import json
from app.core.config import settings

class AIProvider(ABC):
    @abstractmethod
    def extract_entities(self, raw_text: str) -> Dict[str, Any]:
        """Extract structured disaster entities from text."""
        pass

    @abstractmethod
    def analyze_image(self, image_content: bytes, filename: str = "") -> Dict[str, Any]:
        """Analyze disaster images for damage, hazards, trapped individuals."""
        pass

class MockAIProvider(AIProvider):
    """
    Deterministic rule-based NLP and visual analytical provider.
    Ensures 100% functionality without external API keys.
    """
    def extract_entities(self, raw_text: str) -> Dict[str, Any]:
        text_lower = raw_text.lower()
        
        # Disaster Type detection
        disaster_type = "Flood"
        if any(w in text_lower for w in ["cyclone", "storm", "hurricane", "wind"]):
            disaster_type = "Cyclone"
        elif any(w in text_lower for w in ["earthquake", "quake", "tremor", "rubble"]):
            disaster_type = "Earthquake"
        elif any(w in text_lower for w in ["fire", "blaze", "smoke", "burning"]):
            disaster_type = "Fire"
        elif any(w in text_lower for w in ["bridge", "road", "landslide", "collapse"]):
            disaster_type = "Infrastructure"
        elif any(w in text_lower for w in ["medical", "doctor", "insulin", "heart", "bleeding"]):
            disaster_type = "Medical"

        # People count extraction
        people_found = 0
        numbers = re.findall(r'\b(\d+)\b', text_lower)
        if numbers:
            people_found = int(numbers[0])
        elif "trapped" in text_lower or "stranded" in text_lower or "stuck" in text_lower:
            people_found = 5

        # Medical urgency
        medical_need = any(w in text_lower for w in ["medical", "patient", "injury", "injured", "insulin", "doctor", "ambulance", "bleeding", "hospital"])

        # Resource Requirements
        resources = []
        if "trapped" in text_lower or "stranded" in text_lower or "flood" in text_lower or "water" in text_lower:
            resources.append("Rescue Team")
            resources.append("Rescue Boat")
        if medical_need:
            resources.append("Ambulance")
            resources.append("Medical Kit")
        if "food" in text_lower or "starving" in text_lower:
            resources.append("Food Rations")
        if "water" in text_lower or "drinking" in text_lower:
            resources.append("Drinking Water")
        if not resources:
            resources = ["Emergency Supply Kit"]

        # Severity Assessment
        severity = "medium"
        if people_found >= 10 or medical_need or "critical" in text_lower or "severe" in text_lower:
            severity = "critical"
        elif people_found > 3 or "urgent" in text_lower or "collapsed" in text_lower:
            severity = "high"
        elif "minor" in text_lower or "safe" in text_lower:
            severity = "low"

        return {
            "disaster_type": disaster_type,
            "severity": severity,
            "people_affected": people_found,
            "medical_need": medical_need,
            "resource_requirements": list(set(resources)),
            "extracted_entities": {
                "key_location": "School / Central District",
                "hazard_level": severity.upper(),
                "urgent_action_required": medical_need or (people_found > 0)
            },
            "confidence": 0.88,
            "ai_mode": "Deterministic Local AI (Demo Mode)"
        }

    def analyze_image(self, image_content: bytes, filename: str = "") -> Dict[str, Any]:
        fname_lower = filename.lower()
        
        # Default mock detection based on file context or generic pattern
        objects = ["Flooded Water", "Submerged Vehicles", "Damaged Roof"]
        structures = ["School Building", "Submerged Roadway"]
        disaster_type = "Flood"
        severity = "critical"
        road_blockage = True
        trapped_est = 6

        if "fire" in fname_lower:
            objects = ["Heavy Smoke", "Active Flames"]
            structures = ["Commercial Storefront"]
            disaster_type = "Fire"
            severity = "high"
            road_blockage = False
            trapped_est = 2
        elif "bridge" in fname_lower or "road" in fname_lower:
            objects = ["Debris", "Cracked Asphalt"]
            structures = ["Main Bridge Structure"]
            disaster_type = "Infrastructure"
            severity = "high"
            road_blockage = True
            trapped_est = 0

        return {
            "disaster_type": disaster_type,
            "severity": severity,
            "objects_detected": objects,
            "damaged_structures": structures,
            "road_blockage": road_blockage,
            "trapped_people_est": trapped_est,
            "confidence": 0.91,
            "ai_mode": "Deterministic Local Computer Vision (Demo Mode)"
        }

def get_ai_provider() -> AIProvider:
    provider_name = settings.AI_PROVIDER.lower()
    # If API key is missing or set to mock, always use MockAIProvider
    if provider_name == "mock" or not settings.AI_API_KEY:
        return MockAIProvider()
    
    # Ready for API integration if key exists
    return MockAIProvider()
