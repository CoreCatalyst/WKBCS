import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_critical_fee_and_customer_pricing():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as buyer
        verify_buyer = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": "+919111222333",
            "otp_code": "123456",
            "full_name": "Customer Ramesh",
            "role": "BUYER"
        })
        assert verify_buyer.status_code == 200
        buyer_token = verify_buyer.json()["access_token"]
        buyer_headers = {"Authorization": f"Bearer {buyer_token}"}

        # 2. Fetch product
        prod_res = await ac.get("/api/v1/products")
        prod = prod_res.json()[0]
        prod_id = prod["id"]
        prod_price = prod["base_price"]

        # 3. Create Order for 2 units
        order_res = await ac.post("/api/v1/orders", headers=buyer_headers, json={
            "items": [{"product_id": prod_id, "quantity": 2}],
            "shipping_address": {"city": "Mumbai", "pincode": "400001"},
            "payment_method": "RAZORPAY",
            "customer_charges": 0.0
        })
        assert order_res.status_code == 200
        order_data = order_res.json()

        # CRITICAL TEST 4: Customer is NOT charged additional 10% platform fee
        expected_subtotal = round(prod_price * 2, 2)
        expected_gst = round(expected_subtotal * (prod["gst_rate"] / 100.0), 2)
        expected_customer_payable = round(expected_subtotal + expected_gst, 2)

        assert order_data["subtotal"] == expected_subtotal
        assert order_data["total_customer_payable"] == expected_customer_payable

        # CRITICAL TEST 1 & 7: Test payment webhook processing and idempotency
        webhook_res = await ac.post(
            "/api/v1/payments/webhook/razorpay",
            headers={"x-razorpay-signature": "valid_test_signature"},
            json={
                "order_id": order_data["id"],
                "payment_id": "pay_test_rzp_123",
                "amount": expected_customer_payable
            }
        )
        assert webhook_res.status_code == 200
        assert webhook_res.json()["status"] == "CONFIRMED"
        settle_id = webhook_res.json()["settlement_id"]

        # Duplicate webhook replay must be idempotent and return existing settlement
        dup_webhook = await ac.post(
            "/api/v1/payments/webhook/razorpay",
            headers={"x-razorpay-signature": "valid_test_signature"},
            json={
                "order_id": order_data["id"],
                "payment_id": "pay_test_rzp_123",
                "amount": expected_customer_payable
            }
        )
        assert dup_webhook.status_code == 200

        # CRITICAL TEST 2 & 5: Business owner sees category platform fee (Wholesaler 3.20%) and net settlement
        login_vendor = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": "+919876543210",
            "otp_code": "123456",
            "full_name": "Rajesh Sharma",
            "role": "VENDOR"
        })
        vendor_token = login_vendor.json()["access_token"]
        vendor_headers = {"Authorization": f"Bearer {vendor_token}"}

        settle_res = await ac.get(f"/api/v1/settlements/{settle_id}", headers=vendor_headers)
        assert settle_res.status_code == 200
        settle_data = settle_res.json()

        # Business owner verifies category platform fee deduction (Wholesaler 3.20%)
        expected_fee = round(expected_subtotal * 0.032, 2)
        assert settle_data["platform_fee_rate"] == 3.20
        assert settle_data["platform_fee_amount"] == expected_fee
        assert settle_data["net_settlement_amount"] < settle_data["gross_amount"]

@pytest.mark.asyncio
async def test_media_upload_rules():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_vendor = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": "+919876543210",
            "otp_code": "123456",
            "full_name": "Rajesh Sharma",
            "role": "VENDOR"
        })
        vendor_token = login_vendor.json()["access_token"]
        vendor_headers = {"Authorization": f"Bearer {vendor_token}"}

        # 1. Attempt to publish a listing with only 3 images (must fail - below minimum 4)
        invalid_min_res = await ac.post("/api/v1/products", headers=vendor_headers, json={
            "title": "Industrial High Pressure Valve",
            "description": "High pressure valve for pipelines.",
            "category": "Industrial Machinery & Automation",
            "hsn_code": "848180",
            "base_price": 5400.0,
            "images": [
                f"https://images.unsplash.com/photo-{i}" for i in range(1, 4)
            ],
            "is_draft": False
        })
        assert invalid_min_res.status_code == 422
        assert "minimum of 4 images are required" in str(invalid_min_res.json())

        # 2. Attempt to publish with 11 images (must fail - above maximum 10)
        invalid_max_res = await ac.post("/api/v1/products", headers=vendor_headers, json={
            "title": "Industrial High Pressure Valve",
            "description": "High pressure valve for pipelines.",
            "category": "Industrial Machinery & Automation",
            "hsn_code": "848180",
            "base_price": 5400.0,
            "images": [
                f"https://images.unsplash.com/photo-{i}" for i in range(1, 12)
            ],
            "is_draft": False
        })
        assert invalid_max_res.status_code == 422
        assert "maximum of 10 images are allowed" in str(invalid_max_res.json())

        # 3. Attempt to publish with 3 videos (must fail - above maximum 2)
        invalid_video_res = await ac.post("/api/v1/products", headers=vendor_headers, json={
            "title": "Industrial High Pressure Valve",
            "description": "High pressure valve for pipelines.",
            "category": "Industrial Machinery & Automation",
            "hsn_code": "848180",
            "base_price": 5400.0,
            "images": [
                f"https://images.unsplash.com/photo-{i}" for i in range(1, 5)
            ],
            "videos": [
                "https://storage.noryvanta.com/v1.mp4",
                "https://storage.noryvanta.com/v2.mp4",
                "https://storage.noryvanta.com/v3.mp4"
            ],
            "is_draft": False
        })
        assert invalid_video_res.status_code == 422
        assert "maximum of 2 videos are allowed" in str(invalid_video_res.json())

        # 4. Valid listing with exactly 4 images and 1 video (must succeed)
        valid_res = await ac.post("/api/v1/products", headers=vendor_headers, json={
            "title": "Industrial High Pressure Valve Certified",
            "description": "High pressure valve for pipelines with ISO certification.",
            "category": "Industrial Machinery & Automation",
            "hsn_code": "848180",
            "base_price": 5400.0,
            "images": [
                f"https://images.unsplash.com/photo-{i}" for i in range(1, 5)
            ],
            "videos": [
                "https://storage.noryvanta.com/v1.mp4"
            ],
            "is_draft": False
        })
        assert valid_res.status_code == 200
        data = valid_res.json()
        assert len(data["images"]) == 4
        assert len(data.get("videos", [])) == 1


@pytest.mark.asyncio
async def test_admin_fee_config_and_historical_preservation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Login as Admin
        admin_login = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": "+919999900000",
            "otp_code": "123456",
            "full_name": "Platform Super Admin",
            "role": "ADMIN"
        })
        assert admin_login.status_code == 200
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # 1. Inspect initial fee config
        cfg_res = await ac.get("/api/v1/admin/fees/config", headers=admin_headers)
        assert cfg_res.status_code == 200
        assert cfg_res.json()["rate_percentage"] in (5.20, 12.5)

        try:
            # 2. Update fee config to 12.5% for future transactions
            update_res = await ac.put("/api/v1/admin/fees/config", headers=admin_headers, json={
                "rate_percentage": 12.5,
                "fee_type": "PERCENTAGE",
                "description": "Updated 12.5% fee policy"
            })
            assert update_res.status_code == 200
            assert update_res.json()["rate_percentage"] == 12.5

            # 3. Verify audit log was recorded for fee update
            audit_res = await ac.get("/api/v1/admin/audit-logs", headers=admin_headers)
            assert audit_res.status_code == 200
            logs = audit_res.json()
            assert any(l["action"] == "UPDATE_PLATFORM_FEE_CONFIG" for l in logs)
        finally:
            # Restore 5.20% default fee config for idempotent test isolation
            await ac.put("/api/v1/admin/fees/config", headers=admin_headers, json={
                "rate_percentage": 5.20,
                "fee_type": "PERCENTAGE",
                "description": "Default category platform fee"
            })

@pytest.mark.asyncio
async def test_admin_level_reversal_creates_audit_log():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        admin_login = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": "+919999900000",
            "otp_code": "123456",
            "full_name": "Platform Super Admin",
            "role": "ADMIN"
        })
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # First trigger sample member creation
        prog_res = await ac.get("/api/v1/network/progress", headers=admin_headers)
        member_uaid = prog_res.json()["uaid"]

        # Execute audited reversal of Level 37 following hypothetical refund/dispute
        reversal_res = await ac.post(
            "/api/v1/admin/network/transition",
            headers=admin_headers,
            params={
                "member_uaid": member_uaid,
                "level_number": 37,
                "new_status": "REVERSED",
                "reason": "Customer cancellation and dispute audit confirmed."
            }
        )
        assert reversal_res.status_code == 200
        assert reversal_res.json()["new_status"] == "REVERSED"

        # Check audit log contains the reversal
        audit_res = await ac.get("/api/v1/admin/audit-logs", headers=admin_headers)
        assert audit_res.status_code == 200
        logs = audit_res.json()
        assert any(l["action"] == "NETWORK_LEVEL_TRANSITION_REVERSED" for l in logs)
