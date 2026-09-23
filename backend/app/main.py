from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db, AsyncSessionLocal
from app.api.v1.api import api_router
from app.models.user import User, RoleEnum
from app.models.business import BusinessProfile, KYCStatus, VerificationTier
from app.models.product import Product, TieredPrice
from sqlalchemy import select

async def seed_initial_demo_data():
    """Seeds initial demo vendors and wholesale products if the database is newly initialized."""
    async with AsyncSessionLocal() as session:
        stmt = select(User).where(User.email == "vendor@noryvanta.in")
        res = await session.execute(stmt)
        existing_vendor = res.scalars().first()

        if not existing_vendor:
            # Create default verified vendor user
            vendor_user = User(
                email="vendor@noryvanta.in",
                phone="+919876543210",
                full_name="Rajesh Sharma (Managing Director)",
                role=RoleEnum.VENDOR,
                is_active=True,
                is_verified=True
            )
            session.add(vendor_user)
            await session.flush()

            # Create Business Profile
            biz = BusinessProfile(
                user_id=vendor_user.id,
                legal_name="Apex Precision Instruments Private Limited",
                trade_name="Apex Instruments",
                business_type="PRIVATE_LIMITED",
                gstin="27AABCA1234F1Z5",
                pan="AABCA1234F",
                bank_account_number="91234567890123",
                bank_ifsc="HDFC0001234",
                virtual_escrow_account_id="NORY_VA_27AABCA1234F1Z5",
                primary_category="Industrial Machinery & Automation",
                kyc_status=KYCStatus.VERIFIED,
                tier=VerificationTier.SOVEREIGN_PLATINUM,
                rating=4.95,
                total_sales_volume=18400000.0
            )
            session.add(biz)
            await session.flush()

            # Create Demo Products matching Stitch screens
            products_data = [
                {
                    "title": "Industrial High-Precision Servo Motor 3KW (IP65 Certified)",
                    "slug": "industrial-servo-motor-3kw",
                    "description": "High-torque continuous duty 3KW industrial AC servo motor with closed-loop optical encoder. Engineered for multi-axis CNC machines and precision robotics.",
                    "category": "Industrial Machinery & Automation",
                    "hsn_code": "850152",
                    "gst_rate": 18.0,
                    "base_price": 24500.0,
                    "moq": 5,
                    "stock_quantity": 350,
                    "images": ["https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"],
                    "tiers": [
                        (5, 19, 24500.0),
                        (20, 99, 22800.0),
                        (100, None, 21000.0)
                    ]
                },
                {
                    "title": "Armored Multicore Control Cable 12-Core 1.5 sq mm (100m Roll)",
                    "slug": "armored-multicore-cable-12-core",
                    "description": "Heavy-duty copper conductor armored industrial control cable with flame retardant low smoke (FRLS) insulation. Complies with IS:1554 Part-1.",
                    "category": "Electrical & Electronic Components",
                    "hsn_code": "854449",
                    "gst_rate": 18.0,
                    "base_price": 14200.0,
                    "moq": 10,
                    "stock_quantity": 500,
                    "images": ["https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&w=800&q=80"],
                    "tiers": [
                        (10, 49, 14200.0),
                        (50, 199, 13100.0),
                        (200, None, 11900.0)
                    ]
                },
                {
                    "title": "Stainless Steel 316L Commercial Flanges 4-Inch ANSI Class 150",
                    "slug": "ss316l-commercial-flanges-4-inch",
                    "description": "Drop-forged ASTM A182 SS316L weld neck flanges for petrochemical and chemical process plants. Mill test certificates and ultrasonic testing reports included.",
                    "category": "Raw Materials & Bulk Chemicals",
                    "hsn_code": "730721",
                    "gst_rate": 18.0,
                    "base_price": 3850.0,
                    "moq": 25,
                    "stock_quantity": 1200,
                    "images": ["https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80"],
                    "tiers": [
                        (25, 99, 3850.0),
                        (100, 499, 3450.0),
                        (500, None, 3100.0)
                    ]
                },
                {
                    "title": "Corrugated Heavy-Duty Export Shipping Boxes (Pallet Quantity 500 pcs)",
                    "slug": "corrugated-export-boxes-pallet",
                    "description": "7-ply double-wall kraft corrugated shipping boxes with high edge-crush test (ECT 55) rating. Suitable for heavy export sea freight.",
                    "category": "Commercial B2B Supplies",
                    "hsn_code": "481910",
                    "gst_rate": 12.0,
                    "base_price": 42000.0,
                    "moq": 1,
                    "stock_quantity": 80,
                    "images": ["https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80"],
                    "tiers": [
                        (1, 4, 42000.0),
                        (5, 19, 38500.0),
                        (20, None, 34000.0)
                    ]
                }
            ]

            for pdata in products_data:
                prod = Product(
                    business_id=biz.id,
                    title=pdata["title"],
                    slug=pdata["slug"],
                    description=pdata["description"],
                    category=pdata["category"],
                    hsn_code=pdata["hsn_code"],
                    gst_rate=pdata["gst_rate"],
                    base_price=pdata["base_price"],
                    moq=pdata["moq"],
                    stock_quantity=pdata["stock_quantity"],
                    images=pdata["images"],
                    specifications={"Warranty": "18 Months", "Country of Origin": "India", "Certification": "ISO 9001:2015"}
                )
                session.add(prod)
                await session.flush()

                for min_q, max_q, price in pdata["tiers"]:
                    tp = TieredPrice(
                        product_id=prod.id,
                        min_quantity=min_q,
                        max_quantity=max_q,
                        unit_price=price
                    )
                    session.add(tp)

            # Create default buyer
            buyer_user = User(
                email="buyer@enterprise.com",
                phone="+919123456780",
                full_name="Vikram Mehta (Chief Procurement Officer)",
                role=RoleEnum.BUYER,
                is_active=True,
                is_verified=True
            )
            session.add(buyer_user)

            await session.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    await init_db()
    # Seed initial demo data
    await seed_initial_demo_data()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise B2B Escrow-Powered Commercial Commerce Infrastructure",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,  # Explicit list — never wildcard with credentials
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Request-ID"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", tags=["Root"])
async def root():
    return {
        "platform": settings.PROJECT_NAME,
        "status": "operational",
        "tagline": "CONNECT. GROW. THRIVE.",
        "api_docs": "/docs",
        "api_v1": settings.API_V1_STR
    }
