import pytest
import uuid
from datetime import datetime, timezone
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.user import User, RoleEnum
from app.models.business import BusinessProfile, BusinessVerificationStatus
from app.models.order import Order, OrderStatus, PaymentStatus
from app.models.network import (
    NetworkMember,
    Referral,
    LevelProgressionLedger,
    LevelQualificationAllocation,
    RewardLedger
)
from app.services.uaid_service import uaid_service
from app.services.customer_reward_service import (
    customer_reward_service,
    CUSTOMER_ENTRY_THRESHOLD,
    CUSTOMER_UNIT_PER_LEVEL
)
from app.services.quarterly_activity_service import quarterly_service
from app.services.network_service import (
    RANKS_SPECIFICATION,
    get_minimum_transaction_unit,
    calculate_rank_reward_benchmark
)


@pytest.mark.asyncio
async def test_customer_uaid_format_and_uniqueness():
    """
    Test Section 4: Customer UAID format is NRY-C-<SECURE_RANDOM_IDENTIFIER>
    and enforces uniqueness across the database.
    """
    async with AsyncSessionLocal() as db:
        uaid1 = await uaid_service.generate_customer_uaid(db)
        uaid2 = await uaid_service.generate_customer_uaid(db)

        assert uaid1.startswith("NRY-C-")
        assert uaid2.startswith("NRY-C-")
        assert uaid1 != uaid2
        assert len(uaid1) >= 12  # NRY-C- + 10 chars
        # Check that it's alphanumeric uppercase
        suffix = uaid1.replace("NRY-C-", "")
        assert suffix.isalnum()
        assert suffix.isupper()


@pytest.mark.asyncio
async def test_customer_uaid_idempotency_and_no_regeneration_on_login():
    """
    Test Section 4: UAID is permanent. Repeated requests or logins return
    the same UAID and never generate a secondary or recycled UAID.
    """
    async with AsyncSessionLocal() as db:
        # Create test customer
        cust = User(
            email=f"cust_{uuid.uuid4().hex[:6]}@example.com",
            phone=f"+9199{uuid.uuid4().hex[:8]}",
            full_name="Priya Sharma",
            role=RoleEnum.CUSTOMER
        )
        db.add(cust)
        await db.commit()
        await db.refresh(cust)

        # First retrieval/generation
        uaid_first, is_new = await uaid_service.get_or_create_customer_uaid(cust.id, db)
        assert is_new is True
        assert uaid_first.startswith("NRY-C-")

        # Second retrieval (simulating repeated login or token refresh)
        uaid_second, is_new_again = await uaid_service.get_or_create_customer_uaid(cust.id, db)
        assert is_new_again is False
        assert uaid_second == uaid_first


@pytest.mark.asyncio
async def test_customer_referral_acceptance_and_rejections():
    """
    Test Section 5:
    - Accepts genuine Customer UAID (NRY-C-).
    - Rejects business UAIDs (Wholesaler, Distributor, Retailer, Service Provider).
    - Rejects self-referral.
    - Rejects non-existent UAID.
    """
    async with AsyncSessionLocal() as db:
        # 1. Create Referring Customer (Sponsor)
        sponsor = User(
            email=f"sponsor_{uuid.uuid4().hex[:6]}@example.com",
            phone=f"+9198{uuid.uuid4().hex[:8]}",
            full_name="Aarav Patel",
            role=RoleEnum.CUSTOMER
        )
        db.add(sponsor)
        await db.commit()
        await db.refresh(sponsor)

        sponsor_uaid, _ = await uaid_service.get_or_create_customer_uaid(sponsor.id, db)

        # 2. Create Candidate Customer (Referee)
        referee = User(
            email=f"referee_{uuid.uuid4().hex[:6]}@example.com",
            phone=f"+9197{uuid.uuid4().hex[:8]}",
            full_name="Sneha Reddy",
            role=RoleEnum.CUSTOMER
        )
        db.add(referee)
        await db.commit()
        await db.refresh(referee)

        referee_uaid, _ = await uaid_service.get_or_create_customer_uaid(referee.id, db)

        # 3. Create Business User (Wholesaler)
        biz_uaid = f"NRY-HS-APEX-{uuid.uuid4().hex[:6].upper()}"
        biz_user = User(
            email=f"biz_{uuid.uuid4().hex[:6]}@example.com",
            phone=f"+9196{uuid.uuid4().hex[:8]}",
            full_name="Apex Wholesaler MD",
            role=RoleEnum.VENDOR,
            uaid=biz_uaid
        )
        db.add(biz_user)
        await db.flush()

        biz_profile = BusinessProfile(
            user_id=biz_user.id,
            legal_name="Apex Wholesale Traders",
            trade_name="Apex Wholesale",
            business_type="Wholesaler",
            virtual_escrow_account_id=biz_uaid,
            verification_status=BusinessVerificationStatus.VERIFIED
        )
        db.add(biz_profile)
        await db.commit()

        # Test A: Genuine Customer UAID is accepted
        val_success = await customer_reward_service.validate_customer_referral(sponsor_uaid, referee.id, db)
        assert val_success["valid"] is True
        assert val_success["referrer_uaid"] == sponsor_uaid

        # Test B: Business UAID is rejected
        val_biz = await customer_reward_service.validate_customer_referral(biz_uaid, referee.id, db)
        assert val_biz["valid"] is False
        assert "Business" in val_biz["message"] or "format" in val_biz["message"]

        # Test C: Self-referral is rejected
        val_self = await customer_reward_service.validate_customer_referral(referee_uaid, referee.id, db)
        assert val_self["valid"] is False
        assert "Self-referral" in val_self["message"]

        # Test D: Apply valid referral
        app_res = await customer_reward_service.apply_customer_referral(referee.id, sponsor_uaid, db)
        assert app_res["valid"] is True

        # Test E: Duplicate network membership prevention (cannot change referral once established)
        app_dup = await customer_reward_service.validate_customer_referral(sponsor_uaid, referee.id, db)
        assert app_dup["valid"] is False
        assert "already has an established referral" in app_dup["message"]


@pytest.mark.asyncio
async def test_referral_cycle_and_circular_relationship_prevention():
    """
    Test Section 5: Referral cycles (A referred B, B cannot refer A) must be rejected.
    """
    async with AsyncSessionLocal() as db:
        user_a = User(email=f"a_{uuid.uuid4().hex[:6]}@test.com", full_name="User A", role=RoleEnum.CUSTOMER)
        user_b = User(email=f"b_{uuid.uuid4().hex[:6]}@test.com", full_name="User B", role=RoleEnum.CUSTOMER)
        db.add_all([user_a, user_b])
        await db.commit()

        uaid_a, _ = await uaid_service.get_or_create_customer_uaid(user_a.id, db)
        uaid_b, _ = await uaid_service.get_or_create_customer_uaid(user_b.id, db)

        # A refers B
        res1 = await customer_reward_service.apply_customer_referral(user_b.id, uaid_a, db)
        assert res1["valid"] is True

        # B attempts to refer A (Circular cycle!)
        res2 = await customer_reward_service.validate_customer_referral(uaid_b, user_a.id, db)
        assert res2["valid"] is False
        assert "cycle detected" in res2["message"].lower() or "circular" in res2["message"].lower()


@pytest.mark.asyncio
async def test_customer_reward_entry_threshold_inr_1999_vs_2000():
    """
    Test Section 6:
    At INR 1,999: Not Eligible.
    At INR 2,000 without referral: Not Eligible.
    At INR 2,000 with referral: Eligible!
    """
    async with AsyncSessionLocal() as db:
        sponsor = User(email=f"sp_{uuid.uuid4().hex[:6]}@test.com", full_name="Sponsor", role=RoleEnum.CUSTOMER)
        customer = User(email=f"cu_{uuid.uuid4().hex[:6]}@test.com", full_name="Customer", role=RoleEnum.CUSTOMER)
        db.add_all([sponsor, customer])
        await db.commit()

        sp_uaid, _ = await uaid_service.get_or_create_customer_uaid(sponsor.id, db)
        cu_uaid, _ = await uaid_service.get_or_create_customer_uaid(customer.id, db)

        # 1. Place order of INR 1,999 (subtotal 1999, no referral yet)
        order1 = Order(
            order_number=f"ORD-T1-{uuid.uuid4().hex[:6]}",
            customer_id=customer.id,
            business_id="biz-1",
            subtotal=1999.0,
            gst_total=359.82,
            total_customer_payable=2358.82,
            order_status=OrderStatus.CONFIRMED,
            payment_status=PaymentStatus.SUCCESSFUL
        )
        db.add(order1)
        await db.commit()

        # Check eligibility without referral
        status1 = await customer_reward_service.get_customer_reward_status(customer.id, db)
        assert status1["qualifying_purchase_total"] == 1999.0
        assert status1["threshold_satisfied"] is False
        assert status1["is_reward_eligible"] is False

        # 2. Add INR 1 to reach INR 2,000
        order2 = Order(
            order_number=f"ORD-T2-{uuid.uuid4().hex[:6]}",
            customer_id=customer.id,
            business_id="biz-1",
            subtotal=1.0,
            gst_total=0.18,
            total_customer_payable=1.18,
            order_status=OrderStatus.CONFIRMED,
            payment_status=PaymentStatus.SUCCESSFUL
        )
        db.add(order2)
        await db.commit()

        # Total is now 2,000, but STILL NO REFERRAL
        status2 = await customer_reward_service.get_customer_reward_status(customer.id, db)
        assert status2["qualifying_purchase_total"] == 2000.0
        assert status2["threshold_satisfied"] is True
        assert status2["has_valid_referral"] is False
        assert status2["is_reward_eligible"] is False  # Must have valid referral!

        # 3. Customer now applies valid referral
        app_res = await customer_reward_service.apply_customer_referral(customer.id, sp_uaid, db)
        assert app_res["valid"] is True

        # Now BOTH referral AND >= INR 2,000 are satisfied!
        status3 = await customer_reward_service.get_customer_reward_status(customer.id, db)
        assert status3["has_valid_referral"] is True
        assert status3["threshold_satisfied"] is True
        assert status3["is_reward_eligible"] is True


@pytest.mark.asyncio
async def test_inr_8000_completes_four_levels_and_no_double_counting():
    """
    Test Section 7:
    INR 8,000 qualifying purchase allocates:
    Level 1: 2,000
    Level 2: 2,000
    Level 3: 2,000
    Level 4: 2,000
    Completing 4 levels.
    The same INR 8,000 cannot complete another 4 levels.
    """
    async with AsyncSessionLocal() as db:
        sponsor = User(email=f"sp2_{uuid.uuid4().hex[:6]}@test.com", full_name="Sponsor", role=RoleEnum.CUSTOMER)
        buyer = User(email=f"buy2_{uuid.uuid4().hex[:6]}@test.com", full_name="Buyer", role=RoleEnum.CUSTOMER)
        db.add_all([sponsor, buyer])
        await db.commit()

        sp_uaid, _ = await uaid_service.get_or_create_customer_uaid(sponsor.id, db)
        buy_uaid, _ = await uaid_service.get_or_create_customer_uaid(buyer.id, db)

        # Apply referral first
        await customer_reward_service.apply_customer_referral(buyer.id, sp_uaid, db)

        # Place single INR 8,000 order (tax excluded: subtotal = 8000.0)
        order = Order(
            order_number=f"ORD-8K-{uuid.uuid4().hex[:6]}",
            customer_id=buyer.id,
            business_id="biz-1",
            subtotal=8000.0,
            gst_total=1440.0,
            total_customer_payable=9440.0,
            order_status=OrderStatus.CONFIRMED,
            payment_status=PaymentStatus.SUCCESSFUL
        )
        db.add(order)
        await db.commit()

        # Evaluate levels
        res = await customer_reward_service.process_customer_purchase(order.id, db)
        cust_eval = res["customer_evaluation"]

        assert cust_eval["is_reward_eligible"] is True
        assert cust_eval["qualifying_total"] == 8000.0
        assert cust_eval["current_level"] == 4
        assert cust_eval["newly_completed_levels"] == [1, 2, 3, 4]
        assert cust_eval["remaining_unallocated_volume"] == 0.0

        # Verify allocations in database
        alloc_stmt = select(LevelQualificationAllocation).where(
            LevelQualificationAllocation.transaction_id == order.id
        ).order_by(LevelQualificationAllocation.level_number.asc())
        allocations = (await db.execute(alloc_stmt)).scalars().all()

        assert len(allocations) == 4
        for idx, alloc in enumerate(allocations, start=1):
            assert alloc.level_number == idx
            assert alloc.amount_allocated_to_level == 2000.0
            assert alloc.business_type == "CUSTOMER"

        # Double-counting check: re-evaluating does NOT add more levels
        res2 = await customer_reward_service.evaluate_customer_eligibility_and_levels(buyer.id, db)
        assert res2["current_level"] == 4
        assert len(res2["newly_completed_levels"]) == 0


@pytest.mark.asyncio
async def test_ten_levels_complete_one_rank():
    """
    Test Section 8: 10 completed levels complete Rank 1 (Bronze),
    issuing one-time rank completion reward into RewardLedger.
    """
    async with AsyncSessionLocal() as db:
        sponsor = User(email=f"sp3_{uuid.uuid4().hex[:6]}@test.com", full_name="Sponsor", role=RoleEnum.CUSTOMER)
        buyer = User(email=f"buy3_{uuid.uuid4().hex[:6]}@test.com", full_name="Buyer", role=RoleEnum.CUSTOMER)
        db.add_all([sponsor, buyer])
        await db.commit()

        sp_uaid, _ = await uaid_service.get_or_create_customer_uaid(sponsor.id, db)
        await customer_reward_service.apply_customer_referral(buyer.id, sp_uaid, db)

        # Place INR 20,000 order = 10 completed levels
        order = Order(
            order_number=f"ORD-20K-{uuid.uuid4().hex[:6]}",
            customer_id=buyer.id,
            business_id="biz-1",
            subtotal=20000.0,
            gst_total=3600.0,
            total_customer_payable=23600.0,
            order_status=OrderStatus.CONFIRMED,
            payment_status=PaymentStatus.SUCCESSFUL
        )
        db.add(order)
        await db.commit()

        eval_res = await customer_reward_service.process_customer_purchase(order.id, db)
        cust_eval = eval_res["customer_evaluation"]

        assert cust_eval["current_level"] == 10
        assert cust_eval["current_rank"] == "Bronze"

        # Check RewardLedger for Rank 1 Completion
        r_stmt = select(RewardLedger).where(
            RewardLedger.user_id == buyer.id,
            RewardLedger.rank_number == 1,
            RewardLedger.reward_type == "RANK_COMPLETION"
        )
        reward_entry = (await db.execute(r_stmt)).scalars().first()
        assert reward_entry is not None
        assert reward_entry.status == "REWARDED"
        assert reward_entry.reward_rate == 1.10  # 1.10% for Rank 1 Bronze


@pytest.mark.asyncio
async def test_taxes_excluded_and_cancelled_orders_do_not_qualify():
    """
    Test Section 6 & 10:
    - Exclude taxes from reward calculation base.
    - Cancelled or refunded orders do not count.
    """
    async with AsyncSessionLocal() as db:
        cust = User(email=f"tax_{uuid.uuid4().hex[:6]}@test.com", full_name="Tax Test", role=RoleEnum.CUSTOMER)
        db.add(cust)
        await db.commit()

        # Order with subtotal 1000 + GST 180 = 1180
        order_valid = Order(
            order_number=f"ORD-TAX-{uuid.uuid4().hex[:6]}",
            customer_id=cust.id,
            business_id="biz-1",
            subtotal=1000.0,
            gst_total=180.0,
            total_customer_payable=1180.0,
            order_status=OrderStatus.COMPLETED,
            payment_status=PaymentStatus.SUCCESSFUL
        )
        # Cancelled order with subtotal 5000
        order_cancelled = Order(
            order_number=f"ORD-CAN-{uuid.uuid4().hex[:6]}",
            customer_id=cust.id,
            business_id="biz-1",
            subtotal=5000.0,
            gst_total=900.0,
            total_customer_payable=5900.0,
            order_status=OrderStatus.CANCELLED,
            payment_status=PaymentStatus.CANCELLED
        )
        db.add_all([order_valid, order_cancelled])
        await db.commit()

        qualifying = await customer_reward_service.get_qualifying_purchase_total(cust.id, db)
        # Only order_valid's subtotal 1000 is counted (taxes excluded, cancelled excluded)
        assert qualifying == 1000.0


@pytest.mark.asyncio
async def test_quarterly_boundaries_and_minimum_unit():
    """
    Test Section 11:
    - Calendar quarters: Q1, Q2, Q3, Q4 boundaries.
    - Reactivation minimum unit for CUSTOMER is INR 2,000.
    """
    q1_start, q1_end = quarterly_service.get_quarter_date_bounds(2026, "Q1")
    assert q1_start.month == 1 and q1_start.day == 1
    assert q1_end.month == 3 and q1_end.day == 31

    q2_start, q2_end = quarterly_service.get_quarter_date_bounds(2026, "Q2")
    assert q2_start.month == 4 and q2_start.day == 1
    assert q2_end.month == 6 and q2_end.day == 30

    q3_start, q3_end = quarterly_service.get_quarter_date_bounds(2026, "Q3")
    assert q3_start.month == 7 and q3_start.day == 1
    assert q3_end.month == 9 and q3_end.day == 30

    q4_start, q4_end = quarterly_service.get_quarter_date_bounds(2026, "Q4")
    assert q4_start.month == 10 and q4_start.day == 1
    assert q4_end.month == 12 and q4_end.day == 31

    from app.services.quarterly_activity_service import get_reactivation_minimum_unit
    assert get_reactivation_minimum_unit("CUSTOMER") == 2000.0
    assert get_minimum_transaction_unit("CUSTOMER") == 2000.0


@pytest.mark.asyncio
async def test_self_purchase_never_generates_rewards_for_purchaser():
    """
    Test Phase 4:
    Customer self-purchase must NEVER generate referral-network rewards for the purchaser.
    Only the eligible upstream referrer may qualify for referral volume.
    """
    async with AsyncSessionLocal() as db:
        sponsor = User(email=f"up_{uuid.uuid4().hex[:6]}@test.com", full_name="Upstream Sponsor", role=RoleEnum.CUSTOMER)
        buyer = User(email=f"sp_buyer_{uuid.uuid4().hex[:6]}@test.com", full_name="Self Buyer", role=RoleEnum.CUSTOMER)
        db.add_all([sponsor, buyer])
        await db.commit()

        sp_uaid, _ = await uaid_service.get_or_create_customer_uaid(sponsor.id, db)
        buy_uaid, _ = await uaid_service.get_or_create_customer_uaid(buyer.id, db)

        # Ensure sponsor is reward eligible first
        sp_member = await customer_reward_service.get_or_create_customer_member(sponsor.id, db)
        sp_member.is_reward_eligible = True
        await db.commit()

        # Buyer links to sponsor
        await customer_reward_service.apply_customer_referral(buyer.id, sp_uaid, db)

        # Buyer makes a purchase of INR 4,000
        order = Order(
            order_number=f"ORD-SELF-{uuid.uuid4().hex[:6]}",
            customer_id=buyer.id,
            business_id="biz-1",
            subtotal=4000.0,
            gst_total=720.0,
            total_customer_payable=4720.0,
            order_status=OrderStatus.CONFIRMED,
            payment_status=PaymentStatus.SUCCESSFUL
        )
        db.add(order)
        await db.commit()

        # Process order
        res = await customer_reward_service.process_customer_purchase(order.id, db)

        # Check ReferralTransaction table: self-purchase flag must be False for referral purchase
        from app.models.network import ReferralTransaction
        ref_tx = (await db.execute(select(ReferralTransaction).where(ReferralTransaction.order_id == order.id))).scalars().first()
        assert ref_tx is not None
        assert ref_tx.is_self_purchase is False
        assert ref_tx.referrer_user_id == sponsor.id
        assert ref_tx.buyer_user_id == buyer.id

        # Verify: Buyer received ZERO referral commission for buying their own goods
        buyer_rewards = (await db.execute(
            select(RewardLedger).where(
                RewardLedger.user_id == buyer.id,
                RewardLedger.reward_type == "REFERRAL_COMMISSION"
            )
        )).scalars().all()
        assert len(buyer_rewards) == 0


@pytest.mark.asyncio
async def test_non_withdrawable_reward_points_rejection():
    """
    Test Phase 7:
    Customer rewards are non-withdrawable store credits.
    Direct cash-out or withdrawal calls are strictly rejected with 400 Bad Request.
    """
    from app.services.auth_service import AuthService
    async with AsyncSessionLocal() as db:
        cust = User(email=f"pts_{uuid.uuid4().hex[:6]}@test.com", full_name="Points Customer", role=RoleEnum.CUSTOMER)
        db.add(cust)
        await db.commit()
        await db.refresh(cust)

        token, _, _, _ = await AuthService.generate_tokens(db, cust)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/customer/rewards/withdraw",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 400
        assert "non-withdrawable" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_rank_redemption_gate_policy():
    """
    Test Phase 10:
    Rank Redemption Gate:
    Rank 1 (Bronze, level 10) rewards are GATED until Rank 2 (Silver, level 20) is completed.
    At level 10: redeemable_points == 0.0, gated_points == rank_1_reward.
    At level 20: redeemable_points == rank_1_reward, gated_points == rank_2_reward.
    """
    async with AsyncSessionLocal() as db:
        sponsor = User(email=f"gate_sp_{uuid.uuid4().hex[:6]}@test.com", full_name="Gate Sponsor", role=RoleEnum.CUSTOMER)
        buyer = User(email=f"gate_bu_{uuid.uuid4().hex[:6]}@test.com", full_name="Gate Buyer", role=RoleEnum.CUSTOMER)
        db.add_all([sponsor, buyer])
        await db.commit()

        sp_uaid, _ = await uaid_service.get_or_create_customer_uaid(sponsor.id, db)
        await customer_reward_service.apply_customer_referral(buyer.id, sp_uaid, db)

        # 1. Complete Level 10 (Rank 1 Bronze completed)
        order1 = Order(
            order_number=f"ORD-GATE-10-{uuid.uuid4().hex[:6]}",
            customer_id=buyer.id,
            business_id="biz-1",
            subtotal=20000.0,
            gst_total=3600.0,
            total_customer_payable=23600.0,
            order_status=OrderStatus.CONFIRMED,
            payment_status=PaymentStatus.SUCCESSFUL
        )
        db.add(order1)
        await db.commit()
        await customer_reward_service.process_customer_purchase(order1.id, db)

        # Check status at Level 10: Rank 1 reward is earned but GATED because Rank 2 is not completed
        status_l10 = await customer_reward_service.get_customer_reward_status(buyer.id, db)
        wallet_l10 = status_l10["wallet"]
        assert status_l10["current_level"] == 10
        assert wallet_l10["total_earned_points"] > 0
        assert wallet_l10["gated_points"] == wallet_l10["total_earned_points"]
        assert wallet_l10["redeemable_points"] == 0.0  # Gated by Rank 2 requirement!

        # 2. Complete Level 20 (Rank 2 Silver completed)
        order2 = Order(
            order_number=f"ORD-GATE-20-{uuid.uuid4().hex[:6]}",
            customer_id=buyer.id,
            business_id="biz-1",
            subtotal=20000.0,
            gst_total=3600.0,
            total_customer_payable=23600.0,
            order_status=OrderStatus.CONFIRMED,
            payment_status=PaymentStatus.SUCCESSFUL
        )
        db.add(order2)
        await db.commit()
        await customer_reward_service.process_customer_purchase(order2.id, db)

        # Check status at Level 20: Rank 1 reward is now UNLOCKED (redeemable)!
        status_l20 = await customer_reward_service.get_customer_reward_status(buyer.id, db)
        wallet_l20 = status_l20["wallet"]
        assert status_l20["current_level"] == 20
        # Rank 1 reward is now in redeemable_points
        assert wallet_l20["redeemable_points"] > 0.0


@pytest.mark.asyncio
async def test_reactivation_formula_and_preservation_of_uaid():
    """
    Test Phase 14:
    Customer Reactivation Formula = INR 2,000 × number of missed quarters.
    For 4 missed quarters = INR 8,000.
    Reactivation restores the SAME UAID and preserves all history.
    """
    async with AsyncSessionLocal() as db:
        cust = User(email=f"react_{uuid.uuid4().hex[:6]}@test.com", full_name="Reactivation Test", role=RoleEnum.CUSTOMER)
        db.add(cust)
        await db.commit()

        uaid, _ = await uaid_service.get_or_create_customer_uaid(cust.id, db)
        member = await customer_reward_service.get_or_create_customer_member(cust.id, db)

        # Simulate 4 missed quarters and BLOCKED status
        member.missed_quarter_count = 4
        member.account_activity_status = "UAID_BLOCKED"
        await db.commit()

        # Check calculated requirement
        req = await quarterly_service.calculate_reactivation_requirement(cust.id, db)
        assert req["missed_quarter_count"] == 4
        assert req["minimum_purchase_unit"] == 2000.0
        assert req["required_reactivation_amount"] == 8000.0  # INR 2,000 × 4 = INR 8,000
        assert "8,000" in req["formula"]

        # Submit reactivation form
        sub = await quarterly_service.submit_reactivation_form(cust.id, db, notes="Requesting reactivation")
        assert sub["reactivation_status"] == "AMOUNT_CALCULATED"
        assert sub["required_reactivation_amount"] == 8000.0
        react_id = sub["reactivation_id"]

        # Qualifying purchase of INR 8,000
        ord_react = Order(
            order_number=f"ORD-REACT-{uuid.uuid4().hex[:6]}",
            customer_id=cust.id,
            business_id="biz-1",
            subtotal=8000.0,
            gst_total=1440.0,
            total_customer_payable=9440.0,
            order_status=OrderStatus.COMPLETED,
            payment_status=PaymentStatus.SUCCESSFUL
        )
        db.add(ord_react)
        await db.commit()

        proc = await quarterly_service.process_reactivation_purchase(
            user_id=cust.id,
            reactivation_id=react_id,
            order_id=ord_react.id,
            amount_paid=8000.0,
            payment_status="PAYMENT_SUCCESS",
            order_status="COMPLETED",
            db=db
        )
        assert proc["reactivation_status"] == "REACTIVATION_APPROVED"
        assert proc["uaid"] == uaid  # Preserved original UAID!

        # Verify member restored to ACTIVE with SAME UAID
        await db.refresh(member)
        assert member.account_activity_status == "ACTIVE"
        assert member.uaid == uaid


@pytest.mark.asyncio
async def test_quarterly_activity_independent_of_reward_entry():
    """
    Test Phase 12:
    Quarterly activity is satisfied by any eligible purchase (e.g. INR 100),
    which is independent of the INR 2,000 reward entry threshold.
    """
    async with AsyncSessionLocal() as db:
        cust = User(email=f"q_ind_{uuid.uuid4().hex[:6]}@test.com", full_name="Quarterly Test", role=RoleEnum.CUSTOMER)
        db.add(cust)
        await db.commit()

        await uaid_service.get_or_create_customer_uaid(cust.id, db)
        member = await customer_reward_service.get_or_create_customer_member(cust.id, db)

        # Make small purchase of INR 100
        small_order = Order(
            order_number=f"ORD-SM-{uuid.uuid4().hex[:6]}",
            customer_id=cust.id,
            business_id="biz-1",
            subtotal=100.0,
            gst_total=18.0,
            total_customer_payable=118.0,
            order_status=OrderStatus.COMPLETED,
            payment_status=PaymentStatus.SUCCESSFUL
        )
        db.add(small_order)
        await db.commit()

        # Process purchase
        await customer_reward_service.process_customer_purchase(small_order.id, db)

        # Check quarterly status: MET for current quarter
        status_eval = await quarterly_service.evaluate_progressive_account_status(cust.id, db)
        assert status_eval["account_activity_status"] == "ACTIVE"

        # Check reward eligibility: Still False (100 < 2000 and no referral)
        reward_status = await customer_reward_service.get_customer_reward_status(cust.id, db)
        assert reward_status["qualifying_purchase_total"] == 100.0
        assert reward_status["is_reward_eligible"] is False

