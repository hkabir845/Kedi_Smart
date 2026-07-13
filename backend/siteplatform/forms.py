from __future__ import annotations

import json
import re

from django import forms
from django.core.exceptions import ValidationError
from django.urls import reverse

from config.widgets import ImageDropzoneWidget
from siteplatform.models import SiteSetting
from siteplatform.settings_catalog import (
    SETTING_CATALOG,
    catalog_choices,
    get_setting_meta,
)


CUSTOM_KEY_RE = re.compile(r"^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$")


class SiteSettingForm(forms.ModelForm):
    """Typed editor for curated keys; JSON fallback for custom keys."""

    value_string = forms.CharField(required=False, label="Value")
    value_text = forms.CharField(
        required=False,
        label="Value",
        widget=forms.Textarea(attrs={"rows": 5}),
    )
    value_url = forms.URLField(
        required=False,
        label="URL",
        assume_scheme="https",
        widget=forms.URLInput(attrs={"placeholder": "https://…"}),
    )
    value_image = forms.CharField(required=False, label="Image")
    value_boolean = forms.BooleanField(required=False, label="Enabled")
    value_json = forms.CharField(
        required=False,
        label="JSON value",
        widget=forms.Textarea(
            attrs={
                "rows": 10,
                "spellcheck": "false",
                "placeholder": '{\n  "example": true\n}',
            }
        ),
        help_text="Raw JSON for advanced / custom settings.",
    )
    custom_key = forms.CharField(
        required=False,
        label="Custom key",
        max_length=255,
        help_text="Dotted lowercase key, e.g. integrations.sms_provider",
        widget=forms.TextInput(attrs={"placeholder": "namespace.name"}),
    )

    class Meta:
        model = SiteSetting
        fields = ("key",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        instance = self.instance
        is_edit = bool(instance and instance.pk)
        meta = get_setting_meta(instance.key) if is_edit else None
        self._active_value_field = None

        existing_keys = set(SiteSetting.objects.values_list("key", flat=True))

        if is_edit:
            self.fields["key"].disabled = True
            self.fields["key"].help_text = meta.help_text if meta else "Custom setting key."
            if meta:
                self.fields["key"].label = meta.label
            self.fields.pop("custom_key", None)
            self._configure_value_fields(meta, instance.value_json)
        else:
            missing = [(k, label) for k, label in catalog_choices() if k not in existing_keys]
            missing.append(("__custom__", "Custom key (advanced)…"))
            self.fields["key"] = forms.ChoiceField(
                label="Setting",
                choices=[("", "Select a setting…")] + missing,
                help_text=(
                    "Choose a platform setting to create. "
                    "You will edit its value on the next screen."
                ),
            )
            # Value is applied from catalog defaults on create.
            for name in (
                "value_string",
                "value_text",
                "value_url",
                "value_image",
                "value_boolean",
                "value_json",
            ):
                self.fields.pop(name, None)

    def _configure_value_fields(self, meta, value):
        value_type = meta.value_type if meta else "json"

        if value_type == "string":
            self.fields["value_string"].initial = "" if value is None else str(value)
            self.fields["value_string"].help_text = meta.help_text if meta else ""
            self._active_value_field = "value_string"
        elif value_type == "text":
            self.fields["value_text"].initial = "" if value is None else str(value)
            self.fields["value_text"].help_text = meta.help_text if meta else ""
            self._active_value_field = "value_text"
        elif value_type == "url":
            self.fields["value_url"].initial = "" if value is None else str(value)
            self.fields["value_url"].help_text = meta.help_text if meta else ""
            self._active_value_field = "value_url"
        elif value_type == "image":
            upload_url = reverse("kedi_admin:kedi_upload_image")
            subdir = meta.image_subdir if meta else "branding"
            self.fields["value_image"].widget = ImageDropzoneWidget(
                upload_url=upload_url,
                subdir=subdir,
                mode="contain",
                hint=meta.help_text if meta else "Upload, paste, or drag & drop.",
            )
            self.fields["value_image"].initial = "" if value is None else str(value)
            self.fields["value_image"].help_text = meta.help_text if meta else ""
            self._active_value_field = "value_image"
        elif value_type == "boolean":
            self.fields["value_boolean"].initial = bool(value)
            self.fields["value_boolean"].help_text = meta.help_text if meta else ""
            self._active_value_field = "value_boolean"
        else:
            if value is None:
                self.fields["value_json"].initial = ""
            else:
                self.fields["value_json"].initial = json.dumps(value, ensure_ascii=False, indent=2)
            self._active_value_field = "value_json"

        for name in (
            "value_string",
            "value_text",
            "value_url",
            "value_image",
            "value_boolean",
            "value_json",
        ):
            if name != self._active_value_field:
                self.fields.pop(name, None)

    def clean_custom_key(self):
        custom = (self.cleaned_data.get("custom_key") or "").strip()
        if not custom:
            return custom
        if not CUSTOM_KEY_RE.match(custom):
            raise ValidationError("Use dotted lowercase keys like integrations.sms_provider.")
        return custom

    def clean(self):
        cleaned = super().clean()
        key = cleaned.get("key")

        if not self.instance.pk:
            if key == "__custom__":
                custom = (cleaned.get("custom_key") or "").strip()
                if not custom:
                    self.add_error("custom_key", "Enter a custom key.")
                elif custom in SETTING_CATALOG:
                    self.add_error("custom_key", "That key is reserved. Pick it from the list.")
                elif SiteSetting.objects.filter(key=custom).exists():
                    self.add_error("custom_key", "A setting with this key already exists.")
                else:
                    cleaned["key"] = custom
            elif key and SiteSetting.objects.filter(key=key).exists():
                self.add_error("key", "This setting already exists — open it from the list.")
            # Defaults applied in save()
            meta = get_setting_meta(cleaned.get("key") or "")
            cleaned["_parsed_value"] = meta.default if meta else {}
            return cleaned

        active = self._active_value_field or "value_json"
        if active == "value_boolean":
            cleaned["_parsed_value"] = bool(cleaned.get("value_boolean"))
        elif active == "value_json":
            raw = (cleaned.get("value_json") or "").strip()
            if not raw:
                cleaned["_parsed_value"] = None
            else:
                try:
                    cleaned["_parsed_value"] = json.loads(raw)
                except json.JSONDecodeError as exc:
                    self.add_error("value_json", f"Invalid JSON: {exc.msg}")
        else:
            cleaned["_parsed_value"] = (cleaned.get(active) or "").strip()
        return cleaned

    def save(self, commit=True):
        instance = super().save(commit=False)
        if not instance.key:
            instance.key = self.cleaned_data.get("key")
        instance.value_json = self.cleaned_data.get("_parsed_value")
        if commit:
            instance.save()
        return instance
