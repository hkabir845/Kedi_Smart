from django.contrib import messages
from django.contrib.admin.views.main import IS_POPUP_VAR
from django.shortcuts import redirect
from django.urls import reverse
from unfold.decorators import action

from config.widgets import ImageDropzoneWidget


class EditSelectedMixin:
    """Injects an Edit option into every changelist Select action dropdown."""

    @action(description="Edit")
    def edit_selected(self, request, queryset):
        count = queryset.count()
        label = self.opts.verbose_name
        if count != 1:
            self.message_user(
                request,
                f"Select exactly one {label} to edit.",
                level=messages.WARNING,
            )
            return None
        obj = queryset.first()
        return redirect(
            reverse(
                f"{self.admin_site.name}:{self.opts.app_label}_{self.opts.model_name}_change",
                args=[obj.pk],
            )
        )

    def get_actions(self, request):
        # Respect ModelAdmin.actions = None (actions disabled for this admin).
        if self.actions is None or IS_POPUP_VAR in request.GET:
            return {}

        actions = super().get_actions(request)
        if not self.has_change_permission(request):
            return actions

        # Must be unbound (class attr) — Django calls func(self, request, queryset).
        func = getattr(self.__class__, "edit_selected")
        description = getattr(func, "short_description", "Edit")
        edit_entry = (func, "edit_selected", description)

        ordered = {}
        if "delete_selected" in actions:
            ordered["delete_selected"] = actions.pop("delete_selected")
        ordered["edit_selected"] = edit_entry
        for key in list(actions):
            if key.startswith("edit_") and key != "edit_selected":
                actions.pop(key)
        ordered.update(actions)
        return ordered


def _parse_image_field_spec(spec):
    if isinstance(spec, (tuple, list)):
        name = spec[0]
        subdir = spec[1] if len(spec) > 1 else "images"
        mode = spec[2] if len(spec) > 2 else "contain"
        return name, subdir, mode
    return spec, "images", "contain"


def apply_image_widgets(form_or_fields, *, upload_url: str, image_url_fields):
    """Apply dropzone widgets to a Form class (base_fields) or form instance (fields)."""
    fields = getattr(form_or_fields, "base_fields", None) or getattr(form_or_fields, "fields", None)
    if not fields:
        return form_or_fields
    for spec in image_url_fields:
        name, subdir, mode = _parse_image_field_spec(spec)
        field = fields.get(name)
        if not field:
            continue
        field.required = False
        if not field.help_text:
            field.help_text = "Upload, paste (Ctrl+V), or drag & drop an image."
        field.widget = ImageDropzoneWidget(
            upload_url=upload_url,
            subdir=subdir,
            mode=mode,
        )
    return form_or_fields


class ImageUrlFieldsMixin:
    """
    Turn CharField image URL fields into upload / paste / drag-drop widgets.
      image_url_fields = ("logo_url",)
      image_url_fields = (("logo_url", "logos", "contain"), ...)
    """

    image_url_fields = ()

    def _image_upload_url(self):
        return reverse(f"{self.admin_site.name}:kedi_upload_image")

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if self.image_url_fields:
            apply_image_widgets(
                form,
                upload_url=self._image_upload_url(),
                image_url_fields=self.image_url_fields,
            )
        return form


class ImageUrlInlineMixin:
    """Same as ImageUrlFieldsMixin for TabularInline / StackedInline."""

    image_url_fields = ()

    def _image_upload_url(self):
        return reverse(f"{self.admin_site.name}:kedi_upload_image")

    def get_formset(self, request, obj=None, **kwargs):
        formset = super().get_formset(request, obj, **kwargs)
        if not self.image_url_fields:
            return formset
        upload_url = self._image_upload_url()
        specs = self.image_url_fields
        base_form = formset.form

        class BoundImageForm(base_form):
            def __init__(self, *args, **form_kwargs):
                super().__init__(*args, **form_kwargs)
                apply_image_widgets(
                    self,
                    upload_url=upload_url,
                    image_url_fields=specs,
                )

        formset.form = BoundImageForm
        return formset
