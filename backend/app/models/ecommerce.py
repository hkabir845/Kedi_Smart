from sqlalchemy import Column, Integer, String, ForeignKey, Enum, JSON, Text, Boolean, Numeric, DateTime, Date
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.db.session import Base
from app.db.base import TimestampMixin


class ProductStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentMethod(str, enum.Enum):
    COD = "COD"
    MANUAL = "Manual"
    # Stubs for future: STRIPE, PAYPAL, etc.


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class CouponType(str, enum.Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class SubscriptionPlanType(str, enum.Enum):
    FOOD = "food"
    LITTER = "litter"


class SubscriptionInterval(str, enum.Enum):
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"


class ProductCategory(Base, TimestampMixin):
    __tablename__ = "product_categories"

    parent_id = Column(Integer, ForeignKey("product_categories.id", ondelete="SET NULL"), nullable=True)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    products = relationship("Product", back_populates="category")
    children = relationship("ProductCategory", remote_side="ProductCategory.id")


class Product(Base, TimestampMixin):
    __tablename__ = "products"

    vendor_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    category_id = Column(Integer, ForeignKey("product_categories.id", ondelete="SET NULL"), nullable=True, index=True)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description_md = Column(Text, nullable=True)
    brand = Column(String(255), nullable=True)
    status = Column(Enum(ProductStatus), default=ProductStatus.DRAFT, nullable=False)
    is_digital = Column(Boolean, default=False, nullable=False)
    is_nfc_tag_product = Column(Boolean, default=False, nullable=False)

    category = relationship("ProductCategory", back_populates="products")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    reviews = relationship("ProductReview", back_populates="product", cascade="all, delete-orphan")


class ProductVariant(Base, TimestampMixin):
    __tablename__ = "product_variants"

    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    sku = Column(String(100), unique=True, nullable=False, index=True)
    price = Column(Numeric(10, 2), nullable=False)
    compare_at_price = Column(Numeric(10, 2), nullable=True)
    currency = Column(String(3), default="BDT", nullable=False)
    weight_kg = Column(Numeric(8, 2), nullable=True)
    size = Column(String(100), nullable=True)
    flavor = Column(String(100), nullable=True)
    stock_qty = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    product = relationship("Product", back_populates="variants")


class ProductImage(Base, TimestampMixin):
    __tablename__ = "product_images"

    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    url = Column(String(500), nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)

    product = relationship("Product", back_populates="images")


class ProductReview(Base, TimestampMixin):
    __tablename__ = "product_reviews"

    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    rating = Column(Integer, nullable=False)  # 1-5
    title = Column(String(255), nullable=True)
    body = Column(Text, nullable=True)

    product = relationship("Product", back_populates="reviews")


class Cart(Base, TimestampMixin):
    __tablename__ = "carts"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    session_id = Column(String(255), nullable=True, index=True)

    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")


class CartItem(Base, TimestampMixin):
    __tablename__ = "cart_items"

    cart_id = Column(Integer, ForeignKey("carts.id", ondelete="CASCADE"), nullable=False, index=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False)
    qty = Column(Integer, default=1, nullable=False)

    cart = relationship("Cart", back_populates="items")


class Order(Base, TimestampMixin):
    __tablename__ = "orders"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    guest_email = Column(String(255), nullable=True)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING, nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)
    discount = Column(Numeric(10, 2), default=0, nullable=False)
    shipping_fee = Column(Numeric(10, 2), default=0, nullable=False)
    tax = Column(Numeric(10, 2), default=0, nullable=False)
    total = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="BDT", nullable=False)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")
    shipping_address = relationship("ShippingAddress", back_populates="order", uselist=False, cascade="all, delete-orphan")


class OrderItem(Base, TimestampMixin):
    __tablename__ = "order_items"

    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    title_snapshot = Column(String(255), nullable=False)
    price_snapshot = Column(Numeric(10, 2), nullable=False)
    qty = Column(Integer, nullable=False)

    order = relationship("Order", back_populates="items")


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    method = Column(Enum(PaymentMethod), nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
    reference = Column(String(255), nullable=True)

    order = relationship("Order", back_populates="payments")


class ShippingAddress(Base, TimestampMixin):
    __tablename__ = "shipping_addresses"

    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    phone = Column(String(60), nullable=False)
    address = Column(Text, nullable=False)
    city = Column(String(120), nullable=False)
    country = Column(String(120), nullable=False)
    notes = Column(Text, nullable=True)

    order = relationship("Order", back_populates="shipping_address")


class Coupon(Base, TimestampMixin):
    __tablename__ = "coupons"

    code = Column(String(50), unique=True, nullable=False, index=True)
    type = Column(Enum(CouponType), nullable=False)
    value = Column(Numeric(10, 2), nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    usage_limit = Column(Integer, nullable=True)
    active = Column(Boolean, default=True, nullable=False)


class SubscriptionPlan(Base, TimestampMixin):
    __tablename__ = "subscription_plans"

    type = Column(Enum(SubscriptionPlanType), nullable=False)
    interval = Column(Enum(SubscriptionInterval), nullable=False)
    discount_percent = Column(Numeric(5, 2), nullable=False)

    subscriptions = relationship("Subscription", back_populates="plan")


class Subscription(Base, TimestampMixin):
    __tablename__ = "subscriptions"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("subscription_plans.id", ondelete="SET NULL"), nullable=True)
    product_variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE, nullable=False)

    plan = relationship("SubscriptionPlan", back_populates="subscriptions")
