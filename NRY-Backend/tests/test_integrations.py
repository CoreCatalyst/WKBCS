import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.notification_service import NotificationService, MockEmailProvider
from app.services.push_service import PushNotificationService, MockPushProvider
from app.services.maps_service import MapsService
from app.services.turnstile_service import TurnstileService

@pytest.mark.asyncio
async def test_notification_service_resend_templates():
    mock_provider = MockEmailProvider()
    NotificationService.set_provider(mock_provider)

    # 1. Business Registered
    res1 = await NotificationService.send_business_registered(
        to_email="owner@precisiontools.in",
        business_name="Precision Tools Pvt Ltd",
        owner_name="Vikram Singh"
    )
    assert res1["status"] in ("sent", "delivered_mock")

    # 2. Listing Approved
    res2 = await NotificationService.send_listing_approved(
        to_email="owner@precisiontools.in",
        business_name="Precision Tools Pvt Ltd",
        product_title="Industrial CNC Milling Head 5KW"
    )
    assert res2["status"] in ("sent", "delivered_mock")

    # 3. Order Received
    res3 = await NotificationService.send_order_received(
        to_email="buyer@enterprise.com",
        order_id="ord_test_998811",
        total_amount=54000.0,
        currency="INR"
    )
    assert res3["status"] in ("sent", "delivered_mock")

    # 4. Settlement Processed
    res4 = await NotificationService.send_settlement_processed(
        to_email="owner@precisiontools.in",
        settlement_id="stl_998811",
        net_payout=48060.0,
        utr_number="HDFC20261002998811"
    )
    assert res4["status"] in ("sent", "delivered_mock")
    assert len(mock_provider.sent_emails) == 4

@pytest.mark.asyncio
async def test_push_notification_service_fcm_events():
    mock_provider = MockPushProvider()
    PushNotificationService.set_provider(mock_provider)

    device_token = "fcm_test_device_token_android_client_12345"

    # 1. New Order
    p1 = await PushNotificationService.send_new_order(device_token, "ord_1001", 35000.0)
    assert p1["success"] is True

    # 2. Payment Successful
    p2 = await PushNotificationService.send_payment_successful(device_token, "ord_1001", 35000.0)
    assert p2["success"] is True

    # 3. Listing Approved
    p3 = await PushNotificationService.send_listing_approved(device_token, "Servo Motor IP65")
    assert p3["success"] is True

    # 4. Level Status Changed
    p4 = await PushNotificationService.send_level_status_changed(device_token, 37, "QUALIFIED", "Gold")
    assert p4["success"] is True
    assert len(mock_provider.sent_pushes) == 4

@pytest.mark.asyncio
async def test_maps_geocoding_service():
    # Test city lookup fallback
    result = await MapsService.geocode_address(
        address="Bandra Kurla Complex",
        city="Mumbai",
        state="Maharashtra",
        country="India",
        pin_code="400051"
    )
    assert "latitude" in result
    assert "longitude" in result
    assert result["latitude"] == pytest.approx(19.0760, abs=0.5)
    assert result["longitude"] == pytest.approx(72.8777, abs=0.5)

@pytest.mark.asyncio
async def test_turnstile_bot_protection_service():
    # Valid token or dev passthrough
    valid = await TurnstileService.verify_token("cf_turnstile_token_mock")
    assert valid is True

    # Explicit failure test token
    invalid = await TurnstileService.verify_token("FAIL_TEST_TOKEN")
    assert invalid is False

@pytest.mark.asyncio
async def test_google_oauth_login_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/auth/google", json={
            "id_token": "google_token_mock_test_12345",
            "email": "google.partner@noryvantaglobal.com",
            "full_name": "Google Verified Enterprise Vendor",
            "role": "BUSINESS_OWNER"
        })
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["email"] == "google.partner@noryvantaglobal.com"
        assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_prometheus_metrics_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/metrics")
        assert res.status_code == 200
        assert "text/plain" in res.headers["content-type"]
        metrics_text = res.text
        assert "noryvanta_registered_users_total" in metrics_text
        assert "noryvanta_registered_businesses_total" in metrics_text
        assert "noryvanta_backend_status 1" in metrics_text
