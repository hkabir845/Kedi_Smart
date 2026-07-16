from django.db import models
from django.utils import timezone

from accounts.models import User
from api.mixins import TimestampMixin


class ProductStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PUBLISHED = "published", "Published"


class ProductCatalog(models.TextChoices):
    """Product department — pet/animal specialty vs general merchandise."""
    PET_ANIMAL = "pet_animal", "Pet & Animal"
    GENERAL = "general", "General Products"


class ProductSourceType(models.TextChoices):
    """Who sells and fulfills the product."""
    PLATFORM_OWN = "platform_own", "Kedi Smart Own Brand"
    PLATFORM_BRAND = "platform_brand", "World Brand (Platform Stock)"
    VENDOR = "vendor", "Third-Party Vendor"


class ProductKind(models.TextChoices):
    """Shopify-style product vs service for inventory rules."""
    PHYSICAL = "physical", "Physical product"
    DIGITAL = "digital", "Digital product"
    SERVICE = "service", "Service"


class InventoryMovementReason(models.TextChoices):
    SALE = "sale", "Sale"
    MANUAL_SALE = "manual_sale", "Manual / POS sale"
    RESTOCK = "restock", "Restock / received"
    ADJUSTMENT = "adjustment", "Manual adjustment"
    RETURN = "return", "Return / cancel restock"
    INITIAL = "initial", "Initial stock"


class ProductApprovalStatus(models.TextChoices):
    NOT_REQUIRED = "not_required", "Not Required"
    PENDING = "pending", "Pending Review"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class CommissionAppliesTo(models.TextChoices):
    ALL_SELLERS = "all_sellers", "All Third-Party Sellers"
    VENDOR_TIER_FREE = "tier_free", "Free Tier Vendors"
    VENDOR_TIER_PRO = "tier_pro", "Pro Tier Vendors"
    VENDOR_TIER_ENTERPRISE = "tier_enterprise", "Enterprise Tier Vendors"


class PayoutStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    PROCESSING = "processing", "Processing"
    PAID = "paid", "Paid"
    FAILED = "failed", "Failed"


class LedgerEntryType(models.TextChoices):
    SALE = "sale", "Sale Credit"
    COMMISSION = "commission", "Platform Commission"
    LISTING_FEE = "listing_fee", "Listing Fee"
    PAYOUT = "payout", "Payout"
    REFUND = "refund", "Refund"


class OrderStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    PAID = "paid", "Paid"
    PROCESSING = "processing", "Processing"
    SHIPPED = "shipped", "Shipped"
    DELIVERED = "delivered", "Delivered"
    READY_FOR_PICKUP = "ready_for_pickup", "Ready for Pickup"
    CANCELLED = "cancelled", "Cancelled"
    REFUNDED = "refunded", "Refunded"


class ShipmentStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    PROCESSING = "processing", "Processing"
    READY = "ready", "Ready"
    SHIPPED = "shipped", "Shipped"
    DELIVERED = "delivered", "Delivered"
    CANCELLED = "cancelled", "Cancelled"
    RETURNED = "returned", "Returned"


class CourierProvider(models.TextChoices):
    MANUAL = "manual", "Manual / own courier"
    PATHAO = "pathao", "Pathao"
    STEADFAST = "steadfast", "Steadfast"
    REDX = "redx", "RedX"


class FulfillmentType(models.TextChoices):
    DELIVERY = "delivery", "Home Delivery"
    STORE_PICKUP = "store_pickup", "Store Pickup"


class PaymentMethod(models.TextChoices):
    COD = "COD", "Cash on Delivery"
    BKASH = "BKASH", "bKash"
    NAGAD = "NAGAD", "Nagad"
    STORE_PICKUP = "STORE_PICKUP", "Pay at Store Pickup"
    SSLCOMMERZ = "SSLCOMMERZ", "Card / Mobile Banking (SSLCommerz)"
    MANUAL = "Manual", "Manual (legacy)"


class PaymentStatus(models.TextChoices):
    PENDING = "pending", "Pending Approval"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    REFUNDED = "refunded", "Refunded"


class DocumentStatus(models.TextChoices):
    AWAITING_PAYMENT = "awaiting_payment", "Awaiting Payment"
    PAID = "paid", "Paid"
    VOID = "void", "Void"


class OrderChannel(models.TextChoices):
    CHECKOUT = "checkout", "Online checkout"
    MANUAL = "manual", "Manual / offline"


class CouponType(models.TextChoices):
    PERCENTAGE = "percentage", "Percentage"
    FIXED = "fixed", "Fixed"


class SubscriptionStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    PAUSED = "paused", "Paused"
    CANCELLED = "cancelled", "Cancelled"


class SubscriptionPlanType(models.TextChoices):
    FOOD = "food", "Food"
    LITTER = "litter", "Litter"


class SubscriptionInterval(models.TextChoices):
    WEEKLY = "weekly", "Weekly"
    BIWEEKLY = "biweekly", "Biweekly"
    MONTHLY = "monthly", "Monthly"


class ProductCategory(TimestampMixin):
    parent = models.ForeignKey("self", on_delete=models.SET_NULL, blank=True, null=True)
    slug = models.CharField(max_length=200, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    catalog = models.CharField(
        max_length=20,
        choices=ProductCatalog.choices,
        default=ProductCatalog.PET_ANIMAL,
        db_index=True,
    )

    class Meta:
        db_table = "product_categories"


class CommissionPlan(TimestampMixin):
    """Fee structure for marketplace sellers (Chewy/Etsy/Amazon-style hybrid)."""

    name = models.CharField(max_length=120)
    slug = models.CharField(max_length=80, unique=True, db_index=True)
    description = models.TextField(blank=True, null=True)
    commission_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=12, help_text="Take rate % on each sale."
    )
    listing_fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, help_text="Per-product listing fee (Etsy-style)."
    )
    subscription_monthly_fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, help_text="Monthly seller subscription."
    )
    payment_processing_percent = models.DecimalField(max_digits=5, decimal_places=2, default=2.9)
    payment_processing_fixed = models.DecimalField(max_digits=10, decimal_places=2, default=0.30)
    applies_to = models.CharField(
        max_length=30, choices=CommissionAppliesTo.choices, default=CommissionAppliesTo.ALL_SELLERS
    )
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "commission_plans"

    def __str__(self):
        return f"{self.name} ({self.commission_percent}%)"


class Product(TimestampMixin):
    vendor = models.ForeignKey(
        User, on_delete=models.SET_NULL, blank=True, null=True, db_column="vendor_user_id"
    )
    category = models.ForeignKey(ProductCategory, on_delete=models.SET_NULL, blank=True, null=True)
    slug = models.CharField(max_length=255, unique=True, db_index=True)
    title = models.CharField(max_length=255)
    description_md = models.TextField(blank=True, null=True)
    brand = models.CharField(max_length=255, blank=True, null=True)
    catalog = models.CharField(
        max_length=20,
        choices=ProductCatalog.choices,
        default=ProductCatalog.PET_ANIMAL,
        db_index=True,
    )
    source_type = models.CharField(
        max_length=20,
        choices=ProductSourceType.choices,
        default=ProductSourceType.PLATFORM_OWN,
    )
    approval_status = models.CharField(
        max_length=20,
        choices=ProductApprovalStatus.choices,
        default=ProductApprovalStatus.NOT_REQUIRED,
    )
    status = models.CharField(max_length=20, choices=ProductStatus.choices, default=ProductStatus.DRAFT)
    product_kind = models.CharField(
        max_length=20,
        choices=ProductKind.choices,
        default=ProductKind.PHYSICAL,
        db_index=True,
        help_text="Physical products track units; services/digital typically do not.",
    )
    track_inventory = models.BooleanField(
        default=True,
        help_text="When false (services), stock is not decremented or checked.",
    )
    is_digital = models.BooleanField(default=False)
    is_nfc_tag_product = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    listing_fee_paid = models.BooleanField(default=False)

    class Meta:
        db_table = "products"
        indexes = [
            models.Index(
                fields=["status", "catalog", "-created_at"],
                name="product_status_cat_idx",
            ),
        ]

    @property
    def is_platform_sold(self):
        return self.source_type in (
            ProductSourceType.PLATFORM_OWN,
            ProductSourceType.PLATFORM_BRAND,
        )

    def sync_inventory_flags(self):
        if self.product_kind == ProductKind.SERVICE:
            self.track_inventory = False
            self.is_digital = False
        elif self.product_kind == ProductKind.DIGITAL:
            self.track_inventory = False
            self.is_digital = True
        else:
            self.is_digital = False


class ProductVariant(TimestampMixin):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    sku = models.CharField(max_length=100, unique=True, db_index=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    compare_at_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    currency = models.CharField(max_length=3, default="BDT")
    weight_kg = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)
    size = models.CharField(max_length=100, blank=True, null=True)
    flavor = models.CharField(max_length=100, blank=True, null=True)
    stock_qty = models.IntegerField(default=0)
    reserved_qty = models.PositiveIntegerField(
        default=0,
        help_text="Units held by active carts (Shopify-style soft reservation).",
    )
    low_stock_threshold = models.PositiveIntegerField(
        default=5,
        help_text="Highlight low stock at or below this qty (Shopify-style reorder point).",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "product_variants"

    @property
    def available_qty(self) -> int:
        return max(0, int(self.stock_qty) - int(self.reserved_qty or 0))

    @property
    def is_low_stock(self) -> bool:
        if not self.product_id:
            return False
        product = self.product
        if not product.track_inventory:
            return False
        return self.available_qty <= self.low_stock_threshold


class InventoryMovement(TimestampMixin):
    """Audit trail for stock changes (sale, restock, adjustment) — Square/Shopify style."""

    variant = models.ForeignKey(
        ProductVariant, on_delete=models.CASCADE, related_name="inventory_movements"
    )
    delta = models.IntegerField(help_text="Positive = increase, negative = decrease")
    quantity_after = models.IntegerField()
    reason = models.CharField(max_length=20, choices=InventoryMovementReason.choices)
    note = models.CharField(max_length=255, blank=True, default="")
    actor = models.ForeignKey(
        User, on_delete=models.SET_NULL, blank=True, null=True, related_name="inventory_movements"
    )
    order = models.ForeignKey(
        "Order", on_delete=models.SET_NULL, blank=True, null=True, related_name="inventory_movements"
    )
    order_item = models.ForeignKey(
        "OrderItem",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="inventory_movements",
    )

    class Meta:
        db_table = "inventory_movements"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.variant_id} {self.delta:+d} ({self.reason})"


class ProductImage(TimestampMixin):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    url = models.CharField(
        max_length=500,
        blank=True,
        default="",
        help_text="Public image path or URL. Prefer uploading in admin (auto-resized for shop).",
    )
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = "product_images"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.url or f"Image #{self.pk or 'new'}"


class ProductVideo(TimestampMixin):
    """Amazon-style product gallery video (HLS/mp4 + poster)."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="videos")
    video_url = models.CharField(max_length=800, help_text="mp4 or HLS (.m3u8) URL")
    poster_url = models.CharField(max_length=500, blank=True, default="")
    title = models.CharField(max_length=255, blank=True, default="")
    duration_seconds = models.PositiveIntegerField(blank=True, null=True)
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = "product_videos"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.title or self.video_url[:80]


class ProductReview(TimestampMixin):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True)
    rating = models.IntegerField()
    title = models.CharField(max_length=255, blank=True, null=True)
    body = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "product_reviews"


class Cart(TimestampMixin):
    user = models.ForeignKey(User, on_delete=models.CASCADE, blank=True, null=True)
    session_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)

    class Meta:
        db_table = "carts"


class CartItem(TimestampMixin):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE)
    qty = models.IntegerField(default=1)
    reserved_until = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Soft hold expires; reserved stock is released after this time.",
    )

    class Meta:
        db_table = "cart_items"


class Order(TimestampMixin):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True)
    guest_email = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=20, choices=OrderStatus.choices, default=OrderStatus.PENDING)
    fulfillment_type = models.CharField(
        max_length=20,
        choices=FulfillmentType.choices,
        default=FulfillmentType.DELIVERY,
    )
    channel = models.CharField(
        max_length=20,
        choices=OrderChannel.choices,
        default=OrderChannel.CHECKOUT,
        db_index=True,
    )
    issuer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="issued_orders",
        help_text="Seller who created a manual/offline invoice (vendor, vet, or live seller).",
    )
    track_token = models.CharField(max_length=64, unique=True, db_index=True, blank=True, null=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    coupon_code = models.CharField(max_length=50, blank=True, null=True)
    shipping_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="BDT")

    class Meta:
        db_table = "orders"

    @property
    def public_order_number(self) -> str:
        return f"KS-{self.id:06d}"

    def __str__(self):
        return self.public_order_number


class DocumentSequence(models.Model):
    """Yearly counters so online checkout and manual invoices share one number series."""

    prefix = models.CharField(max_length=16)  # KS-INV | KS-RCP
    year = models.PositiveIntegerField()
    last_value = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "document_sequences"
        unique_together = ("prefix", "year")

    def __str__(self):
        return f"{self.prefix}-{self.year}: {self.last_value}"


class OrderItem(TimestampMixin):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, blank=True, null=True)
    vendor = models.ForeignKey(
        User, on_delete=models.SET_NULL, blank=True, null=True, db_column="vendor_user_id"
    )
    source_type = models.CharField(
        max_length=20, choices=ProductSourceType.choices, default=ProductSourceType.PLATFORM_OWN
    )
    title_snapshot = models.CharField(max_length=255)
    price_snapshot = models.DecimalField(max_digits=10, decimal_places=2)
    qty = models.IntegerField()
    line_subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_processing_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    vendor_earnings = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    platform_revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        db_table = "order_items"


class VendorLedgerEntry(TimestampMixin):
    vendor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="ledger_entries")
    order_item = models.ForeignKey(
        OrderItem, on_delete=models.SET_NULL, blank=True, null=True, related_name="ledger_entries"
    )
    entry_type = models.CharField(max_length=20, choices=LedgerEntryType.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    note = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = "vendor_ledger_entries"
        ordering = ["-created_at"]


class VendorPayout(TimestampMixin):
    vendor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="payouts")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=PayoutStatus.choices, default=PayoutStatus.PENDING)
    period_start = models.DateField(blank=True, null=True)
    period_end = models.DateField(blank=True, null=True)
    reference = models.CharField(max_length=255, blank=True, null=True)
    paid_at = models.DateTimeField(blank=True, null=True)
    admin_note = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "vendor_payouts"
        ordering = ["-created_at"]


class Shipment(TimestampMixin):
    """One parcel / fulfillment unit per vendor (or platform) on an order."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="shipments")
    vendor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="shipments",
        db_column="vendor_user_id",
        help_text="Null = platform-fulfilled stock.",
    )
    status = models.CharField(
        max_length=20, choices=ShipmentStatus.choices, default=ShipmentStatus.PENDING, db_index=True
    )
    courier = models.CharField(
        max_length=20, choices=CourierProvider.choices, default=CourierProvider.MANUAL
    )
    consignment_id = models.CharField(max_length=120, blank=True, null=True)
    tracking_number = models.CharField(max_length=120, blank=True, null=True)
    tracking_url = models.CharField(max_length=500, blank=True, null=True)
    carrier_note = models.CharField(max_length=255, blank=True, null=True)
    shipped_at = models.DateTimeField(blank=True, null=True)
    delivered_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "shipments"
        ordering = ["id"]
        indexes = [
            models.Index(fields=["order", "vendor"]),
        ]

    def __str__(self):
        who = self.vendor_id or "platform"
        return f"Shipment {self.id} order={self.order_id} vendor={who} ({self.status})"


class VendorStatement(TimestampMixin):
    """Monthly settlement snapshot (Amazon-style seller statement)."""

    vendor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="statements")
    period_start = models.DateField()
    period_end = models.DateField()
    gross_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    platform_fees = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    processing_fees = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    listing_fees = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    refunds = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payouts = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, default="finalized")

    class Meta:
        db_table = "vendor_statements"
        ordering = ["-period_end"]
        unique_together = ("vendor", "period_start", "period_end")

    def __str__(self):
        return f"Statement {self.vendor_id} {self.period_start}–{self.period_end}"


class Payment(TimestampMixin):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="payments")
    method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    reference = models.CharField(max_length=255, blank=True, null=True)
    wallet_phone = models.CharField(max_length=60, blank=True, null=True)
    wallet_txn_id = models.CharField(max_length=120, blank=True, null=True)
    gateway_session_key = models.CharField(max_length=255, blank=True, null=True)
    gateway_tran_id = models.CharField(max_length=120, blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    approved_at = models.DateTimeField(blank=True, null=True)
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="approved_payments",
    )
    admin_note = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "payments"


class ShippingAddress(TimestampMixin):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="shipping_address")
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=60)
    address = models.TextField()
    city = models.CharField(max_length=120)
    country = models.CharField(max_length=120)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "shipping_addresses"


class Invoice(TimestampMixin):
    """Fulfillment / commercial invoice — auto-created at checkout for packing with products.

    Shared between platform admin and vendors. Shoppers receive a Receipt instead.
    """

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="invoice")
    number = models.CharField(max_length=40, unique=True, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=DocumentStatus.choices,
        default=DocumentStatus.AWAITING_PAYMENT,
    )
    issued_at = models.DateTimeField(default=timezone.now)
    seller_name = models.CharField(max_length=255)
    seller_phone = models.CharField(max_length=60)
    seller_email = models.CharField(max_length=255, blank=True, default="")
    seller_address = models.TextField()
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "invoices"
        ordering = ["-issued_at"]
        verbose_name = "Invoice"
        verbose_name_plural = "Invoices"

    def __str__(self):
        return self.number


class Receipt(TimestampMixin):
    """Customer receipt — shopper-facing payment / purchase record.

    Created with the packing invoice at checkout; marked paid when payment is approved.
    """

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="receipt")
    invoice = models.OneToOneField(Invoice, on_delete=models.CASCADE, related_name="receipt")
    payment = models.ForeignKey(
        Payment, on_delete=models.SET_NULL, blank=True, null=True, related_name="receipts"
    )
    number = models.CharField(max_length=40, unique=True, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=DocumentStatus.choices,
        default=DocumentStatus.AWAITING_PAYMENT,
    )
    issued_at = models.DateTimeField(default=timezone.now)
    paid_at = models.DateTimeField(blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="BDT")
    seller_name = models.CharField(max_length=255)
    seller_phone = models.CharField(max_length=60)
    seller_email = models.CharField(max_length=255, blank=True, default="")
    seller_address = models.TextField()

    class Meta:
        db_table = "receipts"
        ordering = ["-issued_at"]
        verbose_name = "Receipt"
        verbose_name_plural = "Receipts"

    def __str__(self):
        return self.number


class Coupon(TimestampMixin):
    code = models.CharField(max_length=50, unique=True, db_index=True)
    type = models.CharField(max_length=20, choices=CouponType.choices)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    usage_limit = models.IntegerField(blank=True, null=True)
    times_used = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)

    class Meta:
        db_table = "coupons"

    def __str__(self):
        return self.code


class SubscriptionPlan(TimestampMixin):
    type = models.CharField(max_length=20, choices=SubscriptionPlanType.choices)
    interval = models.CharField(max_length=20, choices=SubscriptionInterval.choices)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        db_table = "subscription_plans"


class Subscription(TimestampMixin):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.SET_NULL, blank=True, null=True)
    product_variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, blank=True, null=True)
    status = models.CharField(max_length=20, choices=SubscriptionStatus.choices, default=SubscriptionStatus.ACTIVE)

    class Meta:
        db_table = "subscriptions"
