"""
Noryvanta Authoritative Financial & Platform Fee Calculation Service.
Enforces Section 32 Financial Rules:
- Platform fee is calculated strictly on Eligible Net Business Transaction Value:
  Eligible Base = Gross Item Value - Eligible Merchant-Funded Discounts
- Taxes (GST), Shipping/Delivery, Gateway Fees, Platform Fees, and Reward Credits are EXCLUDED from the fee base.
- Customer Payable and Business Settlement are strictly separate calculations.
- Decimal/NUMERIC arithmetic with ROUND_HALF_UP precision.
- Mixed cart calculations by merchant business category.
- Refund fee reversal uses original transaction's applied rate.
"""
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

TWO_PLACES = Decimal("0.01")

def to_decimal(val: Any) -> Decimal:
    """Safely convert any numeric/string value to Decimal."""
    if val is None:
        return Decimal("0.00")
    if isinstance(val, Decimal):
        return val
    return Decimal(str(val))

def quantize_currency(val: Decimal) -> Decimal:
    """Quantize to standard currency format (2 decimal places, ROUND_HALF_UP)."""
    return val.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

class FinancialBreakdown(BaseModel):
    currency: str = "INR"
    gross_business_value: float
    merchant_discount_amount: float
    platform_discount_amount: float
    eligible_business_value: float
    tax_amount: float
    shipping_amount: float
    payment_fee_amount: float
    platform_fee_percentage: float
    platform_fee_base_amount: float
    platform_fee_amount: float
    customer_payable_amount: float
    business_settlement_amount: float
    tds_amount: float

class MixedCartMerchantBreakdown(BaseModel):
    business_id: str
    business_type: str
    gross_value: float
    merchant_discount: float
    eligible_business_value: float
    fee_percentage: float
    platform_fee: float

class FeeCalculationService:
    @staticmethod
    def calculate_eligible_net_business_value(
        gross_value: Any,
        merchant_discount: Any = 0,
        platform_discount: Any = 0
    ) -> Decimal:
        """
        Section 32.1 & 32.12:
        Eligible Net Business Transaction Value = Product/Service Gross Value - Merchant-Funded Discounts.
        Platform-funded discounts and reward balance do NOT reduce merchant's eligible sales base.
        """
        gross_dec = to_decimal(gross_value)
        merchant_disc_dec = to_decimal(merchant_discount)
        eligible_base = max(Decimal("0.00"), gross_dec - merchant_disc_dec)
        return quantize_currency(eligible_base)

    @staticmethod
    def calculate_platform_fee(
        eligible_business_value: Any,
        fee_rate_percentage: Any
    ) -> Decimal:
        """
        Section 32.2 & 32.5:
        Platform Fee = Eligible Net Business Transaction Value × Platform Fee Rate.
        Platform fee is never calculated on taxes, shipping, gateway fees, or itself.
        """
        base_dec = to_decimal(eligible_business_value)
        rate_dec = to_decimal(fee_rate_percentage)
        fee = base_dec * (rate_dec / Decimal("100"))
        return quantize_currency(fee)

    @staticmethod
    def calculate_customer_payable(
        eligible_business_value: Any,
        tax_amount: Any,
        shipping_amount: Any = 0,
        other_customer_charges: Any = 0
    ) -> Decimal:
        """
        Section 32.6:
        Customer Payable = Eligible Net Business Value + Applicable Taxes + Shipping + Other Charges.
        Platform fee is business-side only (0 buyer surcharge).
        """
        base_dec = to_decimal(eligible_business_value)
        tax_dec = to_decimal(tax_amount)
        ship_dec = to_decimal(shipping_amount)
        other_dec = to_decimal(other_customer_charges)
        total = base_dec + tax_dec + ship_dec + other_dec
        return quantize_currency(total)

    @staticmethod
    def calculate_business_settlement(
        eligible_business_value: Any,
        platform_fee: Any,
        tds_rate_percentage: Any = 1.0,
        gateway_fee: Any = 0,
        adjustments: Any = 0
    ) -> Dict[str, Decimal]:
        """
        Section 32.7:
        Business Settlement Base = Eligible Net Business Value - Platform Fee - TDS (194-O) - Gateway Fee ± Adjustments.
        """
        base_dec = to_decimal(eligible_business_value)
        fee_dec = to_decimal(platform_fee)
        tds_rate_dec = to_decimal(tds_rate_percentage)
        tds_dec = quantize_currency(base_dec * (tds_rate_dec / Decimal("100")))
        gw_dec = to_decimal(gateway_fee)
        adj_dec = to_decimal(adjustments)

        net_settle = base_dec - fee_dec - tds_dec - gw_dec + adj_dec
        return {
            "net_settlement": quantize_currency(net_settle),
            "tds_amount": tds_dec,
            "platform_fee": fee_dec
        }

    @staticmethod
    def calculate_full_financial_breakdown(
        gross_value: Any,
        merchant_discount: Any = 0,
        platform_discount: Any = 0,
        tax_amount: Any = 0,
        shipping_amount: Any = 0,
        payment_fee_amount: Any = 0,
        platform_fee_percentage: Any = 5.20,
        tds_percentage: Any = 1.0,
        currency: str = "INR"
    ) -> FinancialBreakdown:
        """
        Complete transparent financial calculation following Section 32.21 & 32.23 hierarchy.
        """
        gross_dec = quantize_currency(to_decimal(gross_value))
        m_disc_dec = quantize_currency(to_decimal(merchant_discount))
        p_disc_dec = quantize_currency(to_decimal(platform_discount))
        tax_dec = quantize_currency(to_decimal(tax_amount))
        ship_dec = quantize_currency(to_decimal(shipping_amount))
        gw_dec = quantize_currency(to_decimal(payment_fee_amount))
        rate_dec = to_decimal(platform_fee_percentage)

        # 1. Eligible Net Business Value
        eligible_base_dec = FeeCalculationService.calculate_eligible_net_business_value(
            gross_value=gross_dec,
            merchant_discount=m_disc_dec,
            platform_discount=p_disc_dec
        )

        # 2. Platform Fee (calculated strictly on eligible_base_dec)
        fee_dec = FeeCalculationService.calculate_platform_fee(
            eligible_business_value=eligible_base_dec,
            fee_rate_percentage=rate_dec
        )

        # 3. Customer Payable (subtotal base + taxes + shipping; ZERO buyer platform fee)
        # Note: If platform discount is sponsored, customer pays less, but merchant still gets credited
        customer_payable_dec = FeeCalculationService.calculate_customer_payable(
            eligible_business_value=max(Decimal("0.00"), eligible_base_dec - p_disc_dec),
            tax_amount=tax_dec,
            shipping_amount=ship_dec,
            other_customer_charges=gw_dec
        )

        # 4. Business Settlement
        settle_res = FeeCalculationService.calculate_business_settlement(
            eligible_business_value=eligible_base_dec,
            platform_fee=fee_dec,
            tds_rate_percentage=tds_percentage,
            gateway_fee=Decimal("0.00")
        )

        return FinancialBreakdown(
            currency=currency,
            gross_business_value=float(gross_dec),
            merchant_discount_amount=float(m_disc_dec),
            platform_discount_amount=float(p_disc_dec),
            eligible_business_value=float(eligible_base_dec),
            tax_amount=float(tax_dec),
            shipping_amount=float(ship_dec),
            payment_fee_amount=float(gw_dec),
            platform_fee_percentage=float(rate_dec),
            platform_fee_base_amount=float(eligible_base_dec),
            platform_fee_amount=float(fee_dec),
            customer_payable_amount=float(customer_payable_dec),
            business_settlement_amount=float(settle_res["net_settlement"]),
            tds_amount=float(settle_res["tds_amount"])
        )

    @staticmethod
    def calculate_mixed_cart_platform_fees(
        items: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Section 32.16: Mixed Cart / Mixed Business Types
        Calculates platform fees per merchant based on each merchant's own business category.
        """
        merchant_groups: Dict[str, Dict[str, Any]] = {}

        for item in items:
            biz_id = item.get("business_id", "default")
            biz_type = (item.get("business_type") or "SERVICES").strip().upper()
            gross = to_decimal(item.get("gross_value", item.get("line_total", 0)))
            discount = to_decimal(item.get("merchant_discount", 0))
            fee_rate = to_decimal(item.get("fee_rate", 5.20))

            if biz_id not in merchant_groups:
                merchant_groups[biz_id] = {
                    "business_id": biz_id,
                    "business_type": biz_type,
                    "gross_value": Decimal("0.00"),
                    "merchant_discount": Decimal("0.00"),
                    "fee_rate": fee_rate,
                }
            merchant_groups[biz_id]["gross_value"] += gross
            merchant_groups[biz_id]["merchant_discount"] += discount

        total_fee = Decimal("0.00")
        total_eligible_value = Decimal("0.00")
        breakdown_list: List[MixedCartMerchantBreakdown] = []

        for biz_id, grp in merchant_groups.items():
            eligible = FeeCalculationService.calculate_eligible_net_business_value(
                gross_value=grp["gross_value"],
                merchant_discount=grp["merchant_discount"]
            )
            fee = FeeCalculationService.calculate_platform_fee(
                eligible_business_value=eligible,
                fee_rate_percentage=grp["fee_rate"]
            )
            total_eligible_value += eligible
            total_fee += fee

            breakdown_list.append(MixedCartMerchantBreakdown(
                business_id=biz_id,
                business_type=grp["business_type"],
                gross_value=float(grp["gross_value"]),
                merchant_discount=float(grp["merchant_discount"]),
                eligible_business_value=float(eligible),
                fee_percentage=float(grp["fee_rate"]),
                platform_fee=float(fee)
            ))

        return {
            "total_platform_fee": float(quantize_currency(total_fee)),
            "total_eligible_value": float(quantize_currency(total_eligible_value)),
            "merchant_breakdowns": [b.model_dump() for b in breakdown_list]
        }

    @staticmethod
    def calculate_platform_fee_reversal(
        refunded_eligible_business_value: Any,
        original_applied_fee_rate: Any
    ) -> Decimal:
        """
        Section 32.14 & 32.15: Partial & Full Refunds
        Reverses platform fee using the original transaction's applied rate.
        Never recalculates historical transactions or uses current rate.
        """
        refund_base_dec = to_decimal(refunded_eligible_business_value)
        orig_rate_dec = to_decimal(original_applied_fee_rate)
        fee_reversal = refund_base_dec * (orig_rate_dec / Decimal("100"))
        return quantize_currency(fee_reversal)

fee_calculation_service = FeeCalculationService()
