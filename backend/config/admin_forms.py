from django.utils.translation import gettext_lazy as _
from unfold.forms import AuthenticationForm


class KediAdminAuthenticationForm(AuthenticationForm):
    """Staff login with email-first labels matching the storefront sign-in UI."""

    def __init__(self, request=None, *args, **kwargs):
        super().__init__(request, *args, **kwargs)
        self.fields["username"].label = _("Email address")
        self.fields["username"].widget.input_type = "email"
        self.fields["username"].widget.attrs.update(
            {
                "autocomplete": "username",
                "placeholder": "admin@kedismart.com",
                "spellcheck": "false",
            }
        )
        self.fields["password"].widget.attrs.update(
            {
                "autocomplete": "current-password",
            }
        )
