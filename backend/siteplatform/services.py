from __future__ import annotations

from typing import Any

from siteplatform.models import SiteSetting
from siteplatform.settings_catalog import SETTING_CATALOG, SettingMeta, get_setting_meta


def ensure_default_settings() -> int:
    """Create missing catalog settings with their default values. Returns created count."""
    created = 0
    existing = set(SiteSetting.objects.values_list("key", flat=True))
    to_create = []
    for key, meta in SETTING_CATALOG.items():
        if key in existing:
            continue
        to_create.append(SiteSetting(key=key, value_json=meta.default))
        created += 1
    if to_create:
        SiteSetting.objects.bulk_create(to_create)
    return created


def get_setting_value(key: str, default: Any = None) -> Any:
    row = SiteSetting.objects.filter(key=key).only("value_json").first()
    if row is None:
        meta = get_setting_meta(key)
        return meta.default if meta and default is None else default
    return row.value_json if row.value_json is not None else default


def set_setting_value(key: str, value: Any) -> SiteSetting:
    row, _created = SiteSetting.objects.update_or_create(
        key=key,
        defaults={"value_json": value},
    )
    return row


def serialize_value_preview(value: Any, *, max_len: int = 72) -> str:
    if value is None:
        return "—"
    if isinstance(value, bool):
        return "On" if value else "Off"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str):
        text = value.strip() or "—"
        return text if len(text) <= max_len else text[: max_len - 1] + "…"
    if isinstance(value, (list, dict)):
        import json

        text = json.dumps(value, ensure_ascii=False)
        return text if len(text) <= max_len else text[: max_len - 1] + "…"
    return str(value)


def meta_or_custom(key: str) -> SettingMeta | None:
    return get_setting_meta(key)
