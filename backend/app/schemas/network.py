from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class LevelTimelineEventOut(BaseModel):
    id: str
    title: str
    description: str
    timestamp: str
    status: str
    icon: str

class NetworkLevelOut(BaseModel):
    level_number: int
    rank_name: str
    status: str
    level_value: float = 0.0
    transaction_status: str
    verification_status: str
    qualification_status: str
    reward_status: str
    transaction_reference: Optional[str] = None
    completed_at: Optional[datetime] = None
    reversed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class LevelDetailOut(BaseModel):
    level_number: int
    rank_name: str
    status: str
    cycle_number: int
    level_value: float = 0.0
    eligible_transaction_amount: float = 0.0
    transaction_status: str
    verification_status: str
    qualification_status: str
    reward_status: str
    business_type: str = "WHOLESALER"
    minimum_required_amount: float = 0.0
    eligible_volume_applied: float = 0.0
    remaining_amount: float = 0.0
    completed_at: Optional[datetime] = None
    activity_timeline: List[LevelTimelineEventOut] = []

    model_config = ConfigDict(from_attributes=True)

class NetworkSummaryMetrics(BaseModel):
    current_level: int = 37
    current_rank: str = "Gold"
    completed_levels: int = 36
    in_progress_levels: int = 1
    qualified_levels: int = 37
    pending_verification: int = 1
    reward_pending: int = 1
    reward_approved: int = 35
    reversed_levels: int = 0
    locked_levels: int = 80
    kyc_status: str = "Verified"
    minimum_required_per_level: float = 100000.0
    eligible_network_volume: float = 0.0
    next_level_requirement: float = 0.0
    unapplied_network_volume: float = 0.0

class RecentNetworkActivityOut(BaseModel):
    level_number: int
    status: str
    description: str
    timestamp_relative: str

class RankProgressOut(BaseModel):
    rank_number: int
    rank_name: str
    start_level: int
    end_level: int
    completion_level: int
    minimum_unit: float
    qualification_multiplier: int
    qualification_amount: float
    reward_rate: float
    potential_reward: float
    current_level: int
    status: str  # LOCKED, IN_PROGRESS, QUALIFIED, REWARD_PENDING, REWARDED, REVERSED
    is_completed: bool
    is_current: bool
    reward_paid: bool

class NetworkProgressResponse(BaseModel):
    consumer: str = "A"
    uaid: str = "NRY-XXXX"
    business_type: str = "WHOLESALER"
    current_cycle: str = "Cycle 1"
    current_level: int = 37
    current_rank: str = "Gold"
    kyc_status: str = "Verified"
    summary: NetworkSummaryMetrics
    ranks: List[RankProgressOut] = []
    levels: List[NetworkLevelOut]
    recent_activity: List[RecentNetworkActivityOut]

class CycleHistoryOut(BaseModel):
    cycle_number: int
    status: str
    current_level: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class RewardWalletOut(BaseModel):
    total_earned: float = 0.0
    available: float = 0.0
    pending: float = 0.0
    redeemed: float = 0.0
    reversed: float = 0.0
    currency: str = "INR"
    disclaimer: str = (
        "Rewards are for eligible Noryvanta ecosystem repurchases and platform use only "
        "and are strictly non-withdrawable as cash under current terms."
    )

class RewardLedgerOut(BaseModel):
    id: str
    user_id: str
    cycle_number: int
    rank_number: int
    rank_name: str
    qualification_level: int
    business_type: str
    gross_amount: float = 0.0
    tax_amount: float = 0.0
    eligible_amount: float = 0.0
    qualification_amount: float = 0.0
    reward_rate: float = 0.0
    reward_amount: float = 0.0
    currency: str = "INR"
    reward_type: str = "RANK_COMPLETION"
    status: str = "REWARDED"
    transaction_id: Optional[str] = None
    reversal_reference: Optional[str] = None
    verified_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class RewardLedgerSummaryOut(BaseModel):
    total_records: int
    wallet: RewardWalletOut
    records: List[RewardLedgerOut]

class LevelProgressionLedgerOut(BaseModel):
    id: str
    user_id: str
    uaid: str
    cycle_number: int
    business_type: str
    level_number: int
    previous_level: int
    new_level: int
    qualifying_transaction_id: Optional[str] = None
    qualifying_network_volume: float = 0.0
    minimum_required_amount: float = 0.0
    qualified_amount: float = 0.0
    remaining_unapplied_amount: float = 0.0
    rule_id: Optional[str] = None
    rule_version: str = "v1.0"
    event_type: str = "LEVEL_COMPLETED"
    status: str = "VERIFIED"
    event_timestamp: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class LevelQualificationAllocationOut(BaseModel):
    id: str
    user_id: str
    uaid: str
    cycle_number: int
    transaction_id: str
    business_type: str
    transaction_eligible_amount: float
    amount_allocated_to_level: float
    amount_remaining: float
    level_number: int
    allocation_status: str
    rule_id: Optional[str] = None
    rule_version: str = "v1.0"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ReferralInfoOut(BaseModel):
    uaid: str
    referral_code: str
    share_url: str
    qr_payload: str
    total_referrals: int = 0
    active_referrals: int = 0
    qualifying_volume: float = 0.0
    currency: str = "INR"

class ReferralValidateIn(BaseModel):
    referral_code: str

class ReferralValidateOut(BaseModel):
    valid: bool
    referrer_uaid: Optional[str] = None
    business_name: Optional[str] = None
    business_type: Optional[str] = None
    message: str

class ReferralShareIn(BaseModel):
    channel: str = "DIRECT"  # WHATSAPP, EMAIL, SMS, DIRECT

class ReferralShareOut(BaseModel):
    share_url: str
    referral_code: str
    share_text: str

class ReferralNetworkMemberOut(BaseModel):
    id: str
    referred_uaid: str
    business_name: Optional[str] = "Independent Partner"
    business_type: Optional[str] = "RETAILER"
    joined_at: datetime
    qualifying_purchases: float = 0.0
    status: str = "ACTIVE"

class RewardRuleOut(BaseModel):
    business_type: str
    rank_number: int
    rank_name: str
    start_level: int
    end_level: int
    completion_level: int
    minimum_transaction_unit: float
    qualification_multiplier: int
    reward_rate: float
    qualification_amount: float
    potential_reward: float

class RewardRulesResponse(BaseModel):
    business_type: str
    minimum_transaction_unit: float
    ranks: List[RewardRuleOut]


class LevelQualificationAllocationOut(BaseModel):
    id: str
    user_id: str
    uaid: str
    cycle_number: int
    transaction_id: str
    business_type: str
    transaction_eligible_amount: float
    amount_allocated_to_level: float
    amount_remaining: float
    level_number: int
    allocation_status: str
    rule_id: Optional[str] = None
    rule_version: str = "v1.0"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
