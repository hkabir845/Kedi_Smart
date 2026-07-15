"""Verify password-reset SMTP + public URLs after VPS deploy."""

from __future__ import annotations

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = (
        "Check that forgot-password can deliver OTPs in production "
        "(SMTP + FRONTEND_URL). Optionally send a test email."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--send-to",
            default="",
            help="If set, send a test password-reset style email to this address",
        )
        parser.add_argument(
            "--strict",
            action="store_true",
            help="Exit non-zero when SMTP/FRONTEND_URL look unsafe for production",
        )

    def handle(self, *args, **options):
        from accounts.services.mail import public_frontend_url, smtp_ready

        backend = settings.EMAIL_BACKEND
        host = getattr(settings, "EMAIL_HOST", "") or ""
        front = public_frontend_url()
        debug = settings.DEBUG
        issues: list[str] = []

        self.stdout.write("=== Kedi Smart password-reset check ===")
        self.stdout.write(f"DEBUG:            {debug}")
        self.stdout.write(f"EMAIL_BACKEND:    {backend}")
        self.stdout.write(f"EMAIL_HOST:       {host or '(empty)'}")
        self.stdout.write(f"EMAIL_PORT:       {settings.EMAIL_PORT}")
        self.stdout.write(f"EMAIL_USE_TLS:    {settings.EMAIL_USE_TLS}")
        self.stdout.write(f"EMAIL_USE_SSL:    {getattr(settings, 'EMAIL_USE_SSL', False)}")
        self.stdout.write(f"EMAIL_HOST_USER:  {settings.EMAIL_HOST_USER or '(empty)'}")
        self.stdout.write(
            f"DEFAULT_FROM:     {settings.DEFAULT_FROM_EMAIL}"
        )
        self.stdout.write(f"FRONTEND_URL:     {front}")
        self.stdout.write(f"APP_URL:          {settings.APP_URL}")
        self.stdout.write(f"SMTP ready:       {smtp_ready()}")

        if not debug and not smtp_ready():
            issues.append(
                "Production (DEBUG=False) but SMTP is not configured. "
                "Set EMAIL_HOST, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, DEFAULT_FROM_EMAIL "
                "in backend/.env then restart gunicorn."
            )
        if not debug and ("localhost" in front.lower() or "127.0.0.1" in front):
            issues.append(
                f"FRONTEND_URL is {front!r} — reset links must use your public HTTPS domain."
            )
        if host and not settings.EMAIL_HOST_USER:
            issues.append("EMAIL_HOST is set but EMAIL_HOST_USER is empty.")
        if host and not settings.EMAIL_HOST_PASSWORD:
            issues.append("EMAIL_HOST is set but EMAIL_HOST_PASSWORD is empty.")

        for msg in issues:
            self.stdout.write(self.style.ERROR(f"ISSUE: {msg}"))

        send_to = (options.get("send_to") or "").strip()
        if send_to:
            self.stdout.write(f"Sending test OTP email to {send_to}…")
            from accounts.services.mail import send_password_reset_otp

            ok = send_password_reset_otp(to_email=send_to, otp="000000")
            if ok:
                self.stdout.write(self.style.SUCCESS("Test email accepted by mail backend."))
            else:
                issues.append(f"Failed to send test email to {send_to}")
                self.stdout.write(self.style.ERROR("Test email FAILED — see traceback above."))

        if issues and options.get("strict"):
            raise CommandError(f"{len(issues)} password-reset configuration issue(s)")

        if not issues:
            self.stdout.write(self.style.SUCCESS("Password-reset config looks OK."))
        else:
            self.stdout.write(
                self.style.WARNING(
                    f"{len(issues)} issue(s). Fix backend/.env then: "
                    "python manage.py check_password_reset --send-to you@example.com"
                )
            )
