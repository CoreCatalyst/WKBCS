import logging
import httpx
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class TurnstileService:
    """
    Cloudflare Turnstile verification service.
    Validates client-side Turnstile tokens against Cloudflare's siteverify API.
    """
    SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

    # Cloudflare standard dummy testing keys
    DUMMY_SECRET_PASS = "1x0000000000000000000000000000000AA"  # Always passes
    DUMMY_SECRET_FAIL = "2x0000000000000000000000000000000AA"  # Always fails

    @classmethod
    async def verify_token(cls, token: Optional[str], remote_ip: Optional[str] = None) -> bool:
        """
        Verifies Turnstile CAPTCHA token.
        If CLOUDFLARE_TURNSTILE_SECRET_KEY is unset or token is in dev test mode, allows verification.
        """
        secret_key = settings.CLOUDFLARE_TURNSTILE_SECRET_KEY

        # In dev mode without configured secret, allow pass-through
        if not secret_key or settings.APP_ENV == "development":
            # If a token is provided and matches explicit failure token, simulate failure
            if token == "FAIL_TEST_TOKEN":
                return False
            return True

        if not token:
            return False

        try:
            payload = {
                "secret": secret_key,
                "response": token
            }
            if remote_ip:
                payload["remoteip"] = remote_ip

            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(cls.SITEVERIFY_URL, data=payload)
                if res.status_code == 200:
                    data = res.json()
                    success = data.get("success", False)
                    if not success:
                        logger.warning(f"[TurnstileService] Verification failed: {data.get('error-codes')}")
                    return bool(success)
                else:
                    logger.error(f"[TurnstileService] API error HTTP {res.status_code}")
                    return False
        except Exception as e:
            logger.exception(f"[TurnstileService] Verification exception: {e}")
            return False
