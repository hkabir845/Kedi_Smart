from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes
from rest_framework.response import Response

from accounts.models import RefreshToken, UserProfile
from api.authentication import JWTAuthentication, get_current_user
from api.security import get_password_hash, validate_password_strength, verify_password
from api.views import serialize_model


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
def me(request):
    user = get_current_user(request)
    return Response(
        {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "is_staff": user.is_staff,
            "is_verified": user.is_verified,
        }
    )


@api_view(["GET", "PUT"])
@authentication_classes([JWTAuthentication])
def me_profile(request):
    user = get_current_user(request)
    profile = UserProfile.objects.filter(user_id=user.id).first()

    if request.method == "GET":
        if not profile:
            return Response({"detail": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(serialize_model(profile))

    if not profile:
        profile = UserProfile(user=user, full_name=user.email)
        profile.save()

    update_fields = [
        "full_name",
        "phone",
        "city",
        "country",
        "address",
        "emergency_contact",
        "avatar_url",
        "bio",
        "privacy_settings",
    ]
    for field in update_fields:
        if field in request.data:
            setattr(profile, field, request.data[field])

    profile.save()
    return Response(serialize_model(profile))


@api_view(["POST"])
@authentication_classes([JWTAuthentication])
def change_password(request):
    user = get_current_user(request)
    current = request.data.get("current_password") or ""
    new_password = request.data.get("new_password")

    if not verify_password(current, user.password_hash):
        return Response({"detail": "Current password is incorrect"}, status=status.HTTP_400_BAD_REQUEST)

    password_error = validate_password_strength(new_password)
    if password_error:
        return Response({"detail": password_error}, status=status.HTTP_400_BAD_REQUEST)

    user.password_hash = get_password_hash(new_password)
    user.save(update_fields=["password_hash"])
    RefreshToken.objects.filter(user_id=user.id).delete()
    return Response({"message": "Password updated successfully"})
