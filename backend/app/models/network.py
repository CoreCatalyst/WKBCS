import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Enum as SQLEnum, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

class NetworkLevelStatus(str, Enum):
    LOCKED = "LOCKED"
    IN_PROGRESS = "IN_PROGRESS"
    TRANSACTION_RECEIVED = "TRANSACTION_RECEIVED"
    UNDER_VERIFICATION = "UNDER_VERIFICATION"
    QUALIFIED = "QUALIFIED"
    REWARD_PENDING = "REWARD_PENDING"
    REWARD_APPROVED = "REWARD_APPROVED"
    REVERSED = "REVERSED"
    CYCLE_COMPLETED = "CYCLE_COMPLETED"

class CycleStatus(str, Enum):
    NOT_STARTED = "NOT_STARTED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    SUSPENDED = "SUSPENDED"
    CLOSED = "CLOSED"

class RewardStatus(str, Enum):
    NOT_ELIGIBLE = "NOT_ELIGIBLE"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    ELIGIBLE = "ELIGIBLE"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    REVERSED = "REVERSED"
    PAID = "PAID"

class NetworkMember(Base):
    __tablename__ = "network_members"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    consumer_name = Column(String(100), default="A", nullable=False)
    uaid = Column(String(50), unique=True, index=True, nullable=False)  # e.g., NRY-XXXX
    sponsor_uaid = Column(String(50), nullable=True)  # Direct upline sponsor UAID
    business_type = Column(String(50), default="WHOLESALER", nullable=False)  # WHOLESALER, DISTRIBUTOR, RETAILER, SERVICE_PROVIDER
    account_activity_status = Column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, REMINDER, FINAL_WARNING, MISSED_QUARTER, GRACE_PERIOD, INACTIVE_PENDING_BLOCK, UAID_BLOCKED
    is_reward_eligible = Column(Boolean, default=True, nullable=False)
    
    # Progressive Warning & Grace Period Lifecycle fields
    current_warning_stage = Column(String(50), default="NONE", nullable=False) # NONE, REMINDER_30, REMINDER_15, FINAL_WARNING_7, MISSED_QUARTER, GRACE_PERIOD, INACTIVE_PENDING_BLOCK, UAID_BLOCKED
    grace_period_end_date = Column(DateTime, nullable=True)
    final_notice_end_date = Column(DateTime, nullable=True)
    last_warning_sent_at = Column(DateTime, nullable=True)
    last_warning_message = Column(String(500), nullable=True)

    # Anti-abuse tracking metrics
    missed_quarter_count = Column(Integer, default=0, nullable=False)
    total_block_events = Column(Integer, default=0, nullable=False)
    total_reactivations = Column(Integer, default=0, nullable=False)
    last_reactivation_date = Column(DateTime, nullable=True)

    current_cycle_number = Column(Integer, default=1, nullable=False)
    current_level_number = Column(Integer, default=37, nullable=False)
    current_rank_name = Column(String(50), default="Gold", nullable=False)
    unused_carry_forward_amount = Column(Float, default=0.0, nullable=False)
    qualifying_volume_current_cycle = Column(Float, default=0.0, nullable=False)
    kyc_verified = Column(Boolean, default=True, nullable=False)  # Displayed in GREEN

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="network_member")
    cycles = relationship("NetworkCycle", back_populates="member", cascade="all, delete-orphan")
    levels = relationship("NetworkLevelRecord", back_populates="member", cascade="all, delete-orphan")

class NetworkCycle(Base):
    __tablename__ = "network_cycles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    member_id = Column(String(36), ForeignKey("network_members.id", ondelete="CASCADE"), nullable=False)
    cycle_number = Column(Integer, nullable=False)  # 1, 2, 3...
    status = Column(SQLEnum(CycleStatus), default=CycleStatus.ACTIVE, nullable=False)
    current_level = Column(Integer, default=1, nullable=False)
    carry_forward_in = Column(Float, default=0.0, nullable=False)
    carry_forward_out = Column(Float, default=0.0, nullable=False)
    total_qualifying_volume = Column(Float, default=0.0, nullable=False)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime, nullable=True)

    member = relationship("NetworkMember", back_populates="cycles")
    levels = relationship("NetworkLevelRecord", back_populates="cycle", cascade="all, delete-orphan")

class NetworkLevelRecord(Base):
    __tablename__ = "network_level_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    member_id = Column(String(36), ForeignKey("network_members.id", ondelete="CASCADE"), nullable=False)
    cycle_id = Column(String(36), ForeignKey("network_cycles.id", ondelete="CASCADE"), nullable=False)
    level_number = Column(Integer, nullable=False, index=True)  # 1 to 120
    rank_name = Column(String(50), nullable=False)             # Bronze, Silver, Panna, Gold, Platinum...
    
    # Controlled Status State Machine
    status = Column(SQLEnum(NetworkLevelStatus), default=NetworkLevelStatus.LOCKED, nullable=False)
    
    # Verification & Audit Sub-states
    transaction_reference = Column(String(100), nullable=True)
    transaction_status = Column(String(50), default="NONE", nullable=False)  # NONE, RECEIVED, VERIFIED
    verification_status = Column(String(50), default="NONE", nullable=False) # NONE, IN_PROGRESS, VERIFIED, FAILED
    qualification_status = Column(String(50), default="NONE", nullable=False) # NONE, PENDING, QUALIFIED, DISQUALIFIED
    reward_status = Column(String(50), default="NONE", nullable=False)        # NONE, PENDING, APPROVED, REVERSED
    
    # Timestamps
    completed_at = Column(DateTime, nullable=True)
    reversed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    member = relationship("NetworkMember", back_populates="levels")
    cycle = relationship("NetworkCycle", back_populates="levels")
    history = relationship("LevelStatusHistory", back_populates="level", cascade="all, delete-orphan")

class LevelStatusHistory(Base):
    __tablename__ = "level_status_histories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    level_id = Column(String(36), ForeignKey("network_level_records.id", ondelete="CASCADE"), nullable=False)
    old_status = Column(String(50), nullable=False)
    new_status = Column(String(50), nullable=False)
    reason = Column(String(255), nullable=True)
    performed_by = Column(String(36), nullable=True)  # system or admin user id
    reference_id = Column(String(100), nullable=True) # order or transaction id
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    level = relationship("NetworkLevelRecord", back_populates="history")

class RewardRecord(Base):
    __tablename__ = "reward_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    member_id = Column(String(36), ForeignKey("network_members.id", ondelete="CASCADE"), nullable=False)
    level_number = Column(Integer, nullable=False)
    cycle_number = Column(Integer, default=1, nullable=False)
    amount = Column(Float, default=0.0, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    status = Column(SQLEnum(RewardStatus), default=RewardStatus.PENDING_VERIFICATION, nullable=False)
    qualification_rule_version = Column(String(50), default="v1.0-rules", nullable=False)
    approved_by = Column(String(36), nullable=True)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class RewardRule(Base):
    """
    Configurable reward rule parameters per business type and rank.
    """
    __tablename__ = "reward_rules"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_type = Column(String(50), nullable=False, index=True)  # WHOLESALER, DISTRIBUTOR, RETAILER, SERVICE_PROVIDER
    rank_number = Column(Integer, nullable=False, index=True)       # 1 to 12
    rank_name = Column(String(50), nullable=False)                 # Bronze, Silver, Panna, Gold...
    start_level = Column(Integer, nullable=False)                  # 1, 11, 21...
    end_level = Column(Integer, nullable=False)                    # 10, 20, 30...
    completion_level = Column(Integer, nullable=False)             # 10, 20, 30...
    minimum_transaction_unit = Column(Float, nullable=False)       # 100000, 10000, 5000
    qualification_multiplier = Column(Integer, nullable=False)     # rank_number * (rank_number * 10 + 1)
    reward_rate = Column(Float, nullable=False)                    # 1.10, 1.20, ... 2.20
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class RewardLedger(Base):
    """
    Immutable ledger of one-time rank qualification rewards and reversals.
    Enforces Rule 5 & Rule 16: UNIQUE(user_id, cycle_number, rank_number, reward_type)
    """
    __tablename__ = "reward_ledger"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(String(36), nullable=True)
    referral_id = Column(String(36), nullable=True, index=True)
    transaction_id = Column(String(100), nullable=True, index=True)
    cycle_number = Column(Integer, default=1, nullable=False)
    rank_number = Column(Integer, nullable=False)
    rank_name = Column(String(50), nullable=False)
    qualification_level = Column(Integer, nullable=False)
    business_type = Column(String(50), nullable=False)  # WHOLESALER, DISTRIBUTOR, RETAILER, SERVICE_PROVIDER
    gross_amount = Column(Float, default=0.0, nullable=False)
    tax_amount = Column(Float, default=0.0, nullable=False)
    eligible_amount = Column(Float, default=0.0, nullable=False)
    qualification_amount = Column(Float, default=0.0, nullable=False)
    reward_rate = Column(Float, default=0.0, nullable=False)
    reward_amount = Column(Float, default=0.0, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    reward_type = Column(String(50), default="RANK_COMPLETION", nullable=False)
    status = Column(String(50), default="REWARDED", nullable=False)  # PENDING, APPROVED, REWARDED, REVERSED
    reversal_reference = Column(String(100), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "cycle_number", "rank_number", "reward_type", name="uq_user_cycle_rank_reward"),
    )


class Referral(Base):
    """
    User referral mapping recording direct network affiliations.
    """
    __tablename__ = "referrals"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    referrer_user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    referrer_uaid = Column(String(50), nullable=False, index=True)
    referred_user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    referred_uaid = Column(String(50), nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class ReferralTransaction(Base):
    """
    Transactions associated with referrals that qualify for network volume.
    Enforces Rule 10 (no self-purchase) & Rule 12 (taxes excluded).
    """
    __tablename__ = "referral_transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    referral_id = Column(String(36), ForeignKey("referrals.id", ondelete="CASCADE"), nullable=True, index=True)
    referrer_user_id = Column(String(36), nullable=False, index=True)
    buyer_user_id = Column(String(36), nullable=False, index=True)
    order_id = Column(String(100), nullable=True, index=True)
    gross_amount = Column(Float, default=0.0, nullable=False)
    tax_amount = Column(Float, default=0.0, nullable=False)
    eligible_amount = Column(Float, default=0.0, nullable=False)
    is_self_purchase = Column(Boolean, default=False, nullable=False)
    is_referral_purchase = Column(Boolean, default=True, nullable=False)
    status = Column(String(50), default="COMPLETED", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class UAIDGenerationLog(Base):
    """
    Audit log for every UAID generation attempt as required by Section 1.
    Tracks account/user ID, generated UAID, timestamp, registration/KYC status, request ID, and result.
    """
    __tablename__ = "uaid_generation_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True)
    uaid = Column(String(50), nullable=True, index=True)
    request_id = Column(String(100), nullable=True, index=True)
    registration_status = Column(String(50), default="COMPLETED", nullable=False)
    kyc_status = Column(String(50), default="PENDING", nullable=False)
    result = Column(String(50), nullable=False)  # SUCCESS, DUPLICATE, REJECTED
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class QuarterlyAccountActivity(Base):
    """
    Tracks minimum quarterly purchase activity compliance as required by Section 2 & 7.
    Q1: Jan 1 - Mar 31, Q2: Apr 1 - Jun 30, Q3: Jul 1 - Sep 30, Q4: Oct 1 - Dec 31.
    4 purchases in one quarter does NOT satisfy four quarters.
    """
    __tablename__ = "quarterly_account_activities"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    uaid = Column(String(50), nullable=False, index=True)
    calendar_year = Column(Integer, nullable=False, index=True)
    quarter = Column(String(10), nullable=False, index=True)  # Q1, Q2, Q3, Q4
    required_purchase_count = Column(Integer, default=1, nullable=False)
    qualifying_purchase_count = Column(Integer, default=0, nullable=False)
    first_qualifying_purchase_id = Column(String(100), nullable=True)
    last_qualifying_purchase_id = Column(String(100), nullable=True)
    quarter_status = Column(String(50), default="PENDING", nullable=False)  # MET, PENDING, MISSED, CURED_IN_GRACE
    is_cured_during_grace = Column(Boolean, default=False, nullable=False)
    cure_order_id = Column(String(100), nullable=True)
    cure_timestamp = Column(DateTime, nullable=True)
    evaluated_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "calendar_year", "quarter", name="uq_user_year_quarter"),
    )


class UAIDReactivationAudit(Base):
    """
    Audit log for UAID reactivation events as required by the progressive quarterly workflow.
    Preserves original UAID, logs qualifying purchase ID, timestamp, and audit trail.
    """
    __tablename__ = "uaid_reactivation_audits"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True)
    uaid = Column(String(50), nullable=False, index=True)
    qualifying_order_id = Column(String(100), nullable=False)
    reactivated_by = Column(String(50), default="SYSTEM_VERIFICATION", nullable=False)
    previous_status = Column(String(50), default="UAID_BLOCKED", nullable=False)
    restored_status = Column(String(50), default="ACTIVE", nullable=False)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class UAIDReactivationTransaction(Base):
    """
    Dedicated transaction and audit record for UAID Reactivation.
    Formula: required_reactivation_amount = minimum_purchase_unit * missed_quarter_count.
    Status transitions:
    FORM_SUBMITTED -> AMOUNT_CALCULATED -> PAYMENT_PENDING -> PAYMENT_SUCCESS ->
    ORDER_PENDING -> ORDER_COMPLETED -> REACTIVATION_APPROVED
    (or REACTIVATION_REJECTED / REACTIVATION_CANCELLED)
    """
    __tablename__ = "uaid_reactivation_transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    uaid = Column(String(50), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    business_type = Column(String(50), nullable=False)
    missed_quarter_count = Column(Integer, default=1, nullable=False)
    minimum_purchase_unit = Column(Float, nullable=False)
    required_reactivation_amount = Column(Float, nullable=False)
    
    transaction_id = Column(String(100), nullable=True, index=True)
    amount_paid = Column(Float, default=0.0, nullable=False)
    payment_status = Column(String(50), default="PAYMENT_PENDING", nullable=False)
    order_status = Column(String(50), default="ORDER_PENDING", nullable=False)
    reactivation_status = Column(String(50), default="FORM_SUBMITTED", nullable=False)
    
    submitted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    approved_at = Column(DateTime, nullable=True)
    activated_at = Column(DateTime, nullable=True)
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class LevelProgressionLedger(Base):
    """
    Immutable ledger of level qualification and progression events (Section 33.14).
    Enforces distinct auditable events: LEVEL_COMPLETED, LEVEL_REVERSED.
    Unique constraint: (user_id, cycle_number, level_number, event_type).
    """
    __tablename__ = "level_progression_ledgers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(String(36), nullable=True)
    uaid = Column(String(50), nullable=False, index=True)
    cycle_number = Column(Integer, default=1, nullable=False)
    business_type = Column(String(50), nullable=False)
    level_number = Column(Integer, nullable=False, index=True)
    previous_level = Column(Integer, default=0, nullable=False)
    new_level = Column(Integer, nullable=False)
    qualifying_transaction_id = Column(String(100), nullable=True, index=True)
    qualifying_network_volume = Column(Float, default=0.0, nullable=False)
    minimum_required_amount = Column(Float, nullable=False)
    qualified_amount = Column(Float, default=0.0, nullable=False)
    remaining_unapplied_amount = Column(Float, default=0.0, nullable=False)
    rule_id = Column(String(50), nullable=True)
    rule_version = Column(String(50), default="v1.0", nullable=False)
    event_type = Column(String(50), default="LEVEL_COMPLETED", nullable=False)
    status = Column(String(50), default="VERIFIED", nullable=False)
    event_timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "cycle_number", "level_number", "event_type", name="uq_user_cycle_level_event"),
    )


class LevelQualificationAllocation(Base):
    """
    Qualification allocation audit tracking how transactions are consumed per level (Section 35.1 & 40).
    Tracks exact amounts allocated, unallocated carry-forward, and status.
    """
    __tablename__ = "level_qualification_allocations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(String(36), nullable=True)
    uaid = Column(String(50), nullable=False, index=True)
    cycle_number = Column(Integer, default=1, nullable=False)
    transaction_id = Column(String(100), nullable=False, index=True)
    business_type = Column(String(50), nullable=False)
    transaction_eligible_amount = Column(Float, default=0.0, nullable=False)
    amount_allocated_to_level = Column(Float, default=0.0, nullable=False)
    amount_remaining = Column(Float, default=0.0, nullable=False)
    level_number = Column(Integer, nullable=False, index=True)
    allocation_status = Column(String(50), default="ALLOCATED", nullable=False)
    rule_id = Column(String(50), nullable=True)
    rule_version = Column(String(50), default="v1.0", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("cycle_number", "level_number", "transaction_id", name="uq_cycle_level_tx_alloc"),
    )






