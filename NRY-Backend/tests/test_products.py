import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_products_list_and_ai_assist():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Trigger startup events
        await ac.get("/api/v1/health")

        # Test listing products
        res = await ac.get("/api/v1/products")
        assert res.status_code == 200
        products = res.json()
        assert len(products) > 0
        first = products[0]
        assert "title" in first
        assert "base_price" in first
        assert "hsn_code" in first

        # Test AI Listing Assistant
        ai_res = await ac.post("/api/v1/products/ai-assist", json={
            "raw_title": "high precision servo motor for robotics",
            "category_hint": "industrial motors",
            "features": ["3000 rpm", "ip65", "encoder"]
        })
        assert ai_res.status_code == 200
        ai_data = ai_res.json()
        assert "suggested_hsn" in ai_data
        assert "optimized_title" in ai_data
        assert len(ai_data["suggested_tiers"]) > 0
