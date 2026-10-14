import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_marketplace_products_and_services_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Trigger startup events
        await ac.get("/api/v1/health")

        # 1. Test GET /api/v1/marketplace/products
        res_prod = await ac.get("/api/v1/marketplace/products")
        assert res_prod.status_code == 200
        prods = res_prod.json()
        assert len(prods) > 0
        first_prod = prods[0]
        assert first_prod["type"] == "PRODUCT"
        assert first_prod["status"] == "ACTIVE"
        assert "title" in first_prod
        assert "base_price" in first_prod
        assert "unit" in first_prod
        assert "moq" in first_prod
        assert "merchant" in first_prod
        merchant = first_prod["merchant"]
        assert merchant is not None
        assert "trade_name" in merchant
        assert "business_type" in merchant
        assert "city" in merchant
        assert "is_verified" in merchant
        # Strict Merchant Privacy Invariant Check:
        assert "bank_account_number" not in merchant
        assert "bank_ifsc" not in merchant
        assert "pan" not in merchant
        assert "virtual_escrow_account_id" not in merchant

        # 2. Test GET /api/v1/marketplace/services
        res_serv = await ac.get("/api/v1/marketplace/services")
        assert res_serv.status_code == 200
        servs = res_serv.json()
        assert len(servs) >= 2
        service_types = [s["merchant"]["business_type"] for s in servs]
        assert any("Registered Service Provider" in st for st in service_types)
        assert any("Skilled Small-Scale Home Service Provider" in st for st in service_types)

        first_serv = servs[0]
        assert first_serv["type"] == "SERVICE"
        assert first_serv["status"] == "ACTIVE"
        assert first_serv["base_price"] > 0
        assert first_serv["unit"] in ("visit", "hour", "service")

        # 3. Test GET /api/v1/marketplace/categories
        res_cats = await ac.get("/api/v1/marketplace/categories")
        assert res_cats.status_code == 200
        cats = res_cats.json()
        assert len(cats) == 12
        assert any(c["product_count"] > 0 for c in cats)
        assert any(c["service_count"] > 0 for c in cats)

        # 4. Test GET /api/v1/marketplace/featured
        res_feat = await ac.get("/api/v1/marketplace/featured")
        assert res_feat.status_code == 200
        feat = res_feat.json()
        assert "products" in feat
        assert "services" in feat
        assert len(feat["products"]) > 0
        assert len(feat["services"]) > 0

        # 5. Test GET /api/v1/marketplace/search
        res_search_prod = await ac.get("/api/v1/marketplace/search?q=Servo&type=PRODUCT")
        assert res_search_prod.status_code == 200
        search_data = res_search_prod.json()
        assert search_data["total"] > 0
        assert all(item["type"] == "PRODUCT" for item in search_data["items"])

        res_search_serv = await ac.get("/api/v1/marketplace/search?q=Electrician&type=SERVICE")
        assert res_search_serv.status_code == 200
        search_serv_data = res_search_serv.json()
        assert search_serv_data["total"] > 0
        assert all(item["type"] == "SERVICE" for item in search_serv_data["items"])

        # 6. Test Single Product and Service Detail Endpoints
        prod_id = first_prod["id"]
        detail_prod = await ac.get(f"/api/v1/marketplace/products/{prod_id}")
        assert detail_prod.status_code == 200
        assert detail_prod.json()["id"] == prod_id

        serv_id = first_serv["id"]
        detail_serv = await ac.get(f"/api/v1/marketplace/services/{serv_id}")
        assert detail_serv.status_code == 200
        assert detail_serv.json()["id"] == serv_id

@pytest.mark.asyncio
async def test_listing_visibility_and_approval_workflow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Vendor login
        login_vendor = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": "+919876543210",
            "otp_code": "123456",
            "full_name": "Rajesh Sharma",
            "role": "VENDOR"
        })
        assert login_vendor.status_code == 200
        vendor_token = login_vendor.json()["access_token"]
        vendor_headers = {"Authorization": f"Bearer {vendor_token}"}

        # Admin login
        login_admin = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": "+919999900000",
            "otp_code": "123456",
            "full_name": "Platform Admin",
            "role": "ADMIN"
        })
        assert login_admin.status_code == 200
        admin_token = login_admin.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # Step 1: Vendor creates a new product listing (submits with verified images)
        new_prod_res = await ac.post("/api/v1/products", headers=vendor_headers, json={
            "type": "PRODUCT",
            "title": "Industrial Pneumatic Actuator Cylinder 50mm",
            "description": "Double-acting pneumatic cylinder with magnetic piston and adjustable cushioning for factory automation.",
            "category": "Industrial Machinery & Automation",
            "hsn_code": "841231",
            "gst_rate": 18.0,
            "base_price": 4800.0,
            "unit": "piece",
            "moq": 2,
            "images": [
                "https://images.unsplash.com/img1",
                "https://images.unsplash.com/img2",
                "https://images.unsplash.com/img3",
                "https://images.unsplash.com/img4",
                "https://images.unsplash.com/img5",
                "https://images.unsplash.com/img6"
            ],
            "is_draft": False
        })
        assert new_prod_res.status_code == 200
        new_prod = new_prod_res.json()
        new_prod_id = new_prod["id"]

        # Rule 4 Check: Listing status must be SUBMITTED
        assert new_prod["status"] == "SUBMITTED"
        assert new_prod["is_active"] == False

        # Rule 4 Check: Must NOT appear publicly in marketplace products before approval!
        public_check = await ac.get(f"/api/v1/marketplace/products/{new_prod_id}")
        assert public_check.status_code == 404

        all_prods = await ac.get("/api/v1/marketplace/products?search=Pneumatic")
        assert all_prods.status_code == 200
        assert not any(p["id"] == new_prod_id for p in all_prods.json())

        # Step 2: Admin reviews listing
        review_res = await ac.post(f"/api/v1/admin/listings/{new_prod_id}/review", headers=admin_headers)
        assert review_res.status_code == 200
        assert review_res.json()["status"] == "UNDER_REVIEW"

        # Still not public while UNDER_REVIEW
        public_check2 = await ac.get(f"/api/v1/marketplace/products/{new_prod_id}")
        assert public_check2.status_code == 404

        # Step 3: Admin approves listing
        approve_res = await ac.post(f"/api/v1/admin/listings/{new_prod_id}/approve", headers=admin_headers)
        assert approve_res.status_code == 200
        assert approve_res.json()["status"] == "ACTIVE"
        assert approve_res.json()["is_active"] == True

        # Step 4: Listing IMMEDIATELY appears on marketplace APIs without requiring re-creation!
        public_check_live = await ac.get(f"/api/v1/marketplace/products/{new_prod_id}")
        assert public_check_live.status_code == 200
        live_prod = public_check_live.json()
        assert live_prod["id"] == new_prod_id
        assert live_prod["status"] == "ACTIVE"
        assert live_prod["merchant"]["trade_name"] == "Apex Instruments"
        assert live_prod["merchant"]["is_verified"] == True
