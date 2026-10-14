"""
MSG91 SMS Gateway Provider for Indian Mobile Numbers
DLT-compliant transactional OTP delivery integration.
"""

import httpx
import logging
from typing import Dict, Any, Optional
from app.integrations.sms.base import BaseSMSProvider
from app.core.config import settings

logger = logging.getLogger("noryvanta.sms.msg91")

class MSG91Provider(BaseSMSProvider):
    def __init__(self):
        self.auth_key = settings.MSG91_AUTH_KEY
        self.sender_id = settings.MSG91_SENDER_ID
        self.template_id = settings.MSG91_TEMPLATE_ID
        self.dlt_te_id = settings.MSG91_DLT_TE_ID
        self.route = settings.MSG91_ROUTE
        self.base_url = "https://control.msg91.com/api/v5"

    def is_configured(self) -> bool:
        return bool(
            self.auth_key
            and self.auth_key.strip()
            and not self.auth_key.startswith("mock")
            and self.template_id
            and self.template_id.strip()
        )

    def _normalize_indian_mobile(self, phone: str) -> str:
        """
        Normalizes Indian phone numbers for MSG91 API:
        Strips '+', '-', spaces; prepends '91' for 10-digit mobile numbers.
        """
        clean = "".join(ch for ch in phone if ch.isdigit())
        if len(clean) == 10:
            return f"91{clean}"
        if clean.startswith("0") and len(clean) == 11:
            return f"91{clean[1:]}"
        return clean

    def _mask_phone(self, phone: str) -> str:
        if len(phone) >= 6:
            return phone[:2] + "****" + phone[-4:]
        return "****"

    async def send_otp(
        self,
        phone_number: str,
        otp_code: str,
        template_id: Optional[str] = None,
        dlt_te_id: Optional[str] = None,
        ttl_minutes: int = 5
    ) -> Dict[str, Any]:
        """
        Dispatches OTP via MSG91 Send OTP API.
        Never logs or exposes the OTP code.
        """
        normalized_phone = self._normalize_indian_mobile(phone_number)
        masked_phone = self._mask_phone(normalized_phone)

        if not self.is_configured():
            logger.warning(
                f"[MSG91] Provider credentials unconfigured. Skipping live dispatch to {masked_phone}."
            )
            return {
                "success": False,
                "provider": "msg91",
                "configured": False,
                "message": "MSG91 SMS gateway is not configured with live credentials.",
                "delivery_status": "SKIPPED_UNCONFIGURED"
            }

        active_template = template_id or self.template_id
        active_dlt = dlt_te_id or self.dlt_te_id

        headers = {
            "authkey": self.auth_key,
            "content-type": "application/json"
        }

        payload: Dict[str, Any] = {
            "template_id": active_template,
            "mobile": normalized_phone,
            "otp": otp_code,
            "otp_expiry": ttl_minutes
        }

        if active_dlt:
            payload["DLT_TE_ID"] = active_dlt

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.base_url}/otp",
                    headers=headers,
                    json=payload
                )

                data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                if response.status_code == 200 and data.get("type") != "error":
                    logger.info(f"[MSG91] OTP successfully dispatched to {masked_phone}.")
                    return {
                        "success": True,
                        "provider": "msg91",
                        "configured": True,
                        "message_id": data.get("message"),
                        "delivery_status": "SENT"
                    }
                else:
                    error_msg = data.get("message", f"HTTP {response.status_code}")
                    logger.error(f"[MSG91] Gateway rejected dispatch to {masked_phone}: {error_msg}")
                    return {
                        "success": False,
                        "provider": "msg91",
                        "configured": True,
                        "error": error_msg,
                        "delivery_status": "FAILED"
                    }
        except Exception as e:
            logger.error(f"[MSG91] Network/connection error dispatching to {masked_phone}: {type(e).__name__}")
            return {
                "success": False,
                "provider": "msg91",
                "configured": True,
                "error": f"Gateway connection error: {type(e).__name__}",
                "delivery_status": "FAILED"
            }
