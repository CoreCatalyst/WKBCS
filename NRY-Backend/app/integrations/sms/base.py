"""
Abstract SMS / OTP Provider Interface
Allows switching SMS gateways without altering authentication or business logic.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class BaseSMSProvider(ABC):
    @abstractmethod
    async def send_otp(
        self,
        phone_number: str,
        otp_code: str,
        template_id: Optional[str] = None,
        dlt_te_id: Optional[str] = None,
        ttl_minutes: int = 5
    ) -> Dict[str, Any]:
        """
        Dispatches an OTP to the given phone number.
        Returns a dictionary with status, message, and provider reference.
        Must never leak raw OTP code in external logs or public responses.
        """
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """Returns True if provider credentials and template IDs are fully configured."""
        pass
