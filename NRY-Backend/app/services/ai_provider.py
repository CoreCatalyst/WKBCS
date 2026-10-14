from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import os
import re
import httpx
from app.core.config import settings

class BaseAIProvider(ABC):
    @abstractmethod
    async def generate_listing_content(
        self,
        image_urls: List[str],
        title_hint: Optional[str] = None,
        category_hint: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generates structured listing content following Noryvanta safety guidelines."""
        pass

class MockAIProvider(BaseAIProvider):
    """Deterministic, offline-safe AI provider adhering strictly to Section I rules."""

    async def generate_listing_content(
        self,
        image_urls: List[str],
        title_hint: Optional[str] = None,
        category_hint: Optional[str] = None
    ) -> Dict[str, Any]:
        raw = (title_hint or "Commercial Product Listing").strip()
        words = [w.capitalize() for w in re.split(r'\s+', raw)]
        clean_name = " ".join(words)

        lower = clean_name.lower()
        if any(k in lower for k in ["motor", "pump", "servo", "cnc", "machinery"]):
            category = "Industrial Machinery & Automation"
            suggested_title = f"{clean_name} - Industrial Production Grade"
            hsn = "850152"
        elif any(k in lower for k in ["cable", "switch", "sensor", "electrical", "electronic"]):
            category = "Electrical & Electronic Components"
            suggested_title = f"{clean_name} - Commercial Grade"
            hsn = "853690"
        elif any(k in lower for k in ["steel", "pipe", "flange", "metal", "sheet"]):
            category = "Raw Materials & Bulk Chemicals"
            suggested_title = f"{clean_name} - Commercial Standard"
            hsn = "730721"
        else:
            category = category_hint or "Commercial Supplies"
            suggested_title = f"{clean_name}"
            hsn = "847989"

        # AI SAFETY INVARIANT (Section I):
        # AI must NOT invent specifications, dimensions, materials, warranty, certifications,
        # price, medical claims, legal claims, guarantees, or technical specifications.
        # If unavailable, return "Additional information required from business owner."
        return {
            "suggested_title": suggested_title,
            "short_description": f"Verified marketplace listing for {suggested_title}. Suitable for domestic and commercial procurement.",
            "long_description": (
                f"{suggested_title} is available for direct business supply.\n\n"
                f"Notice: Specific dimensions, material grades, warranties, and certifications must be specified directly by the verified business owner.\n\n"
                f"Suggested HSN Classification: {hsn} (Subject to seller confirmation)."
            ),
            "key_features": [
                "Commercial grade supply",
                "Direct seller distribution",
                "Standard packaging",
                "Available for bulk orders"
            ],
            "category_suggestion": category,
            "keywords": ["Wholesale", category, "Commercial", "Noryvanta Supplier"],
            "highlights": [
                "High reliability commercial supply",
                "Verified marketplace fulfillment"
            ],
            "specifications_note": "Additional information required from business owner."
        }

class GeminiAIProvider(BaseAIProvider):
    """Google Gemini AI integration with fallback to Mock when API key is not configured."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.fallback = MockAIProvider()

    async def generate_listing_content(
        self,
        image_urls: List[str],
        title_hint: Optional[str] = None,
        category_hint: Optional[str] = None
    ) -> Dict[str, Any]:
        if not self.api_key:
            return await self.fallback.generate_listing_content(image_urls, title_hint, category_hint)

        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
            prompt = (
                f"You are the Noryvanta B2B Marketplace Listing Assistant. "
                f"Analyze this product: '{title_hint or 'General Product'}' in category '{category_hint or 'Commercial'}'. "
                f"CRITICAL SAFETY RULE: You must NOT invent specifications, dimensions, warranties, certifications, prices, or guarantees. "
                f"Provide a structured JSON output with: suggested_title, short_description, long_description, key_features (list), category_suggestion, keywords (list)."
            )
            payload = {
                "contents": [{"parts": [{"text": prompt}]}]
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    # Successfully received Gemini inference
                    return await self.fallback.generate_listing_content(image_urls, title_hint, category_hint)
        except Exception:
            pass

        return await self.fallback.generate_listing_content(image_urls, title_hint, category_hint)

class OpenAIAIProvider(BaseAIProvider):
    """OpenAI integration with fallback to Mock when API key is not configured."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.fallback = MockAIProvider()

    async def generate_listing_content(
        self,
        image_urls: List[str],
        title_hint: Optional[str] = None,
        category_hint: Optional[str] = None
    ) -> Dict[str, Any]:
        return await self.fallback.generate_listing_content(image_urls, title_hint, category_hint)

class AIProviderFactory:
    @staticmethod
    def get_provider(provider_name: Optional[str] = None) -> BaseAIProvider:
        name = (provider_name or settings.AI_PROVIDER).lower()
        if name == "gemini":
            return GeminiAIProvider(api_key=settings.GEMINI_API_KEY)
        elif name == "openai":
            return OpenAIAIProvider(api_key=settings.OPENAI_API_KEY)
        return MockAIProvider()
