import pytest
import uuid
from datetime import datetime, timezone
from sqlalchemy import select, and_

from app.core.database import AsyncSessionLocal
from app.models.user import User, RoleEnum
from app.models.network import (
    NetworkMember,
    QuarterlyAccountActivity,
    UAIDReactivationTransaction,
    UAIDReactivationAudit,
    RewardLedger
)
from app.services.quarterly_activity_service import quarterly_service
from app.services.uaid_service import uaid_service

@pytest.mark.asyncio
async def test_reactivation_formula_wholesaler():
    """
    Test 1 & 2:
    - Wholeseller + 1 missed quarter = ₹1,00,000
    - Wholeseller + 2 missed quarters = ₹2,00,000
    """
    async with AsyncSessionLocal() as db:
        # Wholesaler + 1 missed quarter
        user_w1 = f"user-w1-{uuid.uuid4().hex[:6]}"
        uaid_w1 = f"NRY-HS-W1-{uuid.uuid4().hex[:4]}"
        m_w1 = NetworkMember(
            user_id=user_w1,
            uaid=uaid_w1,
            business_type="WHOLESELLER",
            account_activity_status="UAID_BLOCKED",
            is_reward_eligible=False,
            missed_quarter_count=1
        )
        db.add(m_w1)
        await db.commit()

        calc_w1 = await quarterly_service.calculate_reactivation_requirement(user_w1, db)
        assert calc_w1["minimum_purchase_unit"] == 100000.0
        assert calc_w1["missed_quarter_count"] == 1
        assert calc_w1["required_reactivation_amount"] == 100000.0

        # Wholesaler + 2 missed quarters
        user_w2 = f"user-w2-{uuid.uuid4().hex[:6]}"
        uaid_w2 = f"NRY-HS-W2-{uuid.uuid4().hex[:4]}"
        m_w2 = NetworkMember(
            user_id=user_w2,
            uaid=uaid_w2,
            business_type="WHOLESALER",
            account_activity_status="UAID_BLOCKED",
            is_reward_eligible=False,
            missed_quarter_count=2
        )
        db.add(m_w2)
        await db.commit()

        calc_w2 = await quarterly_service.calculate_reactivation_requirement(user_w2, db)
        assert calc_w2["minimum_purchase_unit"] == 100000.0
        assert calc_w2["missed_quarter_count"] == 2
        assert calc_w2["required_reactivation_amount"] == 200000.0

@pytest.mark.asyncio
async def test_reactivation_formula_distributor():
    """
    Test 3 & 4:
    - Distributor + 1 missed quarter = ₹10,000
    - Distributor + 2 missed quarters = ₹20,000
    """
    async with AsyncSessionLocal() as db:
        # Distributor + 1 missed quarter
        user_d1 = f"user-d1-{uuid.uuid4().hex[:6]}"
        uaid_d1 = f"NRY-DS-D1-{uuid.uuid4().hex[:4]}"
        m_d1 = NetworkMember(
            user_id=user_d1,
            uaid=uaid_d1,
            business_type="DISTRIBUTOR",
            account_activity_status="UAID_BLOCKED",
            is_reward_eligible=False,
            missed_quarter_count=1
        )
        db.add(m_d1)
        await db.commit()

        calc_d1 = await quarterly_service.calculate_reactivation_requirement(user_d1, db)
        assert calc_d1["minimum_purchase_unit"] == 10000.0
        assert calc_d1["missed_quarter_count"] == 1
        assert calc_d1["required_reactivation_amount"] == 10000.0

        # Distributor + 2 missed quarters
        user_d2 = f"user-d2-{uuid.uuid4().hex[:6]}"
        uaid_d2 = f"NRY-DS-D2-{uuid.uuid4().hex[:4]}"
        m_d2 = NetworkMember(
            user_id=user_d2,
            uaid=uaid_d2,
            business_type="DISTRIBUTOR",
            account_activity_status="UAID_BLOCKED",
            is_reward_eligible=False,
            missed_quarter_count=2
        )
        db.add(m_d2)
        await db.commit()

        calc_d2 = await quarterly_service.calculate_reactivation_requirement(user_d2, db)
        assert calc_d2["minimum_purchase_unit"] == 10000.0
        assert calc_d2["missed_quarter_count"] == 2
        assert calc_d2["required_reactivation_amount"] == 20000.0

@pytest.mark.asyncio
async def test_reactivation_formula_retailer():
    """
    Test 5 & 6:
    - Retailor + 1 missed quarter = ₹5,000
    - Retailor + 2 missed quarters = ₹10,000
    """
    async with AsyncSessionLocal() as db:
        # Retailer + 1 missed quarter
        user_r1 = f"user-r1-{uuid.uuid4().hex[:6]}"
        uaid_r1 = f"NRY-RT-R1-{uuid.uuid4().hex[:4]}"
        m_r1 = NetworkMember(
            user_id=user_r1,
            uaid=uaid_r1,
            business_type="RETAILOR",
            account_activity_status="UAID_BLOCKED",
            is_reward_eligible=False,
            missed_quarter_count=1
        )
        db.add(m_r1)
        await db.commit()

        calc_r1 = await quarterly_service.calculate_reactivation_requirement(user_r1, db)
        assert calc_r1["minimum_purchase_unit"] == 5000.0
        assert calc_r1["missed_quarter_count"] == 1
        assert calc_r1["required_reactivation_amount"] == 5000.0

        # Retailer + 2 missed quarters
        user_r2 = f"user-r2-{uuid.uuid4().hex[:6]}"
        uaid_r2 = f"NRY-RT-R2-{uuid.uuid4().hex[:4]}"
        m_r2 = NetworkMember(
            user_id=user_r2,
            uaid=uaid_r2,
            business_type="RETAILER",
            account_activity_status="UAID_BLOCKED",
            is_reward_eligible=False,
            missed_quarter_count=2
        )
        db.add(m_r2)
        await db.commit()

        calc_r2 = await quarterly_service.calculate_reactivation_requirement(user_r2, db)
        assert calc_r2["minimum_purchase_unit"] == 5000.0
        assert calc_r2["missed_quarter_count"] == 2
        assert calc_r2["required_reactivation_amount"] == 10000.0

@pytest.mark.asyncio
async def test_reactivation_formula_service_provider():
    """
    Test 7 & 8:
    - Service Provider + 1 missed quarter = ₹5,000
    - Service Provider + 2 missed quarters = ₹10,000
    """
    async with AsyncSessionLocal() as db:
        # Service Provider + 1 missed quarter
        user_s1 = f"user-s1-{uuid.uuid4().hex[:6]}"
        uaid_s1 = f"NRY-SR-S1-{uuid.uuid4().hex[:4]}"
        m_s1 = NetworkMember(
            user_id=user_s1,
            uaid=uaid_s1,
            business_type="SERVICE_PROVIDER",
            account_activity_status="UAID_BLOCKED",
            is_reward_eligible=False,
            missed_quarter_count=1
        )
        db.add(m_s1)
        await db.commit()

        calc_s1 = await quarterly_service.calculate_reactivation_requirement(user_s1, db)
        assert calc_s1["minimum_purchase_unit"] == 5000.0
        assert calc_s1["missed_quarter_count"] == 1
        assert calc_s1["required_reactivation_amount"] == 5000.0

        # Service Provider + 2 missed quarters
        user_s2 = f"user-s2-{uuid.uuid4().hex[:6]}"
        uaid_s2 = f"NRY-SR-S2-{uuid.uuid4().hex[:4]}"
        m_s2 = NetworkMember(
            user_id=user_s2,
            uaid=uaid_s2,
            business_type="SERVICE_PROVIDER",
            account_activity_status="UAID_BLOCKED",
            is_reward_eligible=False,
            missed_quarter_count=2
        )
        db.add(m_s2)
        await db.commit()

        calc_s2 = await quarterly_service.calculate_reactivation_requirement(user_s2, db)
        assert calc_s2["minimum_purchase_unit"] == 5000.0
        assert calc_s2["missed_quarter_count"] == 2
        assert calc_s2["required_reactivation_amount"] == 10000.0

@pytest.mark.asyncio
async def test_frontend_cannot_manipulate_missed_quarters_or_minimum_unit():
    """
    Test 9 & 10:
    - Frontend cannot manipulate missed-quarter count (submitting 0 or 999 is ignored).
    - Frontend cannot manipulate minimum purchase amount (submitting ₹1 or ₹999 is ignored).
    """
    async with AsyncSessionLocal() as db:
        user_id = f"user-anti-hack-{uuid.uuid4().hex[:6]}"
        uaid = f"NRY-HS-HACK-{uuid.uuid4().hex[:4]}"
        user = User(id=user_id, phone=f"+9188{uuid.uuid4().hex[:8]}", role=RoleEnum.BUYER, uaid=uaid)
        member = NetworkMember(
            user_id=user_id,
            uaid=uaid,
            business_type="WHOLESALER",
            account_activity_status="UAID_BLOCKED",
            is_reward_eligible=False,
            missed_quarter_count=3
        )
        db.add_all([user, member])
        await db.commit()

        # Attacker tries sending fraudulent values: 0 missed quarters, unit = 10, required_amount = 10
        tx = await quarterly_service.submit_reactivation_form(
            user_id=user_id,
            frontend_missed_quarters=0,
            frontend_minimum_unit=10.0,
            frontend_required_amount=10.0,
            notes="Malicious form submission attempt",
            db=db
        )

        # Server-side security check: values must match verified database calculations!
        assert tx["missed_quarter_count"] == 3
        assert tx["minimum_purchase_unit"] == 100000.0
        assert tx["required_reactivation_amount"] == 300000.0
        assert tx["required_reactivation_amount"] != 10.0

@pytest.mark.asyncio
async def test_ineligible_transactions_cannot_activate_uaid():
    """
    Test 12:
    - Failed/cancelled/refunded/reversed transaction cannot activate the UAID.
    - Insufficient payment amount cannot activate the UAID.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"user-inelig-{uuid.uuid4().hex[:6]}"
        uaid = f"NRY-DS-INEL-{uuid.uuid4().hex[:4]}"
        user = User(id=user_id, phone=f"+9187{uuid.uuid4().hex[:8]}", role=RoleEnum.BUYER, uaid=uaid)
        member = NetworkMember(
            user_id=user_id,
            uaid=uaid,
            business_type="DISTRIBUTOR",
            account_activity_status="UAID_BLOCKED",
            is_reward_eligible=False,
            missed_quarter_count=2  # requires 20,000
        )
        db.add_all([user, member])
        await db.commit()

        # Submit reactivation form
        form_res = await quarterly_service.submit_reactivation_form(user_id=user_id, db=db)
        react_id = form_res["reactivation_id"]

        # Case A: Failed payment
        res_fail = await quarterly_service.process_reactivation_purchase(
            user_id=user_id,
            reactivation_id=react_id,
            order_id="ORD-FAILED-100",
            amount_paid=20000.0,
            payment_status="FAILED",
            order_status="FAILED",
            db=db
        )
        assert res_fail["success"] is False
        assert res_fail["reactivation_status"] == "REACTIVATION_REJECTED"
        await db.refresh(member)
        assert member.account_activity_status == "UAID_BLOCKED"

        # Case B: Cancelled order
        res_cancel = await quarterly_service.process_reactivation_purchase(
            user_id=user_id,
            reactivation_id=react_id,
            order_id="ORD-CANCELLED-100",
            amount_paid=20000.0,
            payment_status="PAYMENT_SUCCESS",
            order_status="CANCELLED",
            db=db
        )
        assert res_cancel["success"] is False
        await db.refresh(member)
        assert member.account_activity_status == "UAID_BLOCKED"

        # Case C: Insufficient payment (paid 10,000 instead of 20,000)
        res_underpaid = await quarterly_service.process_reactivation_purchase(
            user_id=user_id,
            reactivation_id=react_id,
            order_id="ORD-UNDERPAID-100",
            amount_paid=10000.0,
            payment_status="PAYMENT_SUCCESS",
            order_status="COMPLETED",
            db=db
        )
        assert res_underpaid["success"] is False
        assert res_underpaid["reactivation_status"] == "PAYMENT_PENDING"
        await db.refresh(member)
        assert member.account_activity_status == "UAID_BLOCKED"

@pytest.mark.asyncio
async def test_successful_reactivation_restores_original_uaid_and_no_second_uaid():
    """
    Test 11 & 13:
    - Successful verified reactivation restores original UAID to ACTIVE.
    - Reactivation cannot create a second UAID (idempotency holds).
    """
    async with AsyncSessionLocal() as db:
        user_id = f"user-success-react-{uuid.uuid4().hex[:6]}"
        original_uaid = f"NRY-RT-ORIG-{uuid.uuid4().hex[:4]}"
        user = User(id=user_id, phone=f"+9186{uuid.uuid4().hex[:8]}", role=RoleEnum.BUYER, uaid=original_uaid)
        member = NetworkMember(
            user_id=user_id,
            uaid=original_uaid,
            business_type="RETAILER",
            account_activity_status="UAID_BLOCKED",
            is_reward_eligible=False,
            missed_quarter_count=1  # requires 5,000
        )
        db.add_all([user, member])
        await db.commit()

        # Submit form
        form = await quarterly_service.submit_reactivation_form(user_id=user_id, db=db)
        react_id = form["reactivation_id"]

        # Complete genuine purchase of ₹5,000
        order_id = f"ORD-REACT-SUCCESS-{uuid.uuid4().hex[:6]}"
        res = await quarterly_service.process_reactivation_purchase(
            user_id=user_id,
            reactivation_id=react_id,
            order_id=order_id,
            amount_paid=5000.0,
            payment_status="PAYMENT_SUCCESS",
            order_status="COMPLETED",
            db=db
        )
        assert res["success"] is True
        assert res["reactivation_status"] == "REACTIVATION_APPROVED"
        assert res["uaid"] == original_uaid

        await db.refresh(member)
        assert member.account_activity_status == "ACTIVE"
        assert member.is_reward_eligible is True
        assert member.uaid == original_uaid

        # Verify idempotency: calling get_or_create_account_uaid returns same original UAID
        retained_uaid, is_new = await uaid_service.get_or_create_account_uaid(
            user_id=user_id,
            business_type="RETAILER",
            business_name="Original Retailer",
            db=db
        )
        assert is_new is False
        assert retained_uaid == original_uaid

@pytest.mark.asyncio
async def test_missed_quarters_remain_missed_and_no_retroactive_rewards():
    """
    Test 14 & 15:
    - Previous missed quarters remain historically recorded as MISSED (not retroactively MET).
    - Reactivation does not retroactively create reward events for missed quarters.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"user-no-retro-{uuid.uuid4().hex[:6]}"
        uaid = f"NRY-DS-NORETR-{uuid.uuid4().hex[:4]}"
        user = User(id=user_id, phone=f"+9185{uuid.uuid4().hex[:8]}", role=RoleEnum.BUYER, uaid=uaid)
        member = NetworkMember(
            user_id=user_id,
            uaid=uaid,
            business_type="DISTRIBUTOR",
            account_activity_status="UAID_BLOCKED",
            is_reward_eligible=False,
            missed_quarter_count=2
        )
        # Create Q1 and Q2 uncured records
        q1 = QuarterlyAccountActivity(
            user_id=user_id, uaid=uaid, calendar_year=2026, quarter="Q1",
            required_purchase_count=1, qualifying_purchase_count=0, quarter_status="PENDING"
        )
        q2 = QuarterlyAccountActivity(
            user_id=user_id, uaid=uaid, calendar_year=2026, quarter="Q2",
            required_purchase_count=1, qualifying_purchase_count=0, quarter_status="PENDING"
        )
        db.add_all([user, member, q1, q2])
        await db.commit()

        # Submit form (Distributor 2 missed quarters = 20,000)
        form = await quarterly_service.submit_reactivation_form(user_id=user_id, db=db)
        react_id = form["reactivation_id"]

        # Complete reactivation purchase
        await quarterly_service.process_reactivation_purchase(
            user_id=user_id,
            reactivation_id=react_id,
            order_id=f"ORD-FULFILL-{uuid.uuid4().hex[:6]}",
            amount_paid=20000.0,
            payment_status="PAYMENT_SUCCESS",
            order_status="COMPLETED",
            db=db
        )

        # Invariant 1: Q1 and Q2 remain recorded as MISSED
        await db.refresh(q1)
        await db.refresh(q2)
        assert q1.quarter_status == "MISSED"
        assert q2.quarter_status == "MISSED"
        assert q1.qualifying_purchase_count == 0
        assert q2.qualifying_purchase_count == 0

        # Invariant 2: No retroactive reward events were added to RewardLedger
        ledger_stmt = select(RewardLedger).where(RewardLedger.user_id == user_id)
        ledgers = (await db.execute(ledger_stmt)).scalars().all()
        assert len(ledgers) == 0

@pytest.mark.asyncio
async def test_reactivation_transaction_independently_auditable():
    """
    Test 16:
    - Reactivation transaction and audit logs are independently verifiable and auditable.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"user-audit-react-{uuid.uuid4().hex[:6]}"
        uaid = f"NRY-HS-AUDIT-{uuid.uuid4().hex[:4]}"
        user = User(id=user_id, phone=f"+9184{uuid.uuid4().hex[:8]}", role=RoleEnum.BUYER, uaid=uaid)
        member = NetworkMember(
            user_id=user_id,
            uaid=uaid,
            business_type="WHOLESALER",
            account_activity_status="UAID_BLOCKED",
            is_reward_eligible=False,
            missed_quarter_count=1
        )
        db.add_all([user, member])
        await db.commit()

        # Submit form
        form = await quarterly_service.submit_reactivation_form(user_id=user_id, notes="Annual audit test", db=db)
        react_id = form["reactivation_id"]

        # Process purchase
        order_id = f"ORD-AUDIT-{uuid.uuid4().hex[:6]}"
        await quarterly_service.process_reactivation_purchase(
            user_id=user_id,
            reactivation_id=react_id,
            order_id=order_id,
            amount_paid=100000.0,
            payment_status="PAYMENT_SUCCESS",
            order_status="COMPLETED",
            db=db
        )

        # Verify UAIDReactivationTransaction
        stmt = select(UAIDReactivationTransaction).where(UAIDReactivationTransaction.id == react_id)
        tx = (await db.execute(stmt)).scalars().first()
        assert tx is not None
        assert tx.uaid == uaid
        assert tx.minimum_purchase_unit == 100000.0
        assert tx.required_reactivation_amount == 100000.0
        assert tx.amount_paid == 100000.0
        assert tx.transaction_id == order_id
        assert tx.reactivation_status == "REACTIVATION_APPROVED"
        assert tx.payment_status == "PAYMENT_SUCCESS"
        assert tx.order_status == "ORDER_COMPLETED"
        assert tx.approved_at is not None

        # Verify UAIDReactivationAudit
        audit_stmt = select(UAIDReactivationAudit).where(UAIDReactivationAudit.user_id == user_id)
        audit = (await db.execute(audit_stmt)).scalars().first()
        assert audit is not None
        assert audit.uaid == uaid
        assert audit.qualifying_order_id == order_id
        assert audit.restored_status == "ACTIVE"
