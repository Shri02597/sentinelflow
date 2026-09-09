from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ProductOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    category: str
    price: float
    image: Optional[str]
    stock: int
    created_at: datetime

    class Config:
        from_attributes = True


class CartItemIn(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1, le=99)


class CartItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    product: ProductOut

    class Config:
        from_attributes = True


class CartOut(BaseModel):
    items: List[CartItemOut]
    total: float
