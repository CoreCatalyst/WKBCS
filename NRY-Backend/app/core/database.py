from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# If DATABASE_URL starts with postgresql://, translate to asyncpg for async SQLAlchemy
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    db_url,
    echo=False,
    future=True,
    pool_pre_ping=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        try:
            from sqlalchemy import text
            await conn.execute(text("ALTER TABLE products ADD COLUMN videos JSON DEFAULT '[]'"))
        except Exception:
            pass  # Column already exists
        try:
            from sqlalchemy import text
            await conn.execute(text("ALTER TABLE users ADD COLUMN customer_referral_code VARCHAR(50)"))
        except Exception:
            pass
        try:
            from sqlalchemy import text
            await conn.execute(text("ALTER TABLE network_members ADD COLUMN has_valid_customer_referral BOOLEAN DEFAULT 0"))
        except Exception:
            pass
        try:
            from sqlalchemy import text
            await conn.execute(text("ALTER TABLE network_members ADD COLUMN reward_eligibility_timestamp DATETIME"))
        except Exception:
            pass

    # Ensure essential statutory platform fee rules exist in any environment (production, test, development)
    async with AsyncSessionLocal() as session:
        try:
            from sqlalchemy import select
            from decimal import Decimal
            from app.models.escrow import PlatformFeeRule

            statutory_rules = [
                ("fee-rule-wholesaler-v1", "WHOLESALER", Decimal("3.20")),
                ("fee-rule-distributor-v1", "DISTRIBUTOR", Decimal("5.20")),
                ("fee-rule-services-v1", "SERVICES", Decimal("5.20")),
                ("fee-rule-retailer-v1", "RETAILER", Decimal("8.20")),
            ]
            for rule_id, biz_type, fee_pct in statutory_rules:
                stmt = select(PlatformFeeRule).where(
                    PlatformFeeRule.business_type == biz_type,
                    PlatformFeeRule.version == 1
                )
                res = await session.execute(stmt)
                if not res.scalars().first():
                    rule = PlatformFeeRule(
                        id=rule_id,
                        business_type=biz_type,
                        fee_percentage=fee_pct,
                        currency_scope="INR",
                        status="ACTIVE",
                        version=1,
                        change_reason=f"Statutory platform fee rule ({biz_type} {fee_pct}%)",
                        created_by="SYSTEM_INIT"
                    )
                    session.add(rule)
            await session.commit()
        except Exception:
            await session.rollback()

    # Ensure baseline platform administrator accounts exist
    async with AsyncSessionLocal() as session:
        try:
            from sqlalchemy import select, or_
            from app.models.user import User, RoleEnum
            from app.core.security import get_password_hash

            admins_to_seed = [
                {
                    "email": "admin@noryvantaglobal.com",
                    "phone": "+919800099999",
                    "full_name": "Platform Super Admin",
                    "password": "AdminSecure2026!"
                },
                {
                    "email": "sysadmin@noryvantaglobal.com",
                    "phone": "+919999900000",
                    "full_name": "Platform Admin",
                    "password": "AdminSecure2026!"
                }
            ]

            for admin_info in admins_to_seed:
                stmt = select(User).where(
                    or_(User.email == admin_info["email"], User.phone == admin_info["phone"])
                )
                res = await session.execute(stmt)
                existing = res.scalars().first()
                if not existing:
                    user = User(
                        email=admin_info["email"],
                        phone=admin_info["phone"],
                        full_name=admin_info["full_name"],
                        role=RoleEnum.ADMIN,
                        is_active=True,
                        is_verified=True,
                        hashed_password=get_password_hash(admin_info["password"])
                    )
                    session.add(user)
                else:
                    existing.role = RoleEnum.ADMIN
                    existing.is_active = True
                    existing.is_verified = True
            await session.commit()
        except Exception:
            await session.rollback()
