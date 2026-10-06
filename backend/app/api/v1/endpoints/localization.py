from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.schemas.localization import CountryOut, LanguageOut, GatewayOut

router = APIRouter()

class LocationDivision(BaseModel):
    name: str
    code: Optional[str] = None

POPULAR_COUNTRIES = [
    CountryOut(code="IN", name="India", currency="INR", phone_code="+91", flag_emoji="🇮🇳", is_active=True, cod_enabled=True, cod_max_limit=10000.0, supported_gateways=["RAZORPAY", "CASHFREE"]),
    CountryOut(code="US", name="United States", currency="USD", phone_code="+1", flag_emoji="🇺🇸", is_active=True, cod_enabled=False, cod_max_limit=0.0, supported_gateways=["RAZORPAY"]),
    CountryOut(code="GB", name="United Kingdom", currency="GBP", phone_code="+44", flag_emoji="🇬🇧", is_active=True, cod_enabled=False, cod_max_limit=0.0, supported_gateways=["RAZORPAY"]),
    CountryOut(code="AE", name="United Arab Emirates", currency="AED", phone_code="+971", flag_emoji="🇦🇪", is_active=True, cod_enabled=False, cod_max_limit=0.0, supported_gateways=["RAZORPAY"]),
    CountryOut(code="SG", name="Singapore", currency="SGD", phone_code="+65", flag_emoji="🇸🇬", is_active=True, cod_enabled=False, cod_max_limit=0.0, supported_gateways=["RAZORPAY"]),
    CountryOut(code="AU", name="Australia", currency="AUD", phone_code="+61", flag_emoji="🇦🇺", is_active=True, cod_enabled=False, cod_max_limit=0.0, supported_gateways=["RAZORPAY"]),
    CountryOut(code="CA", name="Canada", currency="CAD", phone_code="+1", flag_emoji="🇨🇦", is_active=True, cod_enabled=False, cod_max_limit=0.0, supported_gateways=["RAZORPAY"]),
]

OFFICIAL_LANGUAGES = [
    LanguageOut(code="en", name="English", native_name="English", is_active=True, is_default=True),
    LanguageOut(code="hi", name="Hindi", native_name="हिन्दी", is_active=True, is_default=False),
    LanguageOut(code="mr", name="Marathi", native_name="मराठी", is_active=True, is_default=False),
    LanguageOut(code="bn", name="Bengali", native_name="বাংলা", is_active=True, is_default=False),
    LanguageOut(code="ta", name="Tamil", native_name="தமிழ்", is_active=True, is_default=False),
    LanguageOut(code="te", name="Telugu", native_name="తెలుగు", is_active=True, is_default=False),
    LanguageOut(code="gu", name="Gujarati", native_name="ગુજરાતી", is_active=True, is_default=False),
    LanguageOut(code="kn", name="Kannada", native_name="ಕನ್ನಡ", is_active=True, is_default=False),
    LanguageOut(code="ml", name="Malayalam", native_name="മലയാളം", is_active=True, is_default=False),
    LanguageOut(code="pa", name="Punjabi", native_name="ਪੰਜਾਬੀ", is_active=True, is_default=False),
]

COUNTRY_LANGUAGE_MAP: Dict[str, List[LanguageOut]] = {
    "IN": OFFICIAL_LANGUAGES,
    "US": [LanguageOut(code="en", name="English", native_name="English", is_active=True, is_default=True), LanguageOut(code="es", name="Spanish", native_name="Español", is_active=True, is_default=False)],
    "GB": [LanguageOut(code="en", name="English", native_name="English", is_active=True, is_default=True)],
    "AE": [LanguageOut(code="ar", name="Arabic", native_name="العربية", is_active=True, is_default=True), LanguageOut(code="en", name="English", native_name="English", is_active=True, is_default=False)],
    "SG": [LanguageOut(code="en", name="English", native_name="English", is_active=True, is_default=True), LanguageOut(code="zh", name="Mandarin", native_name="中文", is_active=True, is_default=False), LanguageOut(code="ms", name="Malay", native_name="Bahasa Melayu", is_active=True, is_default=False), LanguageOut(code="ta", name="Tamil", native_name="தமிழ்", is_active=True, is_default=False)],
    "AU": [LanguageOut(code="en", name="English", native_name="English", is_active=True, is_default=True)],
    "CA": [LanguageOut(code="en", name="English", native_name="English", is_active=True, is_default=True), LanguageOut(code="fr", name="French", native_name="Français", is_active=True, is_default=False)],
}

STATES_MAP: Dict[str, List[str]] = {
    "IN": [
        "Maharashtra", "Gujarat", "Karnataka", "Tamil Nadu", "Delhi", "Telangana",
        "Uttar Pradesh", "West Bengal", "Rajasthan", "Punjab", "Haryana", "Kerala",
        "Madhya Pradesh", "Andhra Pradesh", "Bihar", "Odisha", "Assam"
    ],
    "US": ["California", "New York", "Texas", "Florida", "Illinois", "Washington", "Massachusetts"],
    "GB": ["England", "Scotland", "Wales", "Northern Ireland"],
    "AE": ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"],
    "SG": ["Central", "East", "North", "North-East", "West"],
    "AU": ["New South Wales", "Victoria", "Queensland", "Western Australia", "South Australia"],
    "CA": ["Ontario", "Quebec", "British Columbia", "Alberta", "Manitoba"]
}

DISTRICTS_MAP: Dict[str, List[str]] = {
    "maharashtra": ["Mumbai City", "Mumbai Suburban", "Pune", "Thane", "Nagpur", "Nashik", "Aurangabad", "Solapur"],
    "gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar"],
    "karnataka": ["Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Belagavi", "Dakshina Kannada", "Dharwad"],
    "tamil nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli"],
    "delhi": ["Central Delhi", "New Delhi", "North Delhi", "South Delhi", "West Delhi", "East Delhi"],
    "telangana": ["Hyderabad", "Ranga Reddy", "Medchal-Malkajgiri", "Warangal", "Nizamabad"],
    "uttar pradesh": ["Lucknow", "Kanpur Nagar", "Gautam Buddha Nagar (Noida)", "Varanasi", "Agra", "Ghaziabad"],
    "west bengal": ["Kolkata", "North 24 Parganas", "South 24 Parganas", "Howrah", "Hooghly"],
    "rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer"],
    "punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "SAS Nagar (Mohali)"]
}

GATEWAYS = [
    GatewayOut(gateway_name="RAZORPAY", display_name="Razorpay Payments", is_active=True, priority="PRIMARY", supported_methods=["UPI", "CARD", "NETBANKING", "WALLET"]),
    GatewayOut(gateway_name="CASHFREE", display_name="Cashfree Payments", is_active=True, priority="SECONDARY", supported_methods=["UPI", "CARD", "NETBANKING"]),
]

@router.get("/countries", response_model=List[CountryOut], summary="List Supported Countries & Payment Routing")
async def list_countries():
    return POPULAR_COUNTRIES

@router.get("/countries/{country_code}/states", response_model=List[str], summary="List States/Provinces for Country")
async def list_states(country_code: str):
    code = country_code.upper()
    return STATES_MAP.get(code, ["State / Province"])

@router.get("/states/{state_name}/districts", response_model=List[str], summary="List Districts/Counties for State")
async def list_districts(state_name: str):
    norm = state_name.strip().lower()
    return DISTRICTS_MAP.get(norm, [f"{state_name} District 1", f"{state_name} District 2", "Central District"])

@router.get("/countries/{country_code}/languages", response_model=List[LanguageOut], summary="List Languages for Selected Country")
async def list_country_languages(country_code: str):
    code = country_code.upper()
    return COUNTRY_LANGUAGE_MAP.get(code, OFFICIAL_LANGUAGES)

@router.get("/languages", response_model=List[LanguageOut], summary="List Supported Regional Indian & Global Languages")
async def list_languages():
    return OFFICIAL_LANGUAGES

@router.get("/gateways", response_model=List[GatewayOut], summary="List Active Payment Gateways & Methods")
async def list_gateways():
    return GATEWAYS
