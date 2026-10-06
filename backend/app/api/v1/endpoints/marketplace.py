import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, and_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.product import Product, TieredPrice, ListingType, ListingStatus
from app.models.business import BusinessProfile, BusinessVerificationStatus
from app.schemas.marketplace import (
    MarketplaceListingOut,
    PublicMerchantOut,
    MarketplaceCategoryOut,
    MarketplaceFeaturedResponse,
    MarketplaceSearchResponse
)

router = APIRouter()

# Canonical 12 Marketplace Categories
STANDARD_CATEGORIES = [
    {"name": "Industrial Machinery & Automation", "slug": "industrial-machinery-automation", "icon_name": "Cpu"},
    {"name": "Agricultural Commodities & Organic Produce", "slug": "agricultural-commodities-organic-produce", "icon_name": "Apple"},
    {"name": "Textiles, Yarns & Handlooms", "slug": "textiles-yarns-handlooms", "icon_name": "Shirt"},
    {"name": "Electrical & Electronic Components", "slug": "electrical-electronic-components", "icon_name": "Boxes"},
    {"name": "Construction Materials & Hardware", "slug": "construction-materials-hardware", "icon_name": "Building2"},
    {"name": "Raw Materials & Bulk Chemicals", "slug": "raw-materials-bulk-chemicals", "icon_name": "Factory"},
    {"name": "Corporate & Professional Services", "slug": "corporate-professional-services", "icon_name": "Briefcase"},
    {"name": "Home & Commercial Maintenance", "slug": "home-commercial-maintenance", "icon_name": "Home"},
    {"name": "Automotive Parts & Assemblies", "slug": "automotive-parts-assemblies", "icon_name": "Car"},
    {"name": "Healthcare & Diagnostic Equipment", "slug": "healthcare-diagnostic-equipment", "icon_name": "Stethoscope"},
    {"name": "Education, Training & Skill Centers", "slug": "education-training-skill-centers", "icon_name": "GraduationCap"},
    {"name": "Commercial B2B Supplies", "slug": "commercial-b2b-supplies", "icon_name": "Boxes"},
]

def build_public_merchant(biz: Optional[BusinessProfile]) -> Optional[PublicMerchantOut]:
    """
    Constructs a sanitized public merchant profile.
    Guarantees private banking, PAN, and virtual escrow IDs are strictly isolated.
    """
    if not biz:
        return None
    return PublicMerchantOut(
        id=biz.id,
        trade_name=biz.trade_name or biz.legal_name,
        legal_name=biz.legal_name,
        business_type=biz.business_type or "Retailer",
        business_category=biz.business_category or "General Commerce",
        city=biz.city,
        state=biz.state,
        country=biz.country or "India",
        rating=biz.rating or 5.0,
        is_verified=(biz.verification_status == BusinessVerificationStatus.VERIFIED),
        logo=biz.logo or "https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=200&q=80"
    )

def to_marketplace_listing(prod: Product) -> MarketplaceListingOut:
    return MarketplaceListingOut(
        id=prod.id,
        business_id=prod.business_id,
        type=prod.type.value if hasattr(prod.type, "value") else str(prod.type),
        title=prod.title,
        slug=prod.slug,
        short_description=prod.short_description or prod.description[:160] if prod.description else None,
        description=prod.description,
        category=prod.category,
        subcategory=prod.subcategory,
        currency=prod.currency or "INR",
        base_price=prod.base_price,
        unit=prod.unit or ("piece" if prod.type == ListingType.PRODUCT else "service"),
        hsn_code=prod.hsn_code,
        gst_rate=prod.gst_rate or 18.0,
        moq=prod.moq or 1,
        stock_quantity=prod.stock_quantity or 100,
        availability=prod.availability or "IN_STOCK",
        status=prod.status.value if hasattr(prod.status, "value") else str(prod.status),
        images=prod.images or [],
        specifications=prod.specifications or {},
        tiered_prices=prod.tiered_prices or [],
        created_at=prod.created_at,
        merchant=build_public_merchant(prod.business)
    )

ACTIVE_STATUSES = [ListingStatus.ACTIVE, ListingStatus.PUBLISHED, ListingStatus.APPROVED]

@router.get("/products", response_model=List[MarketplaceListingOut], summary="Public Marketplace Products")
async def get_marketplace_products(
    category: Optional[str] = Query(None, description="Filter by product category"),
    subcategory: Optional[str] = Query(None, description="Filter by subcategory"),
    business_type: Optional[str] = Query(None, description="Filter by merchant tier: Wholesaler, Distributor, Retailer"),
    city: Optional[str] = Query(None, description="Filter by merchant city"),
    min_price: Optional[float] = Query(None, description="Minimum price filter"),
    max_price: Optional[float] = Query(None, description="Maximum price filter"),
    search: Optional[str] = Query(None, description="Search term for title or description"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns only ACTIVE / APPROVED products for public marketplace consumers.
    Protects merchant privacy by excluding private financial and tax attributes.
    """
    stmt = (
        select(Product)
        .join(BusinessProfile, Product.business_id == BusinessProfile.id)
        .options(selectinload(Product.tiered_prices), selectinload(Product.business))
        .where(
            Product.type == ListingType.PRODUCT,
            Product.status.in_(ACTIVE_STATUSES),
            Product.is_active == True
        )
    )

    if category and category != "All":
        stmt = stmt.where(Product.category == category)

    if subcategory:
        stmt = stmt.where(Product.subcategory == subcategory)

    if business_type and business_type != "All":
        stmt = stmt.where(BusinessProfile.business_type.ilike(f"%{business_type}%"))

    if city and city != "All India":
        stmt = stmt.where(BusinessProfile.city.ilike(f"%{city}%"))

    if min_price is not None:
        stmt = stmt.where(Product.base_price >= min_price)

    if max_price is not None:
        stmt = stmt.where(Product.base_price <= max_price)

    if search:
        search_fmt = f"%{search}%"
        stmt = stmt.where(
            or_(
                Product.title.ilike(search_fmt),
                Product.description.ilike(search_fmt),
                BusinessProfile.trade_name.ilike(search_fmt),
                BusinessProfile.legal_name.ilike(search_fmt)
            )
        )

    stmt = stmt.order_by(Product.created_at.desc()).offset(skip).limit(limit)
    res = await db.execute(stmt)
    products = res.scalars().all()
    return [to_marketplace_listing(p) for p in products]

@router.get("/products/{product_id}", response_model=MarketplaceListingOut, summary="Public Product Detail")
async def get_marketplace_product_detail(
    product_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns public detail of a single active product.
    Returns 404 if listing is not ACTIVE or does not exist.
    """
    stmt = (
        select(Product)
        .options(selectinload(Product.tiered_prices), selectinload(Product.business))
        .where(
            or_(Product.id == product_id, Product.slug == product_id),
            Product.type == ListingType.PRODUCT,
            Product.status.in_(ACTIVE_STATUSES),
            Product.is_active == True
        )
    )
    res = await db.execute(stmt)
    prod = res.scalars().first()
    if not prod:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found or not active.")
    return to_marketplace_listing(prod)

@router.get("/services", response_model=List[MarketplaceListingOut], summary="Public Marketplace Services")
async def get_marketplace_services(
    category: Optional[str] = Query(None, description="Filter by service category"),
    service_provider_type: Optional[str] = Query(
        None,
        description="Filter by provider: Registered Service Provider, Skilled Small-Scale Home Service Provider"
    ),
    city: Optional[str] = Query(None, description="Filter by service provider city"),
    min_price: Optional[float] = Query(None, description="Minimum service charge"),
    max_price: Optional[float] = Query(None, description="Maximum service charge"),
    search: Optional[str] = Query(None, description="Search term for service title or description"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns only ACTIVE / APPROVED services for public marketplace consumers.
    Supports Registered Service Providers and Skilled Small-Scale Home Service Providers.
    """
    stmt = (
        select(Product)
        .join(BusinessProfile, Product.business_id == BusinessProfile.id)
        .options(selectinload(Product.tiered_prices), selectinload(Product.business))
        .where(
            Product.type == ListingType.SERVICE,
            Product.status.in_(ACTIVE_STATUSES),
            Product.is_active == True
        )
    )

    if category and category != "All":
        stmt = stmt.where(Product.category == category)

    if service_provider_type and service_provider_type != "All":
        stmt = stmt.where(BusinessProfile.business_type.ilike(f"%{service_provider_type}%"))

    if city and city != "All India":
        stmt = stmt.where(BusinessProfile.city.ilike(f"%{city}%"))

    if min_price is not None:
        stmt = stmt.where(Product.base_price >= min_price)

    if max_price is not None:
        stmt = stmt.where(Product.base_price <= max_price)

    if search:
        search_fmt = f"%{search}%"
        stmt = stmt.where(
            or_(
                Product.title.ilike(search_fmt),
                Product.description.ilike(search_fmt),
                BusinessProfile.trade_name.ilike(search_fmt),
                BusinessProfile.legal_name.ilike(search_fmt)
            )
        )

    stmt = stmt.order_by(Product.created_at.desc()).offset(skip).limit(limit)
    res = await db.execute(stmt)
    services = res.scalars().all()
    return [to_marketplace_listing(s) for s in services]

@router.get("/services/{service_id}", response_model=MarketplaceListingOut, summary="Public Service Detail")
async def get_marketplace_service_detail(
    service_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns public detail of a single active service listing.
    """
    stmt = (
        select(Product)
        .options(selectinload(Product.tiered_prices), selectinload(Product.business))
        .where(
            or_(Product.id == service_id, Product.slug == service_id),
            Product.type == ListingType.SERVICE,
            Product.status.in_(ACTIVE_STATUSES),
            Product.is_active == True
        )
    )
    res = await db.execute(stmt)
    serv = res.scalars().first()
    if not serv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found or not active.")
    return to_marketplace_listing(serv)

@router.get("/categories", response_model=List[MarketplaceCategoryOut], summary="Marketplace Categories with Live Counts")
async def get_marketplace_categories(db: AsyncSession = Depends(get_db)):
    """
    Returns the canonical 12 marketplace categories with live counts of active products and services.
    """
    # Query product counts grouped by category
    stmt_prod = (
        select(Product.category, func.count(Product.id))
        .where(
            Product.type == ListingType.PRODUCT,
            Product.status.in_(ACTIVE_STATUSES),
            Product.is_active == True
        )
        .group_by(Product.category)
    )
    res_prod = await db.execute(stmt_prod)
    prod_counts = dict(res_prod.all())

    # Query service counts grouped by category
    stmt_serv = (
        select(Product.category, func.count(Product.id))
        .where(
            Product.type == ListingType.SERVICE,
            Product.status.in_(ACTIVE_STATUSES),
            Product.is_active == True
        )
        .group_by(Product.category)
    )
    res_serv = await db.execute(stmt_serv)
    serv_counts = dict(res_serv.all())

    out = []
    for cat in STANDARD_CATEGORIES:
        p_count = prod_counts.get(cat["name"], 0)
        s_count = serv_counts.get(cat["name"], 0)
        out.append(MarketplaceCategoryOut(
            id=cat["slug"],
            name=cat["name"],
            slug=cat["slug"],
            icon_name=cat["icon_name"],
            product_count=p_count,
            service_count=s_count,
            total_listings=p_count + s_count
        ))
    return out

@router.get("/featured", response_model=MarketplaceFeaturedResponse, summary="Curated Featured Active Listings for Home Page")
async def get_marketplace_featured(
    limit: int = Query(6, ge=1, le=20),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns curated active products and active services directly for the home page showcase.
    """
    # Active Products
    stmt_p = (
        select(Product)
        .options(selectinload(Product.tiered_prices), selectinload(Product.business))
        .where(
            Product.type == ListingType.PRODUCT,
            Product.status.in_(ACTIVE_STATUSES),
            Product.is_active == True
        )
        .order_by(Product.created_at.desc())
        .limit(limit)
    )
    res_p = await db.execute(stmt_p)
    prods = res_p.scalars().all()

    # Active Services
    stmt_s = (
        select(Product)
        .options(selectinload(Product.tiered_prices), selectinload(Product.business))
        .where(
            Product.type == ListingType.SERVICE,
            Product.status.in_(ACTIVE_STATUSES),
            Product.is_active == True
        )
        .order_by(Product.created_at.desc())
        .limit(limit)
    )
    res_s = await db.execute(stmt_s)
    servs = res_s.scalars().all()

    return MarketplaceFeaturedResponse(
        products=[to_marketplace_listing(p) for p in prods],
        services=[to_marketplace_listing(s) for s in servs]
    )

@router.get("/search", response_model=MarketplaceSearchResponse, summary="Unified Marketplace Search")
async def search_marketplace(
    q: Optional[str] = Query(None, description="Search query string"),
    type: str = Query("ALL", description="Listing type: ALL, PRODUCT, SERVICE"),
    category: Optional[str] = Query(None, description="Category filter"),
    city: Optional[str] = Query(None, description="City location filter"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Unified multi-parameter marketplace search across Products and Services.
    """
    stmt = (
        select(Product)
        .join(BusinessProfile, Product.business_id == BusinessProfile.id)
        .options(selectinload(Product.tiered_prices), selectinload(Product.business))
        .where(
            Product.status.in_(ACTIVE_STATUSES),
            Product.is_active == True
        )
    )

    if type == "PRODUCT":
        stmt = stmt.where(Product.type == ListingType.PRODUCT)
    elif type == "SERVICE":
        stmt = stmt.where(Product.type == ListingType.SERVICE)

    if category and category != "All":
        stmt = stmt.where(Product.category == category)

    if city and city != "All India":
        stmt = stmt.where(BusinessProfile.city.ilike(f"%{city}%"))

    if q:
        search_fmt = f"%{q}%"
        stmt = stmt.where(
            or_(
                Product.title.ilike(search_fmt),
                Product.description.ilike(search_fmt),
                Product.hsn_code.ilike(search_fmt),
                BusinessProfile.trade_name.ilike(search_fmt)
            )
        )

    # Count totals
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    # Paginate
    offset = (page - 1) * limit
    stmt = stmt.order_by(Product.created_at.desc()).offset(offset).limit(limit)
    res = await db.execute(stmt)
    items = res.scalars().all()

    mapped_items = [to_marketplace_listing(item) for item in items]
    p_count = sum(1 for item in mapped_items if item.type == "PRODUCT")
    s_count = sum(1 for item in mapped_items if item.type == "SERVICE")

    return MarketplaceSearchResponse(
        items=mapped_items,
        total=total,
        product_count=p_count,
        service_count=s_count,
        page=page,
        limit=limit
    )
