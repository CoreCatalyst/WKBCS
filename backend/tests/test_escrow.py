import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_order_creation_and_escrow_lifecycle():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as buyer
        verify_res = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": "+919888877777",
            "otp_code": "123456",
            "full_name": "Procurement Director",
            "role": "BUYER"
        })
        assert verify_res.status_code == 200
        token = verify_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Fetch products to get a real product id
        prod_res = await ac.get("/api/v1/products")
        products = prod_res.json()
        assert len(products) > 0
        prod_id = products[0]["id"]

        # 3. Create Order
        order_res = await ac.post("/api/v1/orders", headers=headers, json={
            "items": [{"product_id": prod_id, "quantity": 10}],
            "shipping_address": {
                "street": "Plot 12, SEZ Industrial Corridor",
                "city": "Bengaluru",
                "state": "Karnataka",
                "pincode": "560100"
            }
        })
        assert order_res.status_code == 200
        order_data = order_res.json()
        order_id = order_data["id"]
        assert order_data["status"] == "CREATED"
        total_payable = order_data["total_amount"]
        assert total_payable > 0

        # 4. Deposit Funds into Escrow
        deposit_res = await ac.post(f"/api/v1/escrow/{order_id}/deposit", headers=headers, json={
            "payment_reference": "NEFT_RBI_2026_TEST_8912",
            "amount_paid": total_payable,
            "payment_method": "NEFT_RTGS"
        })
        assert deposit_res.status_code == 200
        deposit_data = deposit_res.json()
        assert deposit_data["status"] == "FUNDED"
        assert deposit_data["amount_locked"] == total_payable

        # 5. Milestone Release (Delivery Verified)
        release_res = await ac.post(f"/api/v1/escrow/{order_id}/release", headers=headers)
        assert release_res.status_code == 200
        release_data = release_res.json()
        assert release_data["escrow_status"] == "RELEASED"
        assert release_data["tds_deducted"] > 0  # Section 194-O (1%)
        assert release_data["platform_commission_retained"] > 0
        assert release_data["amount_disbursed_to_vendor"] > 0
        assert release_data["settlement_reference"].startswith("UTR_NORY_")
