"""
Mock SMS Provider for Local Development & Automated Testing
"""

import logging
from typing import Dict, Any, Optional
from app.integrations.sms.base import BaseSMSProvider

logger = logging.getLogger("noryvanta.sms.mock")

class MockSMSProvider(BaseSMSProvider):
    def is_configured(self) -> bool:
        return True

    async def send_otp(
        self,
        phone_number: str,
        otp_code: str,
        template_id: Optional[str] = None,
        dlt_te_id: Optional[str] = None,
        ttl_minutes: int = 5
    ) -> Dict[str, Any]:
        masked = phone_number[:2] + "****" + phone_number[-4:] if len(phone_number) >= 6 else "****"
        logger.info(f"[MockSMS] Simulated OTP delivery to {masked} (TTL: {ttl_minutes}m).")
        return {
            "success": True,
            "provider": "mock",
            "configured": True,
            "delivery_status": "MOCK_SENT"
        }
