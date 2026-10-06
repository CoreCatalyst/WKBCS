from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db, AsyncSessionLocal
from app.api.v1.api import api_router
from app.models.user import User, RoleEnum
from app.models.business import BusinessProfile, KYCStatus, VerificationTier, BusinessVerificationStatus, BusinessTypeEnum
from app.models.product import Product, TieredPrice, ListingType, ListingStatus
from sqlalchemy import select, func

async def seed_initial_demo_data():
    """Seeds initial demo vendors and wholesale products if the database is newly initialized."""
    async with AsyncSessionLocal() as session:
        stmt = select(User).where(User.email == "vendor@noryvanta.in")
        res = await session.execute(stmt)
        existing_vendor = res.scalars().first()

        if not existing_vendor:
            # 1. Create default verified Wholesaler vendor user
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

            biz = BusinessProfile(
                user_id=vendor_user.id,
                legal_name="Apex Precision Instruments Private Limited",
                trade_name="Apex Instruments",
                business_type="Wholesaler",
                business_category="Industrial Machinery & Automation",
                city="Mumbai",
                state="Maharashtra",
                country="India",
                gstin="27AABCA1234F1Z5",
                pan="AABCA1234F",
                bank_account_number="91234567890123",
                bank_ifsc="HDFC0001234",
                virtual_escrow_account_id="NORY_VA_27AABCA1234F1Z5",
                verification_status=BusinessVerificationStatus.VERIFIED,
                kyc_status=KYCStatus.VERIFIED,
                tier=VerificationTier.SOVEREIGN_PLATINUM,
                rating=4.95,
                total_sales_volume=18400000.0,
                logo="https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=200&q=80"
            )
            session.add(biz)
            await session.flush()

            # 2. Create Distributor Business Profile
            dist_user = User(
                email="distributor@noryvanta.in",
                phone="+919876543222",
                full_name="Sunil Agarwal (Director of Distribution)",
                role=RoleEnum.VENDOR,
                is_active=True,
                is_verified=True
            )
            session.add(dist_user)
            await session.flush()

            dist_biz = BusinessProfile(
                user_id=dist_user.id,
                legal_name="National Electrical Supply & Distribution Corporation",
                trade_name="National Electrical Distributors",
                business_type="Distributor",
                business_category="Electrical & Electronic Components",
                city="Delhi NCR",
                state="Delhi",
                country="India",
                gstin="07AABCN1234D1Z9",
                pan="AABCN1234D",
                verification_status=BusinessVerificationStatus.VERIFIED,
                kyc_status=KYCStatus.VERIFIED,
                tier=VerificationTier.GOLD,
                rating=4.88,
                total_sales_volume=9200000.0,
                logo="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=200&q=80"
            )
            session.add(dist_biz)
            await session.flush()

            # 3. Create Retailer Business Profile
            retail_user = User(
                email="retailer@noryvanta.in",
                phone="+919876543233",
                full_name="Pooja Patel (Proprietor)",
                role=RoleEnum.VENDOR,
                is_active=True,
                is_verified=True
            )
            session.add(retail_user)
            await session.flush()

            retail_biz = BusinessProfile(
                user_id=retail_user.id,
                legal_name="Precision Industrial Hardware Retail Store",
                trade_name="Precision Retail Hub",
                business_type="Retailer",
                business_category="Construction Materials & Hardware",
                city="Ahmedabad",
                state="Gujarat",
                country="India",
                gstin="24AABCP1234R1Z1",
                pan="AABCP1234R",
                verification_status=BusinessVerificationStatus.VERIFIED,
                kyc_status=KYCStatus.VERIFIED,
                tier=VerificationTier.SILVER,
                rating=4.82,
                total_sales_volume=3400000.0,
                logo="https://images.unsplash.com/photo-1541888946425-d0fbb1861593?auto=format&fit=crop&w=200&q=80"
            )
            session.add(retail_biz)
            await session.flush()

            # 4. Create Registered Service Provider Profile
            service_user = User(
                email="corp.service@noryvanta.in",
                phone="+919876543244",
                full_name="Dr. Arvind Varma (Head of Field Engineering)",
                role=RoleEnum.VENDOR,
                is_active=True,
                is_verified=True
            )
            session.add(service_user)
            await session.flush()

            service_biz = BusinessProfile(
                user_id=service_user.id,
                legal_name="Apex Engineering & Industrial Maintenance Services LLP",
                trade_name="Apex Diagnostic & Calibration Services",
                business_type="Registered Service Provider",
                business_category="Corporate & Professional Services",
                city="Bengaluru",
                state="Karnataka",
                country="India",
                gstin="29AABCA9999S1Z2",
                pan="AABCA9999S",
                verification_status=BusinessVerificationStatus.VERIFIED,
                kyc_status=KYCStatus.VERIFIED,
                tier=VerificationTier.SOVEREIGN_PLATINUM,
                rating=4.96,
                total_sales_volume=7800000.0,
                logo="https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=200&q=80"
            )
            session.add(service_biz)
            await session.flush()

            # 5. Create Skilled Small-Scale Home Service Provider Profile
            home_service_user = User(
                email="home.service@noryvanta.in",
                phone="+919876543255",
                full_name="Kaveri Electrical Works & Automation",
                role=RoleEnum.VENDOR,
                is_active=True,
                is_verified=True
            )
            session.add(home_service_user)
            await session.flush()

            home_service_biz = BusinessProfile(
                user_id=home_service_user.id,
                legal_name="Kaveri Home & Electrical Maintenance Services",
                trade_name="Kaveri Electrical Works",
                business_type="Skilled Small-Scale Home Service Provider",
                business_category="Home & Commercial Maintenance",
                city="Bengaluru",
                state="Karnataka",
                country="India",
                gstin="29AABCK5555H1Z4",
                pan="AABCK5555H",
                verification_status=BusinessVerificationStatus.VERIFIED,
                kyc_status=KYCStatus.VERIFIED,
                tier=VerificationTier.STANDARD,
                rating=4.91,
                total_sales_volume=1200000.0,
                logo="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=200&q=80"
            )
            session.add(home_service_biz)
            await session.flush()

            # 6. Create Demo Wholesale Products
            products_data = [
                {
                    "biz_id": biz.id,
                    "type": ListingType.PRODUCT,
                    "title": "Industrial High-Precision Servo Motor 3KW (IP65 Certified)",
                    "slug": "industrial-servo-motor-3kw",
                    "description": "High-torque continuous duty 3KW industrial AC servo motor with closed-loop optical encoder. Engineered for multi-axis CNC machines and precision robotics.",
                    "category": "Industrial Machinery & Automation",
                    "hsn_code": "850152",
                    "gst_rate": 18.0,
                    "base_price": 24500.0,
                    "unit": "piece",
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
                    "biz_id": dist_biz.id,
                    "type": ListingType.PRODUCT,
                    "title": "Armored Multicore Control Cable 12-Core 1.5 sq mm (100m Roll)",
                    "slug": "armored-multicore-cable-12-core",
                    "description": "Heavy-duty copper conductor armored industrial control cable with flame retardant low smoke (FRLS) insulation. Complies with IS:1554 Part-1.",
                    "category": "Electrical & Electronic Components",
                    "hsn_code": "854449",
                    "gst_rate": 18.0,
                    "base_price": 14200.0,
                    "unit": "roll (100m)",
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
                    "biz_id": biz.id,
                    "type": ListingType.PRODUCT,
                    "title": "Stainless Steel 316L Commercial Flanges 4-Inch ANSI Class 150",
                    "slug": "ss316l-commercial-flanges-4-inch",
                    "description": "Drop-forged ASTM A182 SS316L weld neck flanges for petrochemical and chemical process plants. Mill test certificates and ultrasonic testing reports included.",
                    "category": "Raw Materials & Bulk Chemicals",
                    "hsn_code": "730721",
                    "gst_rate": 18.0,
                    "base_price": 3850.0,
                    "unit": "piece",
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
                    "biz_id": retail_biz.id,
                    "type": ListingType.PRODUCT,
                    "title": "Corrugated Heavy-Duty Export Shipping Boxes (Pallet Quantity 500 pcs)",
                    "slug": "corrugated-export-boxes-pallet",
                    "description": "7-ply double-wall kraft corrugated shipping boxes with high edge-crush test (ECT 55) rating. Suitable for heavy export sea freight.",
                    "category": "Commercial B2B Supplies",
                    "hsn_code": "481910",
                    "gst_rate": 12.0,
                    "base_price": 42000.0,
                    "unit": "pallet (500 pcs)",
                    "moq": 1,
                    "stock_quantity": 80,
                    "images": ["https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80"],
                    "tiers": [
                        (1, 4, 42000.0),
                        (5, 19, 38500.0),
                        (20, None, 34000.0)
                    ]
                },
                # Services
                {
                    "biz_id": service_biz.id,
                    "type": ListingType.SERVICE,
                    "title": "Industrial CNC & Servo Calibration Diagnostic Service",
                    "slug": "industrial-cnc-servo-calibration-diagnostic",
                    "description": "Comprehensive onsite laser interferometry calibration and preventive diagnostic analysis for multi-axis CNC machines and robotic servo actuators. ISO/IEC 17025 compliant reporting.",
                    "category": "Corporate & Professional Services",
                    "hsn_code": "998313",
                    "gst_rate": 18.0,
                    "base_price": 12500.0,
                    "unit": "visit",
                    "moq": 1,
                    "stock_quantity": 100,
                    "images": ["https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80"],
                    "tiers": [
                        (1, 4, 12500.0),
                        (5, 9, 11000.0),
                        (10, None, 9500.0)
                    ]
                },
                {
                    "biz_id": home_service_biz.id,
                    "type": ListingType.SERVICE,
                    "title": "Certified Master Electrician & Switchgear Installation Service",
                    "slug": "certified-master-electrician-switchgear-installation",
                    "description": "Govt-licensed electrical contractor service for commercial and residential three-phase switchgear installation, distribution board wiring, fault detection, and earthing audits.",
                    "category": "Home & Commercial Maintenance",
                    "hsn_code": "995461",
                    "gst_rate": 18.0,
                    "base_price": 650.0,
                    "unit": "hour",
                    "moq": 1,
                    "stock_quantity": 100,
                    "images": ["https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80"],
                    "tiers": [
                        (1, 7, 650.0),
                        (8, 23, 600.0),
                        (24, None, 550.0)
                    ]
                }
            ]

            for pdata in products_data:
                prod = Product(
                    business_id=pdata["biz_id"],
                    type=pdata["type"],
                    title=pdata["title"],
                    slug=pdata["slug"],
                    description=pdata["description"],
                    category=pdata["category"],
                    hsn_code=pdata["hsn_code"],
                    gst_rate=pdata["gst_rate"],
                    base_price=pdata["base_price"],
                    unit=pdata["unit"],
                    moq=pdata["moq"],
                    stock_quantity=pdata["stock_quantity"],
                    images=pdata["images"],
                    status=ListingStatus.ACTIVE,
                    is_active=True,
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

from fastapi.responses import PlainTextResponse
from app.models.order import Order

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

@app.get("/metrics", response_class=PlainTextResponse, tags=["Monitoring & Prometheus"])
async def metrics():
    """
    Prometheus scraping endpoint exporting key Noryvanta platform performance metrics.
    Scraped by Prometheus and visualized in Grafana dashboards.
    """
    async with AsyncSessionLocal() as session:
        users_count = (await session.execute(select(func.count(User.id)))).scalar() or 0
        biz_count = (await session.execute(select(func.count(BusinessProfile.id)))).scalar() or 0
        orders_count = (await session.execute(select(func.count(Order.id)))).scalar() or 0
        gmv_sum = (await session.execute(select(func.sum(Order.total_amount)))).scalar() or 0.0

    lines = [
        "# HELP noryvanta_registered_users_total Total number of registered users on platform",
        "# TYPE noryvanta_registered_users_total counter",
        f"noryvanta_registered_users_total {users_count}",
        "# HELP noryvanta_registered_businesses_total Total registered business profiles",
        "# TYPE noryvanta_registered_businesses_total counter",
        f"noryvanta_registered_businesses_total {biz_count}",
        "# HELP noryvanta_orders_total Total commercial orders placed",
        "# TYPE noryvanta_orders_total counter",
        f"noryvanta_orders_total {orders_count}",
        "# HELP noryvanta_gmv_rupees_total Total Gross Merchandise Value in INR",
        "# TYPE noryvanta_gmv_rupees_total counter",
        f"noryvanta_gmv_rupees_total {gmv_sum:.2f}",
        "# HELP noryvanta_backend_status Operational health state (1 = healthy)",
        "# TYPE noryvanta_backend_status gauge",
        "noryvanta_backend_status 1"
    ]
    return "\n".join(lines) + "\n"
