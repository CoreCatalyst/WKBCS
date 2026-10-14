"""
SMS Gateway Factory & Manager
Provides unified access to the active SMS provider (MSG91 or Mock).
"""

from typing import Dict, Any, Optional
from app.integrations.sms.base import BaseSMSProvider
from app.integrations.sms.msg91_provider import MSG91Provider
from app.integrations.sms.mock_provider import MockSMSProvider
from app.core.config import settings

class SMSManager:
    _provider_cache: Optional[BaseSMSProvider] = None

    @classmethod
    def get_provider(cls) -> BaseSMSProvider:
        if cls._provider_cache is not None:
            return cls._provider_cache

        provider_name = (settings.SMS_PROVIDER or "msg91").lower().strip()
        if provider_name == "msg91":
            cls._provider_cache = MSG91Provider()
        else:
            cls._provider_cache = MockSMSProvider()

        return cls._provider_cache

    @classmethod
    async def dispatch_otp(
        cls,
        phone_number: str,
        otp_code: str,
        ttl_minutes: int = 5
    ) -> Dict[str, Any]:
        """
        Dispatches OTP through configured SMS provider.
        In local development with DEV_MODE_OTP=true, allows local preview without requiring live balance.
        """
        provider = cls.get_provider()
        return await provider.send_otp(
            phone_number=phone_number,
            otp_code=otp_code,
            ttl_minutes=ttl_minutes
        )

sms_manager = SMSManager()
