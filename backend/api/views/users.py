from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes
from rest_framework.response import Response

from accounts.models import UserProfile
from api.authentication import JWTAuthentication, get_current_user
from api.views import serialize_model


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
def me(request):
    user = get_current_user(request)
    return Response(serialize_model(user))


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
