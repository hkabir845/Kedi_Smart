from django.core.management.base import BaseCommand

from accounts.models import User, UserProfile, UserRole
from api.security import get_password_hash


class Command(BaseCommand):
    help = "Create a staff superuser for Django /admin/ (accounts.User)."

    def add_arguments(self, parser):
        parser.add_argument("--email", default="admin@kedismart.com")
        parser.add_argument("--password", default="admin123")
        parser.add_argument("--name", default="Admin User")

    def handle(self, *args, **options):
        email = options["email"]
        password = options["password"]
        name = options["name"]

        user = User.objects.filter(email=email).first()
        if user:
            user.role = UserRole.SUPER_ADMIN
            user.is_active = True
            user.is_staff = True
            user.is_superuser = True
            user.is_verified = True
            user.save()
            UserProfile.objects.get_or_create(user=user, defaults={"full_name": name})
            self.stdout.write(self.style.SUCCESS(f"Updated admin flags for: {email}"))
            return

        user = User.objects.create(
            email=email,
            password_hash=get_password_hash(password),
            role=UserRole.SUPER_ADMIN,
            is_active=True,
            is_verified=True,
            is_staff=True,
            is_superuser=True,
        )
        UserProfile.objects.get_or_create(user=user, defaults={"full_name": name})
        self.stdout.write(self.style.SUCCESS(f"Created admin user: {email}"))
