"""
Noryvanta Backend Utility Helpers
"""

def format_currency_inr(amount: float) -> str:
    """Formats float to INR currency string."""
    return f"₹{amount:,.2f}"

def sanitize_phone_number(phone: str) -> str:
    """Normalizes phone number to +91 E.164 standard format."""
    clean = "".join(ch for ch in phone if ch.isdigit() or ch == "+")
    if clean.startswith("+"):
        return clean
    if len(clean) == 10:
        return f"+91{clean}"
    return f"+{clean}"
