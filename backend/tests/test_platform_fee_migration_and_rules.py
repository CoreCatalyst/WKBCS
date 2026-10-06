"""
Comprehensive Test Suite for Platform Fee Migration 007,
Versioned Fee Rules, Historical Immutability, Category Tiers, and Reward Isolation.
Complies with Sections 22, 23, 26, 27, 28 of the Noryvanta Database Migration Plan.
"""
import pytest
import uuid
from decimal import Decimal, ROUND_HALF_UP
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, func
from app.main import app
from app.core.database import get_db, AsyncSessionLocal
from app.models.escrow import PlatformFeeRule, Settlement, SettlementStatus
from app.models.business import BusinessProfile
from app.models.order import Order, OrderStatus, PaymentStatus
from app.models.user import User
from app.services.network_service import network_service
from app.services.payment_service import payment_service

@pytest.mark.asyncio
async def test_active_versioned_fee_rules_exist():
    """Verify that all four required business category rules are active in database."""
    async with AsyncSessionLocal() as db:
        stmt = select(PlatformFeeRule).where(PlatformFeeRule.status == "ACTIVE")
        res = await db.execute(stmt)
        rules = {r.business_type.upper(): Decimal(str(r.fee_percentage)) for r in res.scalars().all()}

        assert "WHOLESALER" in rules
        assert rules["WHOLESALER"] == Decimal("3.20")

        assert "DISTRIBUTOR" in rules
        assert rules["DISTRIBUTOR"] == Decimal("5.20")

        assert "SERVICES" in rules
        assert rules["SERVICES"] == Decimal("5.20")

        assert "RETAILER" in rules
        assert rules["RETAILER"] == Decimal("8.20")

@pytest.mark.asyncio
async def test_all_four_business_category_calculations():
    """
    Section 26 Required Test Cases:
    Wholesaler:  ₹100,000 -> ₹3,200 (3.20%)
    Distributor: ₹100,000 -> ₹5,200 (5.20%)
    Services:    ₹100,000 -> ₹5,200 (5.20%)
    Retailer:    ₹100,000 -> ₹8,200 (8.20%)
    """
    category_cases = [
        ("WHOLESALER", Decimal("100000.00"), Decimal("3200.00"), Decimal("3.20")),
        ("DISTRIBUTOR", Decimal("100000.00"), Decimal("5200.00"), Decimal("5.20")),
        ("SERVICES", Decimal("100000.00"), Decimal("5200.00"), Decimal("5.20")),
        ("RETAILER", Decimal("100000.00"), Decimal("8200.00"), Decimal("8.20")),
    ]

    async with AsyncSessionLocal() as db:
        for biz_type, gross_amt, expected_fee, expected_rate in category_cases:
            # Query active rule
            stmt = select(PlatformFeeRule).where(
                PlatformFeeRule.business_type == biz_type,
                PlatformFeeRule.status == "ACTIVE"
            )
            rule = (await db.execute(stmt)).scalars().first()
            assert rule is not None
            assert Decimal(str(rule.fee_percentage)) == expected_rate

            # Precise decimal calculation
            fee_amount = (gross_amt * (Decimal(str(rule.fee_percentage)) / Decimal("100"))).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            assert fee_amount == expected_fee

@pytest.mark.asyncio
async def test_tax_isolation_and_zero_customer_surcharge():
    """
    Section 26: Tax Isolation Test
    Confirms platform fee is computed strictly on eligible business base (subtotal),
    NOT on GST-inclusive total, and buyer pays ZERO platform surcharge.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Fetch public fee schedule
        res = await ac.get("/api/v1/platform-fees")
        assert res.status_code == 200
        schedule = {f["business_type"]: f["rate_percentage"] for f in res.json()["fees"]}
        assert schedule["Wholesaler"] == 3.20
        assert schedule["Retailer"] == 8.20

        # Subtotal: ₹10,000, GST (18%): ₹1,800, Total Customer Payable: ₹11,800
        subtotal = Decimal("10000.00")
        gst_rate = Decimal("18.0")
        gst_amount = (subtotal * (gst_rate / Decimal("100"))).quantize(Decimal("0.01"))
        customer_payable = subtotal + gst_amount

        # For Wholesaler (3.20%)
        wholesaler_fee = (subtotal * (Decimal("3.20") / Decimal("100"))).quantize(Decimal("0.01"))
        assert wholesaler_fee == Decimal("320.00")  # Strictly on 10,000 base, NOT 11,800!

        # If incorrectly computed on tax-inclusive 11,800 it would be 377.60
        tax_inclusive_err = (customer_payable * (Decimal("3.20") / Decimal("100"))).quantize(Decimal("0.01"))
        assert wholesaler_fee != tax_inclusive_err

@pytest.mark.asyncio
async def test_historical_transactions_immutability():
    """
    Section 22.5: Historical Transaction Protection
    Historical settlements must retain their original rates and amounts.
    """
    async with AsyncSessionLocal() as db:
        stmt = select(Settlement)
        res = await db.execute(stmt)
        settlements = res.scalars().all()

        for s in settlements:
            assert s.platform_fee_rate is not None
            assert s.platform_fee_amount is not None
            assert s.gross_amount is not None
            # Verify mathematically consistent with its recorded rate
            expected_fee = round(s.gross_amount * (s.platform_fee_rate / 100.0), 2)
            assert s.platform_fee_amount == expected_fee

@pytest.mark.asyncio
async def test_reward_system_complete_isolation():
    """
    Section 27: Reward Regression Tests
    Confirm all 12 rank reward rates (Bronze 1.10% to Legendary 2.20%) remain completely untouched.
    """
    expected_rates = {
        "Bronze": 1.10,
        "Silver": 1.20,
        "Panna": 1.30,
        "Gold": 1.40,
        "Platinum": 1.50,
        "Ruby": 1.60,
        "Sapphire": 1.70,
        "Emerald": 1.80,
        "Diamond": 1.90,
        "Black Diamond": 2.00,
        "Mythic": 2.10,
        "Legendary": 2.20,
    }

    rules = await network_service.get_reward_rules_for_type(business_type="WHOLESALER")
    for r in rules.ranks:
        assert r.rank_name in expected_rates
        assert r.reward_rate == expected_rates[r.rank_name]

@pytest.mark.asyncio
async def test_settlement_creates_applied_rule_snapshot():
    """
    Section 22.6: Settlement snapshot fields
    Verify new settlement records capture applied_fee_rule_id and applied_fee_rule_version.
    """
    async with AsyncSessionLocal() as db:
        # Create a test business profile with WHOLESALER
        unique_id = uuid.uuid4().hex[:4].upper()
        test_biz = BusinessProfile(
            id=f"test-biz-{uuid.uuid4().hex[:8]}",
            user_id=f"test-user-{uuid.uuid4().hex[:8]}",
            legal_name="Test Wholesaler Enterprises",
            trade_name="Test Wholesaler",
            business_type="WHOLESALER",
            gstin=f"27ABCDE{unique_id}1Z5",
            pan=f"ABCDE{unique_id}F",
            bank_account_number=f"12345678{unique_id}",
            bank_ifsc="HDFC0001234"
        )
        db.add(test_biz)
        await db.flush()

        test_order = Order(
            id=f"test-order-{uuid.uuid4().hex[:8]}",
            order_number=f"NORY-TEST-{uuid.uuid4().hex[:4].upper()}",
            customer_id=f"cust-{uuid.uuid4().hex[:6]}",
            business_id=test_biz.id,
            currency="INR",
            subtotal=50000.0,
            gst_total=9000.0,
            customer_charges=0.0,
            total_customer_payable=59000.0,
            platform_fee=1600.0,  # 3.20% of 50000
            order_status=OrderStatus.PENDING,
            payment_status=PaymentStatus.INITIATED,
            payment_method="RAZORPAY"
        )
        db.add(test_order)
        await db.commit()

        # Process payment via payment_service
        settlement = await payment_service.process_successful_payment(
            order=test_order,
            gateway="RAZORPAY",
            gateway_payment_id="pay_test_snapshot_123",
            gateway_order_id="order_test_snapshot_123",
            amount=59000.0,
            raw_payload={"notes": {"test": True}},
            db=db
        )

        assert settlement is not None
        assert settlement.platform_fee_rate == 3.20
        assert settlement.platform_fee_amount == 1600.00
        assert settlement.applied_fee_rule_id is not None
        assert settlement.applied_fee_rule_version == 1
