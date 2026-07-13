from django.conf import settings
from django.contrib.auth import logout as auth_logout
from django.db.models import Sum
from django.http import HttpResponseRedirect, JsonResponse
from django.urls import path, reverse
from unfold.sites import UnfoldAdminSite

from config.media_images import process_image
from shop.models import Order, OrderItem, OrderStatus, Product, ProductCatalog, ProductSourceType, VendorPayout
from accounts.models import VerificationRequest, VerificationStatus
from siteplatform.models import ModerationQueue, ModerationStatus


def frontend_login_url(*, admin_target: bool = True) -> str:
    base = f"{settings.FRONTEND_URL.rstrip('/')}/login"
    if admin_target:
        return f"{base}?next=admin"
    return base


def dashboard_callback(request, context):
    """Inject marketplace KPIs and quick links into the Unfold admin dashboard."""
    delivered = Order.objects.filter(status=OrderStatus.DELIVERED)
    pending_approvals = Product.objects.filter(approval_status="pending").count()
    pending_payouts = VendorPayout.objects.filter(status="pending").count()

    def money(value):
        amount = value or 0
        try:
            return f"{float(amount):,.2f}"
        except (TypeError, ValueError):
            return str(amount)

    def admin_url(name, **kwargs):
        return reverse(f"kedi_admin:{name}", kwargs=kwargs)

    context.update(
        {
            "kpi_cards": [
                {
                    "label": "Total orders",
                    "value": Order.objects.count(),
                    "hint": "All-time",
                    "icon": "receipt_long",
                    "tone": "neutral",
                },
                {
                    "label": "Published products",
                    "value": Product.objects.filter(status="published").count(),
                    "hint": "Live catalog",
                    "icon": "inventory_2",
                    "tone": "neutral",
                },
                {
                    "label": "Platform catalog",
                    "value": Product.objects.filter(
                        source_type__in=[
                            ProductSourceType.PLATFORM_OWN,
                            ProductSourceType.PLATFORM_BRAND,
                        ],
                        status="published",
                    ).count(),
                    "hint": "Own + world brands",
                    "icon": "storefront",
                    "tone": "accent",
                },
                {
                    "label": "Pet & Animal",
                    "value": Product.objects.filter(
                        catalog=ProductCatalog.PET_ANIMAL, status="published"
                    ).count(),
                    "hint": "Published",
                    "icon": "pets",
                    "tone": "accent",
                },
                {
                    "label": "General products",
                    "value": Product.objects.filter(
                        catalog=ProductCatalog.GENERAL, status="published"
                    ).count(),
                    "hint": "Published",
                    "icon": "category",
                    "tone": "accent",
                },
                {
                    "label": "Vendor catalog",
                    "value": Product.objects.filter(
                        source_type=ProductSourceType.VENDOR, status="published"
                    ).count(),
                    "hint": "Third-party live",
                    "icon": "handshake",
                    "tone": "neutral",
                },
                {
                    "label": "GMV",
                    "value": f"{money(Order.objects.aggregate(total=Sum('total'))['total'])} BDT",
                    "hint": "All orders",
                    "icon": "payments",
                    "tone": "neutral",
                },
                {
                    "label": "Delivered revenue",
                    "value": f"{money(delivered.aggregate(total=Sum('total'))['total'])} BDT",
                    "hint": "Completed only",
                    "icon": "trending_up",
                    "tone": "accent",
                },
                {
                    "label": "Platform fees",
                    "value": f"{money(OrderItem.objects.aggregate(total=Sum('platform_fee'))['total'])} BDT",
                    "hint": "Commission earned",
                    "icon": "account_balance",
                    "tone": "accent",
                },
                {
                    "label": "Vendor earnings",
                    "value": f"{money(OrderItem.objects.aggregate(total=Sum('vendor_earnings'))['total'])} BDT",
                    "hint": "Gross to vendors",
                    "icon": "savings",
                    "tone": "neutral",
                },
                {
                    "label": "Pending payouts",
                    "value": pending_payouts,
                    "hint": "Needs attention" if pending_payouts else "All clear",
                    "icon": "account_balance_wallet",
                    "tone": "warn" if pending_payouts else "neutral",
                    "url": admin_url("shop_vendorpayout_changelist"),
                },
                {
                    "label": "Awaiting approval",
                    "value": pending_approvals,
                    "hint": "Vendor products" if pending_approvals else "Queue empty",
                    "icon": "pending_actions",
                    "tone": "warn" if pending_approvals else "neutral",
                    "url": f"{admin_url('shop_product_changelist')}?approval_status__exact=pending",
                },
            ],
            "quick_actions": [
                {
                    "title": "Add platform product",
                    "icon": "add_box",
                    "url": admin_url("shop_product_add"),
                },
                {
                    "title": "Commission plans",
                    "icon": "percent",
                    "url": admin_url("shop_commissionplan_changelist"),
                },
                {
                    "title": "Vendors",
                    "icon": "store",
                    "url": admin_url("accounts_vendorprofile_changelist"),
                },
                {
                    "title": "Payouts",
                    "icon": "payments",
                    "url": admin_url("shop_vendorpayout_changelist"),
                },
                {
                    "title": "Orders",
                    "icon": "local_shipping",
                    "url": admin_url("shop_order_changelist"),
                },
                {
                    "title": "Pet listings",
                    "icon": "cruelty_free",
                    "url": admin_url("marketplace_petlisting_changelist"),
                },
            ],
            "pending_approvals": pending_approvals,
            "pending_payouts": pending_payouts,
        }
    )
    return context


def environment_callback(request):
    if settings.DEBUG:
        return ["Development", "warning"]
    return ["Production", "danger"]


def badge_pending_approvals(request):
    return Product.objects.filter(approval_status="pending").count() or None


def badge_pending_payouts(request):
    return VendorPayout.objects.filter(status="pending").count() or None


def badge_pending_moderation(request):
    return (
        ModerationQueue.objects.filter(status=ModerationStatus.PENDING).count() or None
    )


def badge_pending_verifications(request):
    return (
        VerificationRequest.objects.filter(status=VerificationStatus.PENDING).count()
        or None
    )


class KediSmartAdminSite(UnfoldAdminSite):
    site_header = "Kedi Smart"
    site_title = "Kedi Smart Admin"
    index_title = "Operations dashboard"
    index_template = "admin/kedi_index.html"

    def get_urls(self):
        custom = [
            path(
                "upload-image/",
                self.admin_view(self.upload_image),
                name="kedi_upload_image",
            ),
        ]
        return custom + super().get_urls()

    def upload_image(self, request):
        if request.method != "POST":
            return JsonResponse({"detail": "POST required."}, status=405)
        uploaded = request.FILES.get("file")
        if not uploaded:
            return JsonResponse({"detail": "No image file received."}, status=400)
        content_type = getattr(uploaded, "content_type", "") or ""
        if not content_type.startswith("image/"):
            return JsonResponse({"detail": "Please upload an image file."}, status=400)
        max_bytes = getattr(settings, "MAX_UPLOAD_SIZE", 10 * 1024 * 1024)
        if uploaded.size and uploaded.size > max_bytes:
            return JsonResponse({"detail": "Image is too large (max 10 MB)."}, status=400)
        subdir = (request.POST.get("subdir") or "images").strip()
        mode = (request.POST.get("mode") or "contain").strip()
        try:
            _file, media_url = process_image(uploaded, subdir=subdir, mode=mode)
        except Exception as exc:  # noqa: BLE001
            return JsonResponse({"detail": f"Could not process image: {exc}"}, status=400)
        return JsonResponse({"url": media_url, "detail": "ok"})

    def login(self, request, extra_context=None):
        """Single sign-on: Django admin login always uses the frontend login page."""
        user = getattr(request, "user", None)
        if user and user.is_authenticated and getattr(user, "is_staff", False):
            next_url = request.GET.get("next") or "/admin/"
            if next_url.startswith("/admin"):
                return HttpResponseRedirect(next_url)
            return HttpResponseRedirect("/admin/")
        return HttpResponseRedirect(frontend_login_url())

    def logout(self, request, extra_context=None):
        auth_logout(request)
        return HttpResponseRedirect(frontend_login_url(admin_target=False))


kedi_admin_site = KediSmartAdminSite(name="kedi_admin")
