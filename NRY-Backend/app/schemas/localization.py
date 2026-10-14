from typing import List
from pydantic import BaseModel, ConfigDict

class CountryOut(BaseModel):
    code: str
    name: str
    currency: str
    phone_code: str
    flag_emoji: str
    is_active: bool
    cod_enabled: bool
    cod_max_limit: float
    supported_gateways: List[str]

    model_config = ConfigDict(from_attributes=True)

class LanguageOut(BaseModel):
    code: str
    name: str
    native_name: str
    is_active: bool
    is_default: bool

    model_config = ConfigDict(from_attributes=True)

class GatewayOut(BaseModel):
    gateway_name: str
    display_name: str
    is_active: bool
    priority: str
    supported_methods: List[str]

    model_config = ConfigDict(from_attributes=True)
