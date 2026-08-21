from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import logging
from app.schemas.signal import UnifiedSignal

logger = logging.getLogger("resqfusion.connectors")

class DataConnector(ABC):
    """
    Abstract interface for external disaster intelligence data connectors.
    Every connector implements fetch(), parse(), and normalize() returning List[UnifiedSignal].
    """
    def __init__(self, name: str, source_type: str, enabled: bool = True):
        self.name = name
        self.source_type = source_type
        self.enabled = enabled
        
        # Operational health & status tracking
        self.status = "INITIALIZING" # "CONNECTED", "DEGRADED", "ERROR", "DEMO_FALLBACK", "DISABLED"
        self.last_successful_fetch: Optional[datetime] = None
        self.last_error: Optional[str] = None
        self.total_signals_ingested: int = 0
        self.last_signal_time: Optional[datetime] = None

    @abstractmethod
    async def fetch(self) -> Any:
        """Fetch raw payload from external provider API or feed."""
        pass

    @abstractmethod
    def parse(self, raw_data: Any) -> List[Dict[str, Any]]:
        """Parse raw provider data into structured item dictionaries."""
        pass

    @abstractmethod
    def normalize(self, parsed_items: List[Dict[str, Any]]) -> List[UnifiedSignal]:
        """Convert parsed items into standardized UnifiedSignal objects."""
        pass

    async def ingest(self) -> List[UnifiedSignal]:
        """
        Execute full lifecycle: fetch -> parse -> normalize with unified error handling and telemetry.
        """
        if not self.enabled:
            self.status = "DISABLED"
            return []

        try:
            raw = await self.fetch()
            parsed = self.parse(raw)
            signals = self.normalize(parsed)
            
            self.status = "CONNECTED"
            self.last_successful_fetch = datetime.now(timezone.utc)
            self.last_error = None
            if signals:
                self.total_signals_ingested += len(signals)
                self.last_signal_time = max(s.timestamp for s in signals)
            
            return signals

        except Exception as e:
            logger.error(f"[{self.name}] Error during connector ingestion: {e}", exc_info=True)
            self.status = "ERROR"
            self.last_error = str(e)
            
            # Fallback to deterministic demo signals if live fails or is in fallback mode
            demo_signals = self.get_demo_signals()
            if demo_signals:
                self.status = "DEMO_FALLBACK"
                return demo_signals
            return []

    def get_demo_signals(self) -> List[UnifiedSignal]:
        """Optional mock signals used when live network or API keys are unavailable."""
        return []

    def get_status_summary(self) -> Dict[str, Any]:
        """Returns structured status for admin /api/data-sources dashboard."""
        return {
            "source": self.name,
            "source_type": self.source_type,
            "enabled": self.enabled,
            "status": self.status,
            "last_successful_fetch": self.last_successful_fetch.isoformat() if self.last_successful_fetch else None,
            "last_error": self.last_error,
            "total_signals_ingested": self.total_signals_ingested,
            "last_signal_time": self.last_signal_time.isoformat() if self.last_signal_time else None
        }
