"""Public site branding / contact / social settings for the storefront."""

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from siteplatform.services import ensure_default_settings, get_setting_value

PUBLIC_KEYS = (
    "brand.app_name",
    "brand.tagline",
    "brand.description",
    "brand.logo_url",
    "brand.ceo_name",
    "contact.phone",
    "contact.email",
    "contact.address",
    "contact.whatsapp",
    "social.facebook",
    "social.instagram",
    "social.youtube",
    "social.tiktok",
    "seo.meta_title",
    "seo.meta_description",
    "seo.google_site_verification",
    "seo.bing_site_verification",
)


def _as_str(value) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        text = value.strip()
        if (text.startswith('"') and text.endswith('"')) or (
            text.startswith("'") and text.endswith("'")
        ):
            text = text[1:-1].strip()
        return text
    if isinstance(value, dict):
        for key in ("url", "href", "value"):
            if value.get(key):
                return _as_str(value.get(key))
    return str(value).strip()


@api_view(["GET"])
@permission_classes([AllowAny])
def public_site_settings(request):
    """Storefront-safe brand/contact/social links (no auth)."""
    ensure_default_settings()
    data = {key: _as_str(get_setting_value(key, "")) for key in PUBLIC_KEYS}
    data["social"] = {
        "facebook": data.get("social.facebook", ""),
        "instagram": data.get("social.instagram", ""),
        "youtube": data.get("social.youtube", ""),
        "tiktok": data.get("social.tiktok", ""),
    }
    data["seo"] = {
        "meta_title": data.get("seo.meta_title", ""),
        "meta_description": data.get("seo.meta_description", ""),
        "google_site_verification": data.get("seo.google_site_verification", ""),
        "bing_site_verification": data.get("seo.bing_site_verification", ""),
    }
    return Response(data)
