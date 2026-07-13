from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from app.models.ecommerce import ProductStatus


class ProductCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = None


class ProductCategory(ProductCategoryBase):
    id: int
    slug: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProductVariantCreate(BaseModel):
    sku: str
    price: Decimal
    compare_at_price: Optional[Decimal] = None
    currency: str = "BDT"
    weight_kg: Optional[Decimal] = None
    size: Optional[str] = None
    flavor: Optional[str] = None
    stock_qty: int = 0
    is_active: bool = True


class ProductCreate(BaseModel):
    title: str
    category_id: Optional[int] = None
    description_md: Optional[str] = None
    brand: Optional[str] = None
    status: ProductStatus = ProductStatus.DRAFT
    is_digital: bool = False
    is_nfc_tag_product: bool = False


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    category_id: Optional[int] = None
    description_md: Optional[str] = None
    brand: Optional[str] = None
    status: Optional[ProductStatus] = None


class CartItemAdd(BaseModel):
    variant_id: int
    qty: int = 1


class ShippingAddressCreate(BaseModel):
    name: str
    phone: str
    address: str
    city: str
    country: str = "Bangladesh"
    notes: Optional[str] = None


class OrderCreate(BaseModel):
    shipping_address: ShippingAddressCreate
    payment_method: str = "COD"
