import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_platform_fee_schedule_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/platform-fees")
        assert res.status_code == 200
        data = res.json()
        assert data["registration_fee"] == 0.0
        fees = {f["business_type"]: f["rate_percentage"] for f in data["fees"]}
        assert fees["Wholesaler"] == 3.20
        assert fees["Distributor"] == 5.20
        assert fees["Retailer"] == 8.20
        assert fees["Service Provider"] == 5.20

@pytest.mark.asyncio
async def test_locations_country_state_district_hierarchy():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Countries
        c_res = await ac.get("/api/v1/locations/countries")
        assert c_res.status_code == 200
        assert any(c["code"] == "IN" for c in c_res.json())

        # States in India
        s_res = await ac.get("/api/v1/locations/countries/IN/states")
        assert s_res.status_code == 200
        states = s_res.json()
        assert "Maharashtra" in states
        assert "Karnataka" in states

        # Districts in Maharashtra
        d_res = await ac.get("/api/v1/locations/states/Maharashtra/districts")
        assert d_res.status_code == 200
        districts = d_res.json()
        assert "Pune" in districts
        assert "Mumbai City" in districts

@pytest.mark.asyncio
async def test_business_registration_uaid_and_gst_rules():
    import uuid
    rand_suffix = uuid.uuid4().hex[:6]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Register User A as Wholesaler (GST required)
        phone_a = f"+9198{uuid.uuid4().int % 100000000:08d}"
        user_a = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": phone_a,
            "otp_code": "123456",
            "full_name": f"Ramesh Patel {rand_suffix}",
            "role": "BUYER"
        })
        assert user_a.status_code == 200
        token_a = user_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # Wholesaler without GST must fail
        fail_res = await ac.post("/api/v1/businesses/register", headers=headers_a, json={
            "legal_name": f"Patel Wholesale Corp {rand_suffix}",
            "trade_name": f"Patel Wholesale {rand_suffix}",
            "business_type": "Wholesaler",
            "business_category": "Hardware & Tools",
            "country": "India",
            "gst_number": ""  # Missing GST
        })
        assert fail_res.status_code == 400
        assert "GST number is mandatory" in fail_res.json()["detail"]

        # Wholesaler with GST succeeds and gets NRY-HS UAID
        succ_res = await ac.post("/api/v1/businesses/register", headers=headers_a, json={
            "legal_name": f"Patel Wholesale Corp {rand_suffix}",
            "trade_name": f"Patel Wholesale {rand_suffix}",
            "business_type": "Wholesaler",
            "business_category": "Hardware & Tools",
            "country": "India",
            "gst_number": f"24AABC{uuid.uuid4().hex[:4].upper()}1Z9"
        })
        assert succ_res.status_code == 200
        data_a = succ_res.json()
        assert data_a["virtual_escrow_account_id"].startswith("NRY-HS-")

        # 2. Register User B as Skilled Small-Scale Home Service Provider (GST optional)
        phone_b = f"+9198{uuid.uuid4().int % 100000000:08d}"
        user_b = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": phone_b,
            "otp_code": "123456",
            "full_name": f"Sunil Electrician {rand_suffix}",
            "role": "BUYER"
        })
        assert user_b.status_code == 200
        token_b = user_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        service_res = await ac.post("/api/v1/businesses/register", headers=headers_b, json={
            "legal_name": f"Sunil Home Electricals {rand_suffix}",
            "trade_name": f"Sunil Services {rand_suffix}",
            "business_type": "Service Provider",
            "business_classification": "SKILLED_SMALL_SCALE_HOME_SERVICE",
            "business_category": "Home Repair Services",
            "country": "India",
            "gst_number": ""  # Allowed for skilled small-scale home service!
        })
        assert service_res.status_code == 200
        data_b = service_res.json()
        assert data_b["virtual_escrow_account_id"].startswith("NRY-SR-")

@pytest.mark.asyncio
async def test_critical_privacy_isolation_merchant_a_vs_b():
    """
    Section 71:
    User A logs in. User B exists.
    User A requests GET /api/v1/businesses/profile/{User B ID}
    Expected: 403 Forbidden. Never return User B's private information.
    """
    import uuid
    rand_suffix = uuid.uuid4().hex[:6]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        phone_a = f"+9197{uuid.uuid4().int % 100000000:08d}"
        user_a = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": phone_a,
            "otp_code": "123456",
            "full_name": f"Merchant Alpha {rand_suffix}",
            "role": "BUYER"
        })
        token_a = user_a.json()["access_token"]
        user_a_id = user_a.json()["user_id"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        phone_b = f"+9197{uuid.uuid4().int % 100000000:08d}"
        user_b = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": phone_b,
            "otp_code": "123456",
            "full_name": f"Merchant Beta {rand_suffix}",
            "role": "BUYER"
        })
        token_b = user_b.json()["access_token"]
        user_b_id = user_b.json()["user_id"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        await ac.post("/api/v1/businesses/register", headers=headers_b, json={
            "legal_name": f"Beta Supplies Ltd {rand_suffix}",
            "trade_name": f"Beta Supplies {rand_suffix}",
            "business_type": "Retailer",
            "business_category": "Consumer Goods",
            "country": "India",
            "gst_number": f"27AABC{uuid.uuid4().hex[:4].upper()}1Z2"
        })

        # User A attempts to view User B's private profile
        leak_attempt = await ac.get(f"/api/v1/businesses/profile/{user_b_id}", headers=headers_a)
        assert leak_attempt.status_code == 403
        assert "Forbidden" in leak_attempt.json()["detail"]

        # User A can view their own profile
        own_res = await ac.get(f"/api/v1/businesses/profile/{user_a_id}", headers=headers_a)
        assert own_res.status_code in (200, 404)

@pytest.mark.asyncio
async def test_qr_generation_and_verification_flow():
    import uuid
    rand_suffix = uuid.uuid4().hex[:6]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        phone = f"+9196{uuid.uuid4().int % 100000000:08d}"
        user = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": phone,
            "otp_code": "123456",
            "full_name": f"Gita Textiles {rand_suffix}",
            "role": "BUYER"
        })
        token = user.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        biz_res = await ac.post("/api/v1/businesses/register", headers=headers, json={
            "legal_name": f"Gita Textile Mills Private Limited {rand_suffix}",
            "trade_name": f"Gita Fabrics {rand_suffix}",
            "business_type": "Distributor",
            "business_category": "Apparel & Textiles",
            "country": "India",
            "gst_number": f"24AABC{uuid.uuid4().hex[:4].upper()}1Z1"
        })
        assert biz_res.status_code == 200
        uaid = biz_res.json()["virtual_escrow_account_id"]
        assert uaid.startswith("NRY-DS-")

        # 1. Generate QR Code
        qr_gen = await ac.post("/api/v1/qr/generate", headers=headers, json={"uaid": uaid})
        assert qr_gen.status_code == 200
        qr_data = qr_gen.json()
        assert qr_data["verification_reference"].startswith("NRY_VERIFY:")
        assert "<svg" in qr_data["qr_svg"]

        # 2. Publicly verify QR code
        verify_res = await ac.post("/api/v1/qr/verify", json={"reference": qr_data["verification_reference"]})
        assert verify_res.status_code == 200
        ver_data = verify_res.json()
        assert ver_data["valid"] is True
        assert ver_data["uaid"] == uaid
        assert ver_data["business_name"] == f"Gita Fabrics {rand_suffix}"
        assert ver_data["business_type"] == "Distributor"
        # Zero sensitive fields returned
        assert "pan" not in ver_data
        assert "gst_number" not in ver_data
        assert "bank_account_number" not in ver_data

@pytest.mark.asyncio
async def test_product_media_image_limits():
    """
    Section 13:
    Minimum: 4 images
    Maximum: 10 images
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Login vendor
        user = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": "vendor@noryvanta.in",
            "otp_code": "123456"
        })
        token = user.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Under 4 images must fail
        res_few = await ac.post("/api/v1/products", headers=headers, json={
            "title": "Industrial High-Pressure Hydraulic Valve",
            "description": "Heavy-duty hydraulic control valve for automated industrial press systems.",
            "category": "Industrial Machinery & Automation",
            "base_price": 18500.0,
            "images": [
                "https://images.unsplash.com/photo-1?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-2?auto=format&fit=crop&w=800&q=80"
            ]  # Only 2 images
        })
        assert res_few.status_code == 422

        # 2. Over 10 images must fail
        eleven_images = [f"https://images.unsplash.com/photo-{i}?auto=format&fit=crop&w=800&q=80" for i in range(11)]
        res_many = await ac.post("/api/v1/products", headers=headers, json={
            "title": "Industrial High-Pressure Hydraulic Valve",
            "description": "Heavy-duty hydraulic control valve for automated industrial press systems.",
            "category": "Industrial Machinery & Automation",
            "base_price": 18500.0,
            "images": eleven_images  # 11 images
        })
        assert res_many.status_code == 422

        # 3. 4 to 10 images succeeds
        six_images = [f"https://images.unsplash.com/photo-{i}?auto=format&fit=crop&w=800&q=80" for i in range(6)]
        res_ok = await ac.post("/api/v1/products", headers=headers, json={
            "title": "Industrial High-Pressure Hydraulic Valve",
            "description": "Heavy-duty hydraulic control valve for automated industrial press systems.",
            "category": "Industrial Machinery & Automation",
            "base_price": 18500.0,
            "images": six_images
        })
        assert res_ok.status_code == 200
        assert len(res_ok.json()["images"]) == 6
