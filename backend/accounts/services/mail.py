"""Transactional email helpers (password reset OTP, etc.)."""

from __future__ import annotations

import logging
from urllib.parse import quote

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)


def smtp_ready() -> bool:
    """True when production SMTP (or an explicit non-console backend) is wired."""
    backend = (getattr(settings, "EMAIL_BACKEND", "") or "").lower()
    if "console" in backend or "locmem" in backend or "dummy" in backend:
        return False
    return bool(getattr(settings, "EMAIL_HOST", "").strip())


def public_frontend_url() -> str:
    return (getattr(settings, "FRONTEND_URL", "") or "http://localhost:3000").rstrip("/")


def warn_if_localhost_frontend() -> None:
    url = public_frontend_url().lower()
    if not getattr(settings, "DEBUG", False) and (
        "localhost" in url or "127.0.0.1" in url
    ):
        logger.error(
            "FRONTEND_URL is %s while DEBUG=False — password-reset links will be wrong on the VPS. "
            "Set FRONTEND_URL=https://your-public-domain",
            public_frontend_url(),
        )


def send_password_reset_otp(*, to_email: str, otp: str) -> bool:
    """
    Send OTP + deep-link email. Returns True if the mail API accepted it.

    On SMTP failure: logs the error. In DEBUG / console backend only, also prints
    the OTP to stdout so local DEV still works without a mailbox.
    """
    warn_if_localhost_frontend()
    base = public_frontend_url()
    reset_url = f"{base}/reset-password?email={quote(to_email)}&otp={otp}"
    subject = "Your Kedi Smart password reset code"
    ttl = int(getattr(settings, "PASSWORD_RESET_OTP_TTL_MINUTES", 15))
    text_body = (
        f"Hi,\n\nYour one-time password (OTP) to reset your Kedi Smart account is:\n\n"
        f"    {otp}\n\n"
        f"This code expires in {ttl} minutes.\n\n"
        f"Or open this link:\n{reset_url}\n\n"
        f"If you did not request this, you can ignore this email.\n"
    )
    html_body = f"""\
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#1a1a1a;">
  <p>Hi,</p>
  <p>Your one-time password (OTP) to reset your Kedi Smart account is:</p>
  <p style="font-size:28px;font-weight:700;letter-spacing:0.2em;margin:24px 0;">{otp}</p>
  <p>This code expires in <strong>{ttl} minutes</strong>.</p>
  <p><a href="{reset_url}" style="display:inline-block;padding:10px 18px;background:#0d9488;color:#fff;text-decoration:none;border-radius:8px;">Reset password</a></p>
  <p style="color:#666;font-size:13px;">Or paste this link:<br>{reset_url}</p>
  <p style="color:#666;font-size:13px;">If you did not request this, you can ignore this email.</p>
</body>
</html>
"""
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@kedismart.com")
    try:
        msg = EmailMultiAlternatives(subject, text_body, from_email, [to_email])
        msg.attach_alternative(html_body, "text/html")
        msg.send(fail_silently=False)
        logger.info("Password-reset OTP emailed to %s", to_email)
        return True
    except Exception:
        logger.exception("Failed to send password-reset OTP to %s via %s", to_email, settings.EMAIL_BACKEND)
        # Local / misconfigured console: operators can read OTP from process logs
        if getattr(settings, "DEBUG", False) or not smtp_ready():
            print(f"[password-reset] OTP for {to_email}: {otp}")
            print(f"[password-reset] Reset URL: {reset_url}")
        else:
            logger.error(
                "Password reset email failed in production for %s — check EMAIL_HOST / credentials. "
                "OTP was NOT printed to logs.",
                to_email,
            )
        return False
