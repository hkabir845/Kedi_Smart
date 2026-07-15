from django.conf import settings
from django.contrib.auth import logout as auth_logout
from django.db.models import Sum
from django.http import HttpResponseRedirect, JsonResponse
from django.urls import path, reverse
from unfold.sites import UnfoldAdminSite

from accounts.models import User, VerificationRequest, VerificationStatus, VendorProfile
from config.media_images import process_image
from marketplace.models import PetListing
from nfc.models import LostPetReport, LostReportStatus, NFCTag, TagStatus
from pets.models import Pet
from shop.models import (
    Invoice,
    Order,
    OrderItem,
    OrderStatus,
    Product,
    ProductCatalog,
    ProductSourceType,
    Receipt,
    VendorPayout,
)
from siteplatform.models import ModerationQueue, ModerationStatus
from vets.models import Appointment, AppointmentStatus, VetProfile


def frontend_login_url(*, admin_target: bool = True) -> str:
    base = f"{settings.FRONTEND_URL.rstrip('/')}/login"
    if admin_target:
        return f"{base}?next=admin"
    return base


def _money(value):
    amount = value or 0
    try:
        return f"{float(amount):,.2f}"
    except (TypeError, ValueError):
        return str(amount)


def _admin_url(name, **kwargs):
    return reverse(f"kedi_admin:{name}", kwargs=kwargs)


def dashboard_callback(request, context):
    """Platform-wide operations KPIs for the Kedi Smart control panel."""
    delivered = Order.objects.filter(status=OrderStatus.DELIVERED)
    pending_approvals = Product.objects.filter(approval_status="pending").count()
    pending_payouts = VendorPayout.objects.filter(status="pending").count()
    pending_verifications = VerificationRequest.objects.filter(
        status=VerificationStatus.PENDING
    ).count()
    pending_moderation = ModerationQueue.objects.filter(
        status=ModerationStatus.PENDING
    ).count()
    pending_listings = PetListing.objects.filter(status="pending").count()
    active_lost = LostPetReport.objects.filter(status=LostReportStatus.ACTIVE).count()
    open_appointments = Appointment.objects.filter(
        status__in=[AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED]
    ).count()

    attention = []
    if pending_approvals:
        attention.append(
            {
                "label": f"{pending_approvals} product{'s' if pending_approvals != 1 else ''} awaiting approval",
                "url": f"{_admin_url('shop_product_changelist')}?approval_status__exact=pending",
                "icon": "pending_actions",
                "tone": "warn",
            }
        )
    if pending_payouts:
        attention.append(
            {
                "label": f"{pending_payouts} pending payout{'s' if pending_payouts != 1 else ''}",
                "url": f"{_admin_url('shop_vendorpayout_changelist')}?status__exact=pending",
                "icon": "account_balance_wallet",
                "tone": "warn",
            }
        )
    if pending_verifications:
        attention.append(
            {
                "label": f"{pending_verifications} verification{'s' if pending_verifications != 1 else ''} to review",
                "url": f"{_admin_url('accounts_verificationrequest_changelist')}?status__exact=pending",
                "icon": "verified_user",
                "tone": "warn",
            }
        )
    if pending_moderation:
        attention.append(
            {
                "label": f"{pending_moderation} moderation item{'s' if pending_moderation != 1 else ''}",
                "url": f"{_admin_url('siteplatform_moderationqueue_changelist')}?status__exact=pending",
                "icon": "policy",
                "tone": "warn",
            }
        )
    if pending_listings:
        attention.append(
            {
                "label": f"{pending_listings} pet listing{'s' if pending_listings != 1 else ''} pending",
                "url": f"{_admin_url('marketplace_petlisting_changelist')}?status__exact=pending",
                "icon": "cruelty_free",
                "tone": "warn",
            }
        )
    if active_lost:
        attention.append(
            {
                "label": f"{active_lost} active lost-pet report{'s' if active_lost != 1 else ''}",
                "url": f"{_admin_url('nfc_lostpetreport_changelist')}?status__exact=active",
                "icon": "sos",
                "tone": "danger",
            }
        )
    if open_appointments:
        attention.append(
            {
                "label": f"{open_appointments} open appointment{'s' if open_appointments != 1 else ''}",
                "url": _admin_url("vets_appointment_changelist"),
                "icon": "event",
                "tone": "info",
            }
        )

    context.update(
        {
            "kpi_sections": [
                {
                    "title": "Commerce",
                    "cards": [
                        {
                            "label": "Orders",
                            "value": Order.objects.count(),
                            "hint": "All-time",
                            "icon": "receipt_long",
                            "tone": "neutral",
                            "url": _admin_url("shop_order_changelist"),
                        },
                        {
                            "label": "GMV",
                            "value": f"{_money(Order.objects.aggregate(t=Sum('total'))['t'])} BDT",
                            "hint": "All orders",
                            "icon": "payments",
                            "tone": "neutral",
                        },
                        {
                            "label": "Delivered revenue",
                            "value": f"{_money(delivered.aggregate(t=Sum('total'))['t'])} BDT",
                            "hint": "Completed only",
                            "icon": "trending_up",
                            "tone": "accent",
                        },
                        {
                            "label": "Platform fees",
                            "value": f"{_money(OrderItem.objects.aggregate(t=Sum('platform_fee'))['t'])} BDT",
                            "hint": "Commission earned",
                            "icon": "account_balance",
                            "tone": "accent",
                        },
                        {
                            "label": "Published products",
                            "value": Product.objects.filter(status="published").count(),
                            "hint": "Live catalog",
                            "icon": "inventory_2",
                            "tone": "neutral",
                            "url": f"{_admin_url('shop_product_changelist')}?status__exact=published",
                        },
                        {
                            "label": "Awaiting approval",
                            "value": pending_approvals,
                            "hint": "Vendor products" if pending_approvals else "Queue empty",
                            "icon": "pending_actions",
                            "tone": "warn" if pending_approvals else "neutral",
                            "url": f"{_admin_url('shop_product_changelist')}?approval_status__exact=pending",
                        },
                        {
                            "label": "Pet & Animal SKUs",
                            "value": Product.objects.filter(
                                catalog=ProductCatalog.PET_ANIMAL, status="published"
                            ).count(),
                            "hint": "Published",
                            "icon": "pets",
                            "tone": "accent",
                        },
                        {
                            "label": "Vendor earnings",
                            "value": f"{_money(OrderItem.objects.aggregate(t=Sum('vendor_earnings'))['t'])} BDT",
                            "hint": "Gross to vendors",
                            "icon": "savings",
                            "tone": "neutral",
                        },
                    ],
                },
                {
                    "title": "Pets, NFC & care",
                    "cards": [
                        {
                            "label": "Pet passports",
                            "value": Pet.objects.count(),
                            "hint": "Registered pets",
                            "icon": "badge",
                            "tone": "accent",
                            "url": _admin_url("pets_pet_changelist"),
                        },
                        {
                            "label": "NFC tags",
                            "value": NFCTag.objects.count(),
                            "hint": f"{NFCTag.objects.filter(status=TagStatus.ASSIGNED).count()} assigned",
                            "icon": "nfc",
                            "tone": "neutral",
                            "url": _admin_url("nfc_nfctag_changelist"),
                        },
                        {
                            "label": "Active lost pets",
                            "value": active_lost,
                            "hint": "Needs attention" if active_lost else "All clear",
                            "icon": "sos",
                            "tone": "warn" if active_lost else "neutral",
                            "url": f"{_admin_url('nfc_lostpetreport_changelist')}?status__exact=active",
                        },
                        {
                            "label": "Vet clinics",
                            "value": VetProfile.objects.count(),
                            "hint": f"{VetProfile.objects.filter(verification_status='approved').count()} approved",
                            "icon": "local_hospital",
                            "tone": "neutral",
                            "url": _admin_url("vets_vetprofile_changelist"),
                        },
                        {
                            "label": "Open appointments",
                            "value": open_appointments,
                            "hint": "Requested + confirmed",
                            "icon": "event",
                            "tone": "info" if open_appointments else "neutral",
                            "url": _admin_url("vets_appointment_changelist"),
                        },
                        {
                            "label": "Pet listings",
                            "value": PetListing.objects.filter(status="published").count(),
                            "hint": f"{pending_listings} pending review",
                            "icon": "cruelty_free",
                            "tone": "warn" if pending_listings else "accent",
                            "url": _admin_url("marketplace_petlisting_changelist"),
                        },
                    ],
                },
                {
                    "title": "People & trust",
                    "cards": [
                        {
                            "label": "Members",
                            "value": User.objects.count(),
                            "hint": "All roles",
                            "icon": "group",
                            "tone": "neutral",
                            "url": _admin_url("accounts_user_changelist"),
                        },
                        {
                            "label": "Vendors",
                            "value": VendorProfile.objects.filter(is_approved=True).count(),
                            "hint": "Approved shops",
                            "icon": "store",
                            "tone": "accent",
                            "url": _admin_url("accounts_vendorprofile_changelist"),
                        },
                        {
                            "label": "Verifications",
                            "value": pending_verifications,
                            "hint": "Awaiting review" if pending_verifications else "Queue empty",
                            "icon": "verified_user",
                            "tone": "warn" if pending_verifications else "neutral",
                            "url": f"{_admin_url('accounts_verificationrequest_changelist')}?status__exact=pending",
                        },
                        {
                            "label": "Moderation",
                            "value": pending_moderation,
                            "hint": "Open queue items",
                            "icon": "policy",
                            "tone": "warn" if pending_moderation else "neutral",
                            "url": _admin_url("siteplatform_moderationqueue_changelist"),
                        },
                        {
                            "label": "Pending payouts",
                            "value": pending_payouts,
                            "hint": "Needs attention" if pending_payouts else "All clear",
                            "icon": "account_balance_wallet",
                            "tone": "warn" if pending_payouts else "neutral",
                            "url": _admin_url("shop_vendorpayout_changelist"),
                        },
                        {
                            "label": "Platform products",
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
                    ],
                },
            ],
            "attention_items": attention,
            "quick_actions": [
                {
                    "title": "Add platform product",
                    "icon": "add_box",
                    "url": _admin_url("shop_product_add"),
                },
                {
                    "title": "Register NFC tag",
                    "icon": "nfc",
                    "url": _admin_url("nfc_nfctag_add"),
                },
                {
                    "title": "Review lost pets",
                    "icon": "sos",
                    "url": f"{_admin_url('nfc_lostpetreport_changelist')}?status__exact=active",
                },
                {
                    "title": "Appointments",
                    "icon": "event",
                    "url": _admin_url("vets_appointment_changelist"),
                },
                {
                    "title": "Vendors",
                    "icon": "store",
                    "url": _admin_url("accounts_vendorprofile_changelist"),
                },
                {
                    "title": "Orders",
                    "icon": "local_shipping",
                    "url": _admin_url("shop_order_changelist"),
                },
                {
                    "title": "Pet listings",
                    "icon": "cruelty_free",
                    "url": _admin_url("marketplace_petlisting_changelist"),
                },
                {
                    "title": "Brand settings",
                    "icon": "settings",
                    "url": _admin_url("siteplatform_sitesetting_changelist"),
                },
            ],
            "pending_approvals": pending_approvals,
            "pending_payouts": pending_payouts,
            "active_lost": active_lost,
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


def badge_active_lost(request):
    return (
        LostPetReport.objects.filter(status=LostReportStatus.ACTIVE).count() or None
    )


def badge_pending_listings(request):
    return PetListing.objects.filter(status="pending").count() or None


def badge_open_appointments(request):
    return (
        Appointment.objects.filter(
            status__in=[AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED]
        ).count()
        or None
    )


def badge_invoice_count(request):
    return Invoice.objects.count() or None


def badge_receipt_count(request):
    return Receipt.objects.count() or None


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
        """Branded Unfold login (email + password) matching the storefront sign-in UI."""
        return super().login(request, extra_context=extra_context)

    def logout(self, request, extra_context=None):
        """Clear the session and return to Django admin login (not the storefront)."""
        auth_logout(request)
        return HttpResponseRedirect(reverse("kedi_admin:login"))


kedi_admin_site = KediSmartAdminSite(name="kedi_admin")
