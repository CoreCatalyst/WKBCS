import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.network_service import (
    calculate_rank_reward_benchmark,
    calculate_rank_multiplier,
    get_minimum_transaction_unit,
    NetworkProgressService
)
from app.models.network import RewardLedger
from app.core.database import AsyncSessionLocal
from sqlalchemy import select, and_

@pytest.mark.asyncio
async def test_wholesaler_reward_exact_math():
    """
    Tests Section 11 & 46: Wholesaler benchmark table.
    Unit = 1,00,000
    Rank 1 (Bronze): 11 * 1,00,000 = 11,00,000 @ 1.10% = ₹12,100
    Rank 2 (Silver): 42 * 1,00,000 = 42,00,000 @ 1.20% = ₹50,400
    Rank 3 (Panna): 93 * 1,00,000 = 93,00,000 @ 1.30% = ₹1,20,900
    Rank 4 (Gold): 164 * 1,00,000 = 1,64,00,000 @ 1.40% = ₹2,29,600
    Rank 12 (Legendary): 1452 * 1,00,000 = 14,52,00,000 @ 2.20% = ₹31,94,400
    """
    bronze = calculate_rank_reward_benchmark("WHOLESALER", 1)
    assert bronze["qualification_multiplier"] == 11
    assert bronze["qualification_amount"] == 1100000.0
    assert bronze["reward_rate"] == 1.10
    assert bronze["reward_amount"] == 12100.0

    silver = calculate_rank_reward_benchmark("WHOLESALER", 2)
    assert silver["qualification_multiplier"] == 42
    assert silver["qualification_amount"] == 4200000.0
    assert silver["reward_rate"] == 1.20
    assert silver["reward_amount"] == 50400.0

    panna = calculate_rank_reward_benchmark("WHOLESALER", 3)
    assert panna["qualification_multiplier"] == 93
    assert panna["qualification_amount"] == 9300000.0
    assert panna["reward_rate"] == 1.30
    assert panna["reward_amount"] == 120900.0

    gold = calculate_rank_reward_benchmark("WHOLESALER", 4)
    assert gold["qualification_multiplier"] == 164
    assert gold["qualification_amount"] == 16400000.0
    assert gold["reward_rate"] == 1.40
    assert gold["reward_amount"] == 229600.0

    legendary = calculate_rank_reward_benchmark("WHOLESALER", 12)
    assert legendary["qualification_multiplier"] == 1452
    assert legendary["qualification_amount"] == 145200000.0
    assert legendary["reward_rate"] == 2.20
    assert legendary["reward_amount"] == 3194400.0

@pytest.mark.asyncio
async def test_distributor_reward_exact_math():
    """
    Tests Section 12 & 46: Distributor benchmark table.
    Unit = 10,000
    Rank 1 (Bronze): 11 * 10,000 = 1,10,000 @ 1.10% = ₹1,210
    Rank 2 (Silver): 42 * 10,000 = 4,20,000 @ 1.20% = ₹5,040
    Rank 3 (Panna): 93 * 10,000 = 9,30,000 @ 1.30% = ₹12,090
    Rank 4 (Gold): 164 * 10,000 = 16,40,000 @ 1.40% = ₹22,960
    """
    b = calculate_rank_reward_benchmark("DISTRIBUTOR", 1)
    assert b["qualification_amount"] == 110000.0
    assert b["reward_rate"] == 1.10
    assert b["reward_amount"] == 1210.0

    s = calculate_rank_reward_benchmark("DISTRIBUTOR", 2)
    assert s["qualification_amount"] == 420000.0
    assert s["reward_rate"] == 1.20
    assert s["reward_amount"] == 5040.0

    p = calculate_rank_reward_benchmark("DISTRIBUTOR", 3)
    assert p["qualification_amount"] == 930000.0
    assert p["reward_rate"] == 1.30
    assert p["reward_amount"] == 12090.0

    g = calculate_rank_reward_benchmark("DISTRIBUTOR", 4)
    assert g["qualification_amount"] == 1640000.0
    assert g["reward_rate"] == 1.40
    assert g["reward_amount"] == 22960.0

@pytest.mark.asyncio
async def test_retailer_reward_exact_math():
    """
    Tests Section 13 & 46: Retailer benchmark table.
    Unit = 5,000
    Rank 1 (Bronze): 11 * 5,000 = 55,000 @ 1.10% = ₹605
    Rank 2 (Silver): 42 * 5,000 = 2,10,000 @ 1.20% = ₹2,520
    Rank 3 (Panna): 93 * 5,000 = 4,65,000 @ 1.30% = ₹6,045
    Rank 4 (Gold): 164 * 5,000 = 8,20,000 @ 1.40% = ₹11,480
    """
    b = calculate_rank_reward_benchmark("RETAILER", 1)
    assert b["qualification_amount"] == 55000.0
    assert b["reward_rate"] == 1.10
    assert b["reward_amount"] == 605.0

    s = calculate_rank_reward_benchmark("RETAILER", 2)
    assert s["qualification_amount"] == 210000.0
    assert s["reward_rate"] == 1.20
    assert s["reward_amount"] == 2520.0

    p = calculate_rank_reward_benchmark("RETAILER", 3)
    assert p["qualification_amount"] == 465000.0
    assert p["reward_rate"] == 1.30
    assert p["reward_amount"] == 6045.0

    g = calculate_rank_reward_benchmark("RETAILER", 4)
    assert g["qualification_amount"] == 820000.0
    assert g["reward_rate"] == 1.40
    assert g["reward_amount"] == 11480.0

@pytest.mark.asyncio
async def test_duplicate_rank_reward_protection():
    """
    Tests Section 47:
    - User completes Level 10 -> Bronze rewarded once.
    - Subsequent transaction for Level 10 -> NO second Bronze reward.
    - User completes Level 20 -> Silver rewarded once; Bronze remains already rewarded.
    """
    user_id = str(uuid.uuid4())
    cycle_number = 1

    async with AsyncSessionLocal() as session:
        # First completion of Rank 1 (Bronze, Level 10)
        entry1 = await NetworkProgressService.process_rank_completion_reward(
            user_id=user_id,
            rank_number=1,
            cycle_number=cycle_number,
            db=session
        )
        assert entry1 is not None
        assert entry1.reward_amount == 12100.0
        assert entry1.status == "REWARDED"

        # Duplicate attempt for Rank 1 (Bronze) in same cycle
        entry_dup = await NetworkProgressService.process_rank_completion_reward(
            user_id=user_id,
            rank_number=1,
            cycle_number=cycle_number,
            db=session
        )
        assert entry_dup is None, "Duplicate reward must NOT be created!"

        # Completion of Rank 2 (Silver, Level 20)
        entry2 = await NetworkProgressService.process_rank_completion_reward(
            user_id=user_id,
            rank_number=2,
            cycle_number=cycle_number,
            db=session
        )
        assert entry2 is not None
        assert entry2.reward_amount == 50400.0
        assert entry2.status == "REWARDED"

        # Verify only 2 distinct ledger entries exist (Bronze and Silver)
        stmt = select(RewardLedger).where(
            and_(
                RewardLedger.user_id == user_id,
                RewardLedger.cycle_number == cycle_number,
                RewardLedger.reward_type == "RANK_COMPLETION"
            )
        )
        entries = (await session.execute(stmt)).scalars().all()
        assert len(entries) == 2
        ranks = {e.rank_number for e in entries}
        assert ranks == {1, 2}

@pytest.mark.asyncio
async def test_immutable_reward_reversal_on_refund():
    """
    Tests Section 50:
    - Qualifying reward is reversed upon order refund via a reversal ledger entry.
    - Historical record is NOT deleted.
    """
    user_id = str(uuid.uuid4())
    cycle_number = 1

    async with AsyncSessionLocal() as session:
        # Issue initial reward for Rank 1
        await NetworkProgressService.process_rank_completion_reward(
            user_id=user_id,
            rank_number=1,
            cycle_number=cycle_number,
            db=session
        )

        # Trigger reversal
        rev_entry = await NetworkProgressService.reverse_rank_reward(
            user_id=user_id,
            rank_number=1,
            cycle_number=cycle_number,
            reason="Order dispute and refund finalized",
            db=session
        )
        assert rev_entry is not None
        assert rev_entry.status == "REVERSED"
        assert "Reversal" in rev_entry.reversal_reference

        # Check that original record is still preserved (immutable ledger)
        stmt = select(RewardLedger).where(RewardLedger.user_id == user_id)
        all_entries = (await session.execute(stmt)).scalars().all()
        assert len(all_entries) == 2  # Original REWARDED + Reversal REVERSED

        # Check wallet calculation accounts for reversal
        wallet = await NetworkProgressService.get_reward_wallet(user_id=user_id, db=session)
        assert wallet.reversed == 12100.0
        assert wallet.available == 0.0

@pytest.mark.asyncio
async def test_referral_reward_api_endpoints():
    """
    Tests Section 38 API endpoints:
    - GET /api/v1/reward-rules
    - GET /api/v1/network/ranks
    - GET /api/v1/rewards/summary
    - GET /api/v1/rewards/ledger
    - GET /api/v1/referrals/my
    - POST /api/v1/referrals/validate
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login user
        unique_phone = f"+9198{uuid.uuid4().int % 100000000:08d}"
        login_res = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": unique_phone,
            "otp_code": "123456",
            "full_name": "Demo Partner",
            "role": "BUSINESS_OWNER"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Configurable reward rules
        rules_res = await ac.get("/api/v1/reward-rules?business_type=WHOLESALER")
        assert rules_res.status_code == 200
        rules_data = rules_res.json()
        assert rules_data["business_type"] == "WHOLESALER"
        assert len(rules_data["ranks"]) == 12
        assert rules_data["ranks"][0]["potential_reward"] == 12100.0

        # 3. 12 Rank cards
        ranks_res = await ac.get("/api/v1/network/ranks", headers=headers)
        assert ranks_res.status_code == 200
        ranks = ranks_res.json()
        assert len(ranks) == 12
        # Bronze, Silver, Panna completed, Gold in progress
        assert ranks[0]["rank_name"] == "Bronze"
        assert ranks[0]["reward_paid"] is True
        assert ranks[3]["rank_name"] == "Gold"
        assert ranks[3]["status"] == "IN_PROGRESS"
        assert ranks[3]["reward_paid"] is False  # Rule 17: projected, not earned yet!

        # 4. Reward Wallet Summary
        wallet_res = await ac.get("/api/v1/rewards/summary", headers=headers)
        assert wallet_res.status_code == 200
        wallet = wallet_res.json()
        assert wallet["currency"] == "INR"
        assert "non-withdrawable" in wallet["disclaimer"].lower()

        # 5. Reward Ledger
        ledger_res = await ac.get("/api/v1/rewards/ledger", headers=headers)
        assert ledger_res.status_code == 200
        ledger = ledger_res.json()
        assert "records" in ledger
        assert "wallet" in ledger

        # 6. Referral Profile & ID
        ref_res = await ac.get("/api/v1/referrals/my", headers=headers)
        assert ref_res.status_code == 200
        ref_data = ref_res.json()
        assert "uaid" in ref_data
        assert "share_url" in ref_data

        # 7. Validate Referral Code
        val_res = await ac.post("/api/v1/referrals/validate", json={"referral_code": "NRY-HS-ABC-482913"})
        assert val_res.status_code == 200
        assert val_res.json()["valid"] is True
