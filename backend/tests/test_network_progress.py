import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_network_progress_120_levels_and_states():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login user
        verify_res = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": "+919876543210",
            "otp_code": "123456",
            "full_name": "Consumer A",
            "role": "CUSTOMER"
        })
        assert verify_res.status_code == 200
        token = verify_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get 120-Level Network Progress
        progress_res = await ac.get("/api/v1/network/progress", headers=headers)
        assert progress_res.status_code == 200
        data = progress_res.json()

        # Header Card assertions (Section 1 & 8)
        assert data["consumer"] == "A"
        assert data["uaid"].startswith("NRY-")
        assert data["current_cycle"] == "Cycle 1"
        assert data["current_level"] == 37
        assert data["current_rank"] == "Gold"
        assert data["kyc_status"] == "Verified"

        # Exactly 120 levels returned
        levels = data["levels"]
        assert len(levels) == 120

        # Status invariant checks:
        # CRITICAL TEST 10: TRANSACTION_RECEIVED does NOT equal QUALIFIED
        lvl39 = next(l for l in levels if l["level_number"] == 39)
        assert lvl39["status"] == "TRANSACTION_RECEIVED"
        assert lvl39["qualification_status"] != "QUALIFIED"

        lvl38 = next(l for l in levels if l["level_number"] == 38)
        assert lvl38["status"] == "UNDER_VERIFICATION"
        assert lvl38["qualification_status"] != "QUALIFIED"

        lvl37 = next(l for l in levels if l["level_number"] == 37)
        assert lvl37["status"] == "REWARD_PENDING"
        assert lvl37["qualification_status"] == "QUALIFIED"

        lvl36 = next(l for l in levels if l["level_number"] == 36)
        assert lvl36["status"] == "QUALIFIED"

        # Level Detail Modal with 5-step pipeline (Section 9)
        detail_res = await ac.get("/api/v1/network/levels/37", headers=headers)
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert detail["level_number"] == 37
        assert detail["rank_name"] == "Gold"
        assert len(detail["activity_timeline"]) == 5

        # Cycle History (Section 11)
        cycle_res = await ac.get("/api/v1/network/cycles/history", headers=headers)
        assert cycle_res.status_code == 200
        cycles = cycle_res.json()
        assert len(cycles) >= 2
        assert cycles[0]["cycle_number"] == 1
        assert cycles[0]["status"] == "ACTIVE"
        assert cycles[1]["cycle_number"] == 2
        assert cycles[1]["status"] == "NOT_STARTED"
