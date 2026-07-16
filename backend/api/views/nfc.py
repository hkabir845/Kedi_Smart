from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.models import UserProfile
from api.authentication import JWTAuthentication, OptionalJWTAuthentication, get_current_user
from api.views import serialize_model, serialize_models
from nfc.models import (
    FoundReport,
    LostPetReport,
    LostReportStatus,
    MaskedMessage,
    MaskedMessageThread,
    NFCTag,
    SenderType,
    TagActivation,
    TagStatus,
)
from pets.models import Pet, PetPhoto, PetPrivacySetting


def _scan_url(tag_uid: str) -> str:
    base = (getattr(settings, "FRONTEND_URL", None) or settings.APP_URL or "").rstrip("/")
    return f"{base}/scan/{tag_uid}"


def _ensure_tag_urls(tag: NFCTag) -> None:
    scan = _scan_url(tag.tag_uid)
    updates = []
    if not tag.nfc_url:
        tag.nfc_url = scan
        updates.append("nfc_url")
    if not tag.qr_url:
        tag.qr_url = scan
        updates.append("qr_url")
    if updates:
        tag.save(update_fields=updates)


def _phone_digits(phone: str | None) -> str | None:
    if not phone:
        return None
    digits = "".join(ch for ch in str(phone) if ch.isdigit())
    return digits or None


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
def list_pet_tags(request, pet_id):
    user = get_current_user(request)
    pet = Pet.objects.filter(id=pet_id, owner_id=user.id).first()
    if not pet:
        return Response({"detail": "Pet not found"}, status=status.HTTP_404_NOT_FOUND)

    activations = (
        TagActivation.objects.filter(pet_id=pet_id, owner_id=user.id, active=True)
        .select_related("tag")
        .order_by("-activated_at")
    )
    items = []
    for act in activations:
        tag = act.tag
        _ensure_tag_urls(tag)
        scan = tag.nfc_url or tag.qr_url or _scan_url(tag.tag_uid)
        items.append(
            {
                "tag_uid": tag.tag_uid,
                "status": tag.status,
                "nfc_url": tag.nfc_url or scan,
                "qr_url": tag.qr_url or scan,
                "scan_url": scan,
                "activated_at": act.activated_at.isoformat() if act.activated_at else None,
                "activation_id": act.id,
            }
        )
    return Response({"items": items})


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
def pet_lost_status(request, pet_id):
    user = get_current_user(request)
    pet = Pet.objects.filter(id=pet_id, owner_id=user.id).first()
    if not pet:
        return Response({"detail": "Pet not found"}, status=status.HTTP_404_NOT_FOUND)

    report = LostPetReport.objects.filter(pet_id=pet_id, status=LostReportStatus.ACTIVE).first()
    if not report:
        return Response({"lost_mode_active": False, "report": None})
    return Response({"lost_mode_active": True, "report": serialize_model(report)})


@api_view(["POST"])
@authentication_classes([JWTAuthentication])
def activate_tag(request):
    user = get_current_user(request)
    tag_uid = (request.data.get("tag_uid") or request.query_params.get("tag_uid") or "").strip()
    pet_id = request.data.get("pet_id") or request.query_params.get("pet_id")

    if not tag_uid:
        return Response({"detail": "tag_uid is required"}, status=status.HTTP_400_BAD_REQUEST)

    tag = NFCTag.objects.filter(tag_uid=tag_uid).first()
    if not tag:
        return Response({"detail": "Tag not found"}, status=status.HTTP_404_NOT_FOUND)

    pet = Pet.objects.filter(id=pet_id, owner_id=user.id).first()
    if not pet:
        return Response({"detail": "Pet not found"}, status=status.HTTP_404_NOT_FOUND)

    existing = TagActivation.objects.filter(tag_id=tag.id, active=True)
    for act in existing:
        act.active = False
        act.deactivated_at = timezone.now()
        act.save(update_fields=["active", "deactivated_at"])

    activation = TagActivation.objects.create(
        tag_id=tag.id,
        pet_id=pet_id,
        owner_id=user.id,
        active=True,
    )
    tag.status = TagStatus.ASSIGNED
    tag.save(update_fields=["status"])
    _ensure_tag_urls(tag)
    scan = tag.nfc_url or _scan_url(tag.tag_uid)

    return Response(
        {
            "message": "Tag activated successfully",
            "activation": serialize_model(activation),
            "tag": {
                "tag_uid": tag.tag_uid,
                "status": tag.status,
                "nfc_url": tag.nfc_url or scan,
                "qr_url": tag.qr_url or scan,
                "scan_url": scan,
            },
        }
    )


@api_view(["POST"])
@authentication_classes([JWTAuthentication])
def deactivate_tag(request):
    user = get_current_user(request)
    tag_uid = request.data.get("tag_uid") or request.query_params.get("tag_uid")

    tag = NFCTag.objects.filter(tag_uid=tag_uid).first()
    if not tag:
        return Response({"detail": "Tag not found"}, status=status.HTTP_404_NOT_FOUND)

    activation = TagActivation.objects.filter(
        tag_id=tag.id, active=True, owner_id=user.id
    ).first()
    if not activation:
        return Response({"detail": "Active activation not found"}, status=status.HTTP_404_NOT_FOUND)

    activation.active = False
    activation.deactivated_at = timezone.now()
    activation.save(update_fields=["active", "deactivated_at"])
    tag.status = TagStatus.AVAILABLE
    tag.save(update_fields=["status"])

    return Response({"message": "Tag deactivated successfully"})


@api_view(["GET"])
@permission_classes([AllowAny])
def scan_tag(request, tag_uid):
    tag = NFCTag.objects.filter(tag_uid=tag_uid).first()
    if not tag:
        return Response({"detail": "Tag not found"}, status=status.HTTP_404_NOT_FOUND)

    activation = TagActivation.objects.filter(tag_id=tag.id, active=True).first()
    if not activation:
        return Response({"message": "Tag not activated", "tag_uid": tag_uid})

    pet = Pet.objects.filter(id=activation.pet_id).first()
    privacy = PetPrivacySetting.objects.filter(pet_id=pet.id).first()
    owner_profile = UserProfile.objects.filter(user_id=activation.owner_id).first()

    response = {
        "tag_uid": tag_uid,
        "pet_id": pet.id,
        "lost_mode_active": False,
    }

    lost_report = LostPetReport.objects.filter(
        pet_id=pet.id, status=LostReportStatus.ACTIVE
    ).first()

    if lost_report:
        response["lost_mode_active"] = True
        response["last_seen_location"] = lost_report.last_seen_location_text
        if privacy and privacy.show_reward_note and lost_report.reward_note:
            response["reward_note"] = lost_report.reward_note

    phone = _phone_digits(owner_profile.phone if owner_profile else None)

    if privacy:
        public_fields = privacy.public_fields or {}
        if public_fields.get("name", True):
            response["name"] = pet.name
        if public_fields.get("species", True):
            response["species"] = pet.species
        if public_fields.get("breed", False):
            response["breed"] = pet.breed
        if public_fields.get("photo", False):
            photo = PetPhoto.objects.filter(pet_id=pet.id, is_primary=True).first()
            if not photo:
                photo = PetPhoto.objects.filter(pet_id=pet.id).first()
            if photo:
                url = photo.url or ""
                response["photo_url"] = url if url.startswith("http") else f"{settings.APP_URL}{url}"

        if pet.instructions_if_found:
            response["instructions_if_found"] = pet.instructions_if_found

        allow_call = bool(privacy.allow_call and phone)
        allow_whatsapp = bool(privacy.allow_whatsapp and phone)
        response["contact_options"] = {
            "allow_call": allow_call,
            "allow_whatsapp": allow_whatsapp,
            "allow_chat": bool(privacy.allow_chat),
            "phone": phone if (allow_call or allow_whatsapp) else None,
        }

        if owner_profile:
            if privacy.show_city_only:
                response["location"] = owner_profile.city
            else:
                response["location"] = (
                    f"{owner_profile.city}, {owner_profile.country}" if owner_profile.city else None
                )
    else:
        response["name"] = pet.name
        response["species"] = pet.species
        response["contact_options"] = {
            "allow_call": False,
            "allow_whatsapp": False,
            "allow_chat": True,
            "phone": None,
        }

    return Response(response)


@api_view(["POST"])
@authentication_classes([JWTAuthentication])
def close_lost_mode(request, pet_id):
    user = get_current_user(request)
    pet = Pet.objects.filter(id=pet_id, owner_id=user.id).first()
    if not pet:
        return Response({"detail": "Pet not found"}, status=status.HTTP_404_NOT_FOUND)

    report = LostPetReport.objects.filter(pet_id=pet_id, status=LostReportStatus.ACTIVE).first()
    if not report:
        return Response({"detail": "Active lost report not found"}, status=status.HTTP_404_NOT_FOUND)

    report.status = LostReportStatus.CLOSED
    report.closed_at = timezone.now()
    report.save(update_fields=["status", "closed_at"])

    return Response({"message": "Lost mode closed successfully"})


@api_view(["POST"])
@permission_classes([AllowAny])
def create_found_report(request, pet_id):
    pet = Pet.objects.filter(id=pet_id).first()
    if not pet:
        return Response({"detail": "Pet not found"}, status=status.HTTP_404_NOT_FOUND)

    message = request.data.get("message") or request.query_params.get("message")
    location_text = request.data.get("location_text") or request.query_params.get("location_text")
    finder_name = request.data.get("finder_name") or request.query_params.get("finder_name")
    finder_contact = request.data.get("finder_contact") or request.query_params.get("finder_contact")

    report = FoundReport.objects.create(
        pet_id=pet_id,
        finder_name=finder_name,
        finder_contact=finder_contact,
        message=message,
        location_text=location_text,
    )
    return Response(
        {"message": "Found report submitted successfully", "report": serialize_model(report)},
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "POST"])
@authentication_classes([OptionalJWTAuthentication])
@permission_classes([AllowAny])
def pet_messages(request, pet_id):
    if request.method == "POST":
        return send_message(request, pet_id)
    return get_messages(request, pet_id)


@api_view(["GET"])
@authentication_classes([OptionalJWTAuthentication])
def get_messages(request, pet_id):
    pet = Pet.objects.filter(id=pet_id).first()
    if not pet:
        return Response({"detail": "Pet not found"}, status=status.HTTP_404_NOT_FOUND)

    current_user = request.user if request.user and getattr(request.user, "is_authenticated", False) else None
    if not current_user or pet.owner_id != current_user.id:
        return Response({"detail": "Access denied"}, status=status.HTTP_403_FORBIDDEN)

    threads = MaskedMessageThread.objects.filter(pet_id=pet_id)
    result = []
    for thread in threads:
        messages = MaskedMessage.objects.filter(thread_id=thread.id).order_by("created_at")
        result.append(
            {
                "thread_id": thread.id,
                "finder_session_id": thread.finder_session_id,
                "messages": serialize_models(messages),
                "created_at": thread.created_at.isoformat(),
            }
        )
    return Response(result)


@api_view(["POST"])
@authentication_classes([OptionalJWTAuthentication])
@permission_classes([AllowAny])
def send_message(request, pet_id):
    pet = Pet.objects.filter(id=pet_id).first()
    if not pet:
        return Response({"detail": "Pet not found"}, status=status.HTTP_404_NOT_FOUND)

    message = (request.data.get("message") or request.query_params.get("message") or "").strip()
    if not message:
        return Response({"detail": "message is required"}, status=status.HTTP_400_BAD_REQUEST)

    thread_id = request.data.get("thread_id") or request.query_params.get("thread_id")
    finder_session_id = request.data.get("finder_session_id") or request.query_params.get(
        "finder_session_id"
    )

    current_user = request.user if request.user and getattr(request.user, "is_authenticated", False) else None
    is_owner = bool(current_user and pet.owner_id == current_user.id)
    sender_type = SenderType.OWNER if is_owner else SenderType.FINDER

    if thread_id:
        thread = MaskedMessageThread.objects.filter(id=thread_id, pet_id=pet_id).first()
        if not thread:
            return Response({"detail": "Thread not found"}, status=status.HTTP_404_NOT_FOUND)
        if is_owner and thread.owner_id != current_user.id:
            return Response({"detail": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
    elif finder_session_id and not is_owner:
        thread = MaskedMessageThread.objects.filter(
            pet_id=pet_id, finder_session_id=finder_session_id
        ).first()
        if not thread:
            thread = MaskedMessageThread.objects.create(
                pet_id=pet_id,
                owner_id=pet.owner_id,
                finder_session_id=finder_session_id,
            )
    else:
        return Response(
            {"detail": "thread_id or finder_session_id required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    msg = MaskedMessage.objects.create(
        thread_id=thread.id,
        sender_type=sender_type,
        message=message,
    )
    return Response(
        {
            "message": "Message sent successfully",
            "message_id": msg.id,
            "thread_id": thread.id,
            "sender_type": sender_type,
        },
        status=status.HTTP_201_CREATED,
    )
