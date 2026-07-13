from django import forms

from config.widgets import ImageDropzoneWidget


# Back-compat alias
ProductImageDropzoneWidget = ImageDropzoneWidget


class ProductImageInlineForm(forms.ModelForm):
    class Meta:
        from shop.models import ProductImage

        model = ProductImage
        fields = ("url", "sort_order")

    def __init__(self, *args, upload_url: str = "", **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["url"].required = False
        self.fields["url"].label = "Image"
        self.fields["url"].help_text = (
            "Upload, paste (Ctrl+V), or drag & drop. Auto-resized to a square for the shop UI."
        )
        self.fields["url"].widget = ImageDropzoneWidget(
            upload_url=upload_url,
            subdir="products",
            mode="square",
        )
        self.fields["sort_order"].widget.attrs.setdefault("style", "max-width:5rem")
