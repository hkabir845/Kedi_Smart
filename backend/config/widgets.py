from django import forms


class ImageDropzoneWidget(forms.TextInput):
    """URL field backed by upload / paste / drag-drop UI."""

    template_name = "admin/widgets/image_dropzone.html"

    class Media:
        css = {"all": ("admin/css/image_upload.css",)}
        js = ("admin/js/image_upload.js",)

    def __init__(
        self,
        attrs=None,
        *,
        upload_url: str = "",
        subdir: str = "images",
        mode: str = "contain",
        hint: str = "",
    ):
        default = {
            "class": "kedi-image-url-input",
            "placeholder": "https://… or upload above",
            "autocomplete": "off",
        }
        if attrs:
            default.update(attrs)
        super().__init__(attrs=default)
        self.upload_url = upload_url
        self.subdir = subdir or "images"
        self.mode = mode or "contain"
        self.hint = hint or (
            "Upload, paste (Ctrl+V), or drag & drop. "
            + (
                "Auto-fit to square (1200×1200)."
                if self.mode == "square"
                else "Auto-resized for the web."
            )
        )

    def get_context(self, name, value, attrs):
        context = super().get_context(name, value, attrs)
        context["widget"]["upload_url"] = self.upload_url
        context["widget"]["preview_url"] = value or ""
        context["widget"]["subdir"] = self.subdir
        context["widget"]["mode"] = self.mode
        context["widget"]["hint"] = self.hint
        context["widget"]["placeholder_sub"] = (
            "Auto-fit to square shop layout (1200×1200)"
            if self.mode == "square"
            else "Auto-resized for the web"
        )
        return context
