import logging
import httpx
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class MapsService:
    """
    Service for geocoding and location resolution:
    Converts Address / Country / State / District / City / PIN Code -> Lat & Long.
    """
    GEOCODING_API_URL = "https://maps.googleapis.com/maps/api/geocode/json"

    # Known Indian commercial hub coordinates for development simulation & instant test fallback
    FALLBACK_COORDINATES = {
        "mumbai": (19.0760, 72.8777),
        "delhi": (28.7041, 77.1025),
        "bangalore": (12.9716, 77.5946),
        "bengaluru": (12.9716, 77.5946),
        "hyderabad": (17.3850, 78.4867),
        "ahmedabad": (23.0225, 72.5714),
        "chennai": (13.0827, 80.2707),
        "kolkata": (22.5726, 88.3639),
        "pune": (18.5204, 73.8567),
        "surat": (21.1702, 72.8311),
        "jaipur": (26.9124, 75.7873),
        "default": (20.5937, 78.9629)  # Center of India
    }

    @classmethod
    async def geocode_address(
        cls,
        address: Optional[str] = None,
        city: Optional[str] = None,
        district: Optional[str] = None,
        state: Optional[str] = None,
        country: Optional[str] = "India",
        pin_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Geocodes structured address parameters into coordinates (lat, long) and formatted address.
        """
        # Compose address query string
        components = [c for c in [address, city, district, state, pin_code, country] if c]
        query_string = ", ".join(components)

        if not query_string:
            return {
                "latitude": 20.5937,
                "longitude": 78.9629,
                "formatted_address": "India",
                "source": "default_fallback"
            }

        # If API key is present and not mock, query Google Maps Geocoding API
        api_key = settings.GOOGLE_MAPS_API_KEY
        if api_key and not api_key.startswith("mock") and settings.APP_ENV != "test":
            try:
                async with httpx.AsyncClient(timeout=6.0) as client:
                    params = {"address": query_string, "key": api_key}
                    res = await client.get(cls.GEOCODING_API_URL, params=params)
                    if res.status_code == 200:
                        data = res.json()
                        if data.get("status") == "OK" and data.get("results"):
                            result = data["results"][0]
                            loc = result["geometry"]["location"]
                            return {
                                "latitude": float(loc["lat"]),
                                "longitude": float(loc["lng"]),
                                "formatted_address": result.get("formatted_address", query_string),
                                "place_id": result.get("place_id"),
                                "source": "google_maps_api"
                            }
            except Exception as e:
                logger.warning(f"[MapsService] Google Maps API call failed: {e}. Using intelligent fallback.")

        # Intelligent local fallback matching city name
        city_lookup = (city or "").strip().lower()
        if city_lookup in cls.FALLBACK_COORDINATES:
            lat, lng = cls.FALLBACK_COORDINATES[city_lookup]
        else:
            # Check state/address string
            matched = False
            for k, (lat_val, lng_val) in cls.FALLBACK_COORDINATES.items():
                if k in query_string.lower():
                    lat, lng = lat_val, lng_val
                    matched = True
                    break
            if not matched:
                lat, lng = cls.FALLBACK_COORDINATES["default"]

        return {
            "latitude": lat,
            "longitude": lng,
            "formatted_address": query_string,
            "source": "lookup_fallback"
        }
