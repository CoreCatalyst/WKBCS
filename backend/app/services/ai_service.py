import re
from typing import List, Optional
from app.schemas.product import AIListingRequest, AIListingResponse, TieredPriceSchema

class AIService:
    @staticmethod
    def generate_listing_metadata(request: AIListingRequest) -> AIListingResponse:
        raw = request.raw_title.strip()
        words = [w.capitalize() for w in re.split(r'\s+', raw)]
        clean_title = " ".join(words)

        # Determine category and HSN heuristic
        lower = raw.lower()
        if any(k in lower for k in ["motor", "pump", "servo", "cnc", "bearing", "lathe"]):
            hsn = "850152"
            gst = 18.0
            category = "Industrial Machinery & Automation"
            optimized_title = f"Heavy-Duty {clean_title} (Industrial Grade / IP65 Certified)"
            features_text = " • High-torque continuous duty\n • Advanced thermal dissipation\n • Precision CNC engineering"
        elif any(k in lower for k in ["cable", "circuit", "sensor", "relay", "pcb", "led"]):
            hsn = "853690"
            gst = 18.0
            category = "Electrical & Electronic Components"
            optimized_title = f"Commercial Grade {clean_title} - High Reliability Edition"
            features_text = " • Low-loss conductivity\n • Fire-retardant industrial housing\n • ISO 9001:2015 tested"
        elif any(k in lower for k in ["steel", "aluminum", "copper", "polymer", "resin", "chemical"]):
            hsn = "720839"
            gst = 18.0
            category = "Raw Materials & Bulk Chemicals"
            optimized_title = f"Prime Certified {clean_title} (Mill Test Certified)"
            features_text = " • 100% Virgin Grade material\n • ASTM/IS Standards compliant\n • Full lot traceability"
        else:
            hsn = "847989"
            gst = 18.0
            category = request.category_hint or "Commercial B2B Supplies"
            optimized_title = f"Verified Enterprise {clean_title} - Wholesale Ready"
            features_text = " • Engineered for commercial production\n • Batch quality assurance verified\n • Direct factory sourcing"

        seo_description = (
            f"{optimized_title} is specifically manufactured for verified B2B commercial applications and wholesale enterprise procurement.\n\n"
            f"Key Technical Highlights:\n{features_text}\n\n"
            f"Regulatory Compliance: HSN Code {hsn}, Standard GST Slab {gst}%. Every shipment includes complete test certificates and GST tax invoice with e-way bill clearance."
        )

        tags = [
            "B2B Wholesale",
            category.split("&")[0].strip(),
            "Verified Supplier",
            "Escrow Protected",
            f"HSN-{hsn}"
        ]

        # Suggest bulk tiered pricing
        suggested_tiers = [
            TieredPriceSchema(min_quantity=10, max_quantity=49, unit_price=2450.0),
            TieredPriceSchema(min_quantity=50, max_quantity=199, unit_price=2250.0),
            TieredPriceSchema(min_quantity=200, max_quantity=None, unit_price=1980.0)
        ]

        return AIListingResponse(
            optimized_title=optimized_title,
            suggested_hsn=hsn,
            gst_rate_percent=gst,
            seo_description=seo_description,
            suggested_tags=tags,
            suggested_tiers=suggested_tiers
        )
