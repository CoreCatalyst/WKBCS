import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_otp_flow_and_login():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Request OTP
        req_res = await ac.post("/api/v1/auth/otp/request", json={
            "identifier": "+919800011122",
            "channel": "sms"
        })
        assert req_res.status_code == 200
        data = req_res.json()
        assert data["success"] is True
        otp_code = data.get("dev_otp_preview")
        assert otp_code is not None

        # 2. Verify with valid OTP
        verify_res = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": "+919800011122",
            "otp_code": otp_code,
            "full_name": "Test Industrial Vendor",
            "role": "VENDOR"
        })
        assert verify_res.status_code == 200
        auth_data = verify_res.json()
        assert "access_token" in auth_data
        assert "refresh_token" in auth_data
        assert auth_data["role"] == "VENDOR"

        # 3. Test authenticated endpoint with Bearer token
        token = auth_data["access_token"]
        me_res = await ac.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_res.status_code == 200
        assert me_res.json()["phone"] == "+919800011122"
