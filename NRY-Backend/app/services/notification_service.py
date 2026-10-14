import logging
import httpx
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class BaseEmailProvider(ABC):
    @abstractmethod
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send an email to a single recipient."""
        pass

class MockEmailProvider(BaseEmailProvider):
    def __init__(self):
        self.sent_emails = []

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> Dict[str, Any]:
        email_record = {
            "to": to_email,
            "subject": subject,
            "html": html_content,
            "text": text_content,
            "status": "delivered_mock",
            "provider": "mock"
        }
        self.sent_emails.append(email_record)
        logger.info(f"[MockEmailProvider] Email sent to {to_email} with subject: '{subject}'")
        return {"id": f"mock_email_{len(self.sent_emails)}", "status": "sent", "to": to_email}

class ResendEmailProvider(BaseEmailProvider):
    RESEND_API_URL = "https://api.resend.com/emails"

    def __init__(self, api_key: Optional[str] = None, from_email: Optional[str] = None):
        self.api_key = api_key or settings.RESEND_API_KEY
        self.from_email = from_email or settings.EMAIL_FROM

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> Dict[str, Any]:
        if not self.api_key or self.api_key.startswith("re_test") or settings.APP_ENV == "development":
            logger.info(f"[ResendEmailProvider:DEV] Simulating email delivery to {to_email}: '{subject}'")
            return {
                "id": "resend_simulated_id",
                "to": to_email,
                "status": "simulated",
                "provider": "resend"
            }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "from": self.from_email,
            "to": [to_email],
            "subject": subject,
            "html": html_content,
        }
        if text_content:
            payload["text"] = text_content

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(self.RESEND_API_URL, headers=headers, json=payload)
                if res.status_code in (200, 201):
                    data = res.json()
                    logger.info(f"[ResendEmailProvider] Dispatched email to {to_email}: ID={data.get('id')}")
                    return data
                else:
                    logger.error(f"[ResendEmailProvider] Error {res.status_code}: {res.text}")
                    return {"error": res.text, "status_code": res.status_code, "status": "failed"}
        except Exception as e:
            logger.exception(f"[ResendEmailProvider] Exception sending email: {e}")
            return {"error": str(e), "status": "failed"}

class NotificationService:
    """
    Centralized notification manager handling transactional emails:
    1. Business Registered
    2. Listing Approved
    3. Order Received
    4. Settlement Processed
    """
    _provider: Optional[BaseEmailProvider] = None

    @classmethod
    def get_provider(cls) -> BaseEmailProvider:
        if cls._provider is None:
            if settings.RESEND_API_KEY and not settings.RESEND_API_KEY.startswith("mock"):
                cls._provider = ResendEmailProvider()
            else:
                cls._provider = MockEmailProvider()
        return cls._provider

    @classmethod
    def set_provider(cls, provider: BaseEmailProvider):
        cls._provider = provider

    @classmethod
    async def send_business_registered(cls, to_email: str, business_name: str, owner_name: str) -> Dict[str, Any]:
        subject = f"Welcome to Noryvanta — {business_name} Registration Successful"
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="background-color: #0b192c; padding: 16px; border-radius: 6px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">NORYVANTA</h1>
                <p style="color: #94a3b8; margin: 4px 0 0; font-size: 13px;">Connect, Supply, Empower</p>
            </div>
            <div style="padding: 24px 0;">
                <h2 style="color: #1e293b; font-size: 20px;">Welcome, {owner_name}!</h2>
                <p style="color: #475569; line-height: 1.6;">
                    Your business profile for <strong>{business_name}</strong> has been registered on Noryvanta.
                </p>
                <p style="color: #475569; line-height: 1.6;">
                    Next steps: Complete your KYC verification and add your products or services to activate marketplace discovery.
                </p>
            </div>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;">
                © 2026 noryvantaglobal.com — Sovereign Commerce Network. All rights reserved.
            </div>
        </div>
        """
        provider = cls.get_provider()
        return await provider.send_email(to_email=to_email, subject=subject, html_content=html)

    @classmethod
    async def send_listing_approved(cls, to_email: str, business_name: str, product_title: str) -> Dict[str, Any]:
        subject = f"Listing Approved: {product_title} is now LIVE on Noryvanta"
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="background-color: #0b192c; padding: 16px; border-radius: 6px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">NORYVANTA</h1>
                <p style="color: #10b981; margin: 4px 0 0; font-size: 13px; font-weight: bold;">Listing Approved & Live</p>
            </div>
            <div style="padding: 24px 0;">
                <h2 style="color: #1e293b; font-size: 20px;">Hello {business_name},</h2>
                <p style="color: #475569; line-height: 1.6;">
                    Your product listing <strong>"{product_title}"</strong> has passed quality and compliance verification and is now active on the marketplace.
                </p>
            </div>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;">
                © 2026 noryvantaglobal.com
            </div>
        </div>
        """
        provider = cls.get_provider()
        return await provider.send_email(to_email=to_email, subject=subject, html_content=html)

    @classmethod
    async def send_order_received(cls, to_email: str, order_id: str, total_amount: float, currency: str = "INR") -> Dict[str, Any]:
        subject = f"New Order Received: #{order_id[-8:].upper()}"
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="background-color: #0b192c; padding: 16px; border-radius: 6px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">NORYVANTA</h1>
                <p style="color: #38bdf8; margin: 4px 0 0; font-size: 13px;">Commercial Order Confirmation</p>
            </div>
            <div style="padding: 24px 0;">
                <h2 style="color: #1e293b; font-size: 20px;">Order Confirmed!</h2>
                <p style="color: #475569; line-height: 1.6;">
                    Order <strong>#{order_id}</strong> for <strong>{currency} {total_amount:,.2f}</strong> has been secured in escrow.
                </p>
            </div>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;">
                © 2026 noryvantaglobal.com
            </div>
        </div>
        """
        provider = cls.get_provider()
        return await provider.send_email(to_email=to_email, subject=subject, html_content=html)

    @classmethod
    async def send_settlement_processed(cls, to_email: str, settlement_id: str, net_payout: float, utr_number: str) -> Dict[str, Any]:
        subject = f"Settlement Payout Processed: INR {net_payout:,.2f}"
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="background-color: #0b192c; padding: 16px; border-radius: 6px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">NORYVANTA</h1>
                <p style="color: #10b981; margin: 4px 0 0; font-size: 13px; font-weight: bold;">Settlement Completed</p>
            </div>
            <div style="padding: 24px 0;">
                <h2 style="color: #1e293b; font-size: 20px;">Payout Transferred</h2>
                <p style="color: #475569; line-height: 1.6;">
                    Settlement <strong>#{settlement_id}</strong> has been transferred to your registered bank account.
                </p>
                <div style="background-color: #f8fafc; border-radius: 6px; padding: 12px; margin: 16px 0;">
                    <p style="margin: 0; color: #334155; font-size: 14px;">Net Payout: <strong>INR {net_payout:,.2f}</strong></p>
                    <p style="margin: 6px 0 0; color: #64748b; font-size: 13px;">Bank Reference / UTR: <strong>{utr_number}</strong></p>
                </div>
                <p style="color: #64748b; font-size: 13px;">
                    Category platform fee and applicable statutory deductions (1% TDS Section 194-O) have been retained per statutory schedule.
                </p>
            </div>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;">
                © 2026 noryvantaglobal.com
            </div>
        </div>
        """
        provider = cls.get_provider()
        return await provider.send_email(to_email=to_email, subject=subject, html_content=html)
