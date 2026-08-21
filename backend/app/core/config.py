try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
except ImportError:
    from pydantic import BaseSettings
    SettingsConfigDict = None

from typing import Optional
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "ResQFusion AI"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api"
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./resqfusion.db")
    
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "nvidia")  # "nvidia", "openai", "gemini", "mock"
    AI_API_KEY: Optional[str] = os.getenv("AI_API_KEY", "")
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "resqfusion-secret-key-2026")
    
    # Priority Scoring Configurable Default Weights (Normalized)
    WEIGHT_SEVERITY: float = 0.25
    WEIGHT_PEOPLE_AFFECTED: float = 0.20
    WEIGHT_MEDICAL_EMERGENCY: float = 0.20
    WEIGHT_RESOURCE_CRITICALITY: float = 0.15
    WEIGHT_CONFIDENCE: float = 0.10
    WEIGHT_RECENCY: float = 0.10

    # Source Reliability Defaults (Configurable baseline confidence weights)
    RELIABILITY_OFFICIAL_ALERT: float = 0.95
    RELIABILITY_OFFICIAL_GLOBAL: float = 0.90
    RELIABILITY_EMERGENCY_AGENCY: float = 0.92
    RELIABILITY_SCIENTIFIC_SENSOR: float = 0.90
    RELIABILITY_SATELLITE_FIRE: float = 0.85
    RELIABILITY_VERIFIED_CITIZEN: float = 0.82
    RELIABILITY_UNVERIFIED_CITIZEN: float = 0.65
    RELIABILITY_SOCIAL_MEDIA: float = 0.50

    # Real-World External Data Feeds Configuration
    SACHET_ENABLED: bool = os.getenv("SACHET_ENABLED", "true").lower() == "true"
    SACHET_FEED_URL: str = os.getenv("SACHET_FEED_URL", "https://cap-sources.s3.amazonaws.com/in-imd-en/rss.xml")
    SACHET_POLL_SECONDS: int = int(os.getenv("SACHET_POLL_SECONDS", "120"))

    GDACS_ENABLED: bool = os.getenv("GDACS_ENABLED", "true").lower() == "true"
    GDACS_FEED_URL: str = os.getenv("GDACS_FEED_URL", "https://www.gdacs.org/xml/rss.xml")
    GDACS_POLL_SECONDS: int = int(os.getenv("GDACS_POLL_SECONDS", "300"))

    FIRMS_ENABLED: bool = os.getenv("FIRMS_ENABLED", "true").lower() == "true"
    FIRMS_MAP_KEY: Optional[str] = os.getenv("FIRMS_MAP_KEY", "")
    FIRMS_REGION: str = os.getenv("FIRMS_REGION", "76,8,81,14") # South India bbox
    FIRMS_POLL_SECONDS: int = int(os.getenv("FIRMS_POLL_SECONDS", "600"))

    USGS_ENABLED: bool = os.getenv("USGS_ENABLED", "true").lower() == "true"
    USGS_FEED_URL: str = os.getenv("USGS_FEED_URL", "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson")
    USGS_POLL_SECONDS: int = int(os.getenv("USGS_POLL_SECONDS", "120"))

    if SettingsConfigDict:
        model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore")
    else:
        class Config:
            env_file = ".env"
            case_sensitive = True

settings = Settings()
