"""Curated platform settings catalog for the Site Setting admin."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

ValueType = Literal["string", "text", "url", "image", "boolean", "json"]


@dataclass(frozen=True)
class SettingMeta:
    key: str
    label: str
    group: str
    group_label: str
    value_type: ValueType
    default: Any
    help_text: str = ""
    image_subdir: str = "branding"


# Groups ordered for changelist / form presentation.
SETTING_GROUPS: list[tuple[str, str]] = [
    ("brand", "Brand & identity"),
    ("contact", "Contact"),
    ("seo", "SEO & discovery"),
    ("social", "Social links"),
    ("commerce", "Commerce"),
    ("features", "Features & maintenance"),
]

SETTING_CATALOG: dict[str, SettingMeta] = {
    "brand.app_name": SettingMeta(
        key="brand.app_name",
        label="App name",
        group="brand",
        group_label="Brand & identity",
        value_type="string",
        default="Kedi Smart",
        help_text="Public product name shown in headers, emails, and admin chrome.",
    ),
    "brand.tagline": SettingMeta(
        key="brand.tagline",
        label="Tagline",
        group="brand",
        group_label="Brand & identity",
        value_type="string",
        default="Trusted by Pets, Loved by Owners",
        help_text="Short brand line used on landing and footer hero.",
    ),
    "brand.description": SettingMeta(
        key="brand.description",
        label="Brand description",
        group="brand",
        group_label="Brand & identity",
        value_type="text",
        default=(
            "KediSmart is Bangladesh's trusted pet & animal platform — "
            "shop, care, connect, and protect your pets."
        ),
        help_text="Longer about text for footer and marketing surfaces.",
    ),
    "brand.logo_url": SettingMeta(
        key="brand.logo_url",
        label="Logo",
        group="brand",
        group_label="Brand & identity",
        value_type="image",
        default="/brand/kedismart-logo.png",
        help_text="Primary logo for storefront and emails. Upload, paste, or drag & drop.",
        image_subdir="branding",
    ),
    "brand.ceo_name": SettingMeta(
        key="brand.ceo_name",
        label="CEO / founder name",
        group="brand",
        group_label="Brand & identity",
        value_type="string",
        default="Jahura Satter",
        help_text="Optional leadership credit shown in footer copy.",
    ),
    "contact.phone": SettingMeta(
        key="contact.phone",
        label="Support phone",
        group="contact",
        group_label="Contact",
        value_type="string",
        default="+880 1898-941782",
        help_text="Primary customer support phone (display format).",
    ),
    "contact.email": SettingMeta(
        key="contact.email",
        label="Support email",
        group="contact",
        group_label="Contact",
        value_type="string",
        default="info@kedismart.com",
        help_text="Public support inbox.",
    ),
    "contact.address": SettingMeta(
        key="contact.address",
        label="Office address",
        group="contact",
        group_label="Contact",
        value_type="text",
        default="A.B.M Tower, Gulshan 2, Dhaka 1212, Bangladesh",
        help_text="Physical / registered address for the footer.",
    ),
    "contact.whatsapp": SettingMeta(
        key="contact.whatsapp",
        label="WhatsApp number",
        group="contact",
        group_label="Contact",
        value_type="string",
        default="+8801898941782",
        help_text="WhatsApp / chat commerce number (digits preferred).",
    ),
    "seo.meta_title": SettingMeta(
        key="seo.meta_title",
        label="Default meta title",
        group="seo",
        group_label="SEO & discovery",
        value_type="string",
        default="Kedi Smart — Pet & Animal Platform",
        help_text="Fallback document title when a page does not set its own.",
    ),
    "seo.meta_description": SettingMeta(
        key="seo.meta_description",
        label="Default meta description",
        group="seo",
        group_label="SEO & discovery",
        value_type="text",
        default=(
            "Shop pet products, find vets, explore live animals, and protect your pets "
            "with Kedi Smart — Bangladesh's trusted pet platform."
        ),
        help_text="Default SEO description for social shares and search.",
    ),
    "seo.google_site_verification": SettingMeta(
        key="seo.google_site_verification",
        label="Google Search Console verification",
        group="seo",
        group_label="SEO & discovery",
        value_type="string",
        default="",
        help_text="Content token from Google Search Console meta tag (not the full HTML).",
    ),
    "seo.bing_site_verification": SettingMeta(
        key="seo.bing_site_verification",
        label="Bing Webmaster verification",
        group="seo",
        group_label="SEO & discovery",
        value_type="string",
        default="",
        help_text="msvalidate.01 content token from Bing Webmaster Tools.",
    ),
    "social.facebook": SettingMeta(
        key="social.facebook",
        label="Facebook URL",
        group="social",
        group_label="Social links",
        value_type="url",
        default="",
        help_text="Full profile or page URL.",
    ),
    "social.instagram": SettingMeta(
        key="social.instagram",
        label="Instagram URL",
        group="social",
        group_label="Social links",
        value_type="url",
        default="",
        help_text="Full profile URL.",
    ),
    "social.youtube": SettingMeta(
        key="social.youtube",
        label="YouTube URL",
        group="social",
        group_label="Social links",
        value_type="url",
        default="",
        help_text="Channel or video hub URL.",
    ),
    "social.tiktok": SettingMeta(
        key="social.tiktok",
        label="TikTok URL",
        group="social",
        group_label="Social links",
        value_type="url",
        default="",
        help_text="Profile URL.",
    ),
    "commerce.currency": SettingMeta(
        key="commerce.currency",
        label="Store currency",
        group="commerce",
        group_label="Commerce",
        value_type="string",
        default="BDT",
        help_text="ISO-style currency code used in admin summaries and storefront copy.",
    ),
    "commerce.support_hours": SettingMeta(
        key="commerce.support_hours",
        label="Support hours",
        group="commerce",
        group_label="Commerce",
        value_type="string",
        default="Sat–Thu, 10:00–20:00 BST",
        help_text="Shown near checkout / contact help.",
    ),
    "commerce.bkash_number": SettingMeta(
        key="commerce.bkash_number",
        label="bKash merchant number",
        group="commerce",
        group_label="Commerce",
        value_type="string",
        default="+880 1898-941782",
        help_text="Shown on invoices when customers pay via bKash.",
    ),
    "commerce.nagad_number": SettingMeta(
        key="commerce.nagad_number",
        label="Nagad merchant number",
        group="commerce",
        group_label="Commerce",
        value_type="string",
        default="+880 1898-941782",
        help_text="Shown on invoices when customers pay via Nagad.",
    ),
    "commerce.pickup_address": SettingMeta(
        key="commerce.pickup_address",
        label="Store pickup address",
        group="commerce",
        group_label="Commerce",
        value_type="text",
        default="A.B.M Tower, Gulshan 2, Dhaka 1212",
        help_text="Shown for store-pickup orders on invoice and order tracking.",
    ),
    "commerce.free_delivery_cities": SettingMeta(
        key="commerce.free_delivery_cities",
        label="Free-delivery cities",
        group="commerce",
        group_label="Commerce",
        value_type="text",
        default="Dhaka, Gulshan, Banani, Dhanmondi, Mirpur, Uttara, Mohammadpur, Motijheel",
        help_text="Comma-separated city/area names with free courier (case-insensitive). Outside these cities a courier fee applies.",
    ),
    "commerce.inside_city_shipping": SettingMeta(
        key="commerce.inside_city_shipping",
        label="Inside-city shipping (BDT)",
        group="commerce",
        group_label="Commerce",
        value_type="string",
        default="0",
        help_text="Courier fee when delivering inside free-delivery cities (0 = free).",
    ),
    "commerce.outside_city_shipping": SettingMeta(
        key="commerce.outside_city_shipping",
        label="Outside-city shipping (BDT)",
        group="commerce",
        group_label="Commerce",
        value_type="string",
        default="120",
        help_text="Courier fee charged to the shopper for delivery outside free-delivery cities.",
    ),
    "commerce.free_delivery_threshold": SettingMeta(
        key="commerce.free_delivery_threshold",
        label="Free delivery order threshold (BDT)",
        group="commerce",
        group_label="Commerce",
        value_type="string",
        default="1500",
        help_text="Orders at/above this subtotal (after discount) get free courier nationwide.",
    ),
    "commerce.tax_rate": SettingMeta(
        key="commerce.tax_rate",
        label="Tax rate (decimal)",
        group="commerce",
        group_label="Commerce",
        value_type="string",
        default="0.05",
        help_text="e.g. 0.05 = 5% VAT/tax on taxable merchandise.",
    ),
    "features.marketplace_enabled": SettingMeta(
        key="features.marketplace_enabled",
        label="Marketplace enabled",
        group="features",
        group_label="Features & maintenance",
        value_type="boolean",
        default=True,
        help_text="When off, hide or soft-disable live animal marketplace CTAs.",
    ),
    "features.vets_enabled": SettingMeta(
        key="features.vets_enabled",
        label="Vets module enabled",
        group="features",
        group_label="Features & maintenance",
        value_type="boolean",
        default=True,
        help_text="Toggle vet discovery / booking surfaces.",
    ),
    "features.maintenance_mode": SettingMeta(
        key="features.maintenance_mode",
        label="Maintenance mode",
        group="features",
        group_label="Features & maintenance",
        value_type="boolean",
        default=False,
        help_text="Shows a maintenance banner; does not lock admin access.",
    ),
    "features.maintenance_message": SettingMeta(
        key="features.maintenance_message",
        label="Maintenance message",
        group="features",
        group_label="Features & maintenance",
        value_type="text",
        default="We're improving Kedi Smart. Please check back shortly.",
        help_text="Message shown when maintenance mode is on.",
    ),
}


def get_setting_meta(key: str) -> SettingMeta | None:
    return SETTING_CATALOG.get(key)


def catalog_choices(*, include_blank: bool = False) -> list[tuple[str, str]]:
    choices: list[tuple[str, str]] = []
    if include_blank:
        choices.append(("", "Select a setting…"))
    for group_key, group_label in SETTING_GROUPS:
        for meta in SETTING_CATALOG.values():
            if meta.group == group_key:
                choices.append((meta.key, f"{group_label} · {meta.label}"))
    return choices


def group_label_for_key(key: str) -> str:
    meta = get_setting_meta(key)
    if meta:
        return meta.group_label
    if "." in key:
        return key.split(".", 1)[0].replace("_", " ").title()
    return "Custom"


def human_label_for_key(key: str) -> str:
    meta = get_setting_meta(key)
    if meta:
        return meta.label
    return key.replace(".", " · ").replace("_", " ")
