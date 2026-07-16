import os
from datetime import datetime

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes
from rest_framework.response import Response

from api.authentication import JWTAuthentication, get_current_user
from api.views import paginate_queryset, parse_date, serialize_model, serialize_models
from nfc.models import LostPetReport, LostReportStatus
from pets.models import (
    Pet,
    PetMedicalRecord,
    PetPhoto,
    PetPrivacySetting,
    Vaccination,
)


def _get_owned_pet(user, pet_id):
    return Pet.objects.filter(id=pet_id, owner_id=user.id).first()


@api_view(["GET", "POST"])
@authentication_classes([JWTAuthentication])
def pets_list_create(request):
    user = get_current_user(request)

    if request.method == "GET":
        skip = int(request.query_params.get("skip", 0))
        limit = int(request.query_params.get("limit", 20))
        queryset = Pet.objects.filter(owner_id=user.id)
        items, total, page, size, pages = paginate_queryset(queryset, skip + 1, limit)
        return Response(
            {
                "items": serialize_models(items),
                "total": total,
                "page": page,
                "size": size,
                "pages": pages,
            }
        )

    data = request.data
    pet = Pet.objects.create(
        owner_id=user.id,
        name=data["name"],
        species=data["species"],
        breed=data.get("breed"),
        color_markings=data.get("color_markings"),
        dob=parse_date(data.get("dob")),
        age_text=data.get("age_text"),
        gender=data.get("gender", "unknown"),
        weight_kg=data.get("weight_kg"),
        spayed_neutered=data.get("spayed_neutered"),
        temperament=data.get("temperament"),
        special_needs=data.get("special_needs"),
        instructions_if_found=data.get("instructions_if_found"),
    )
    PetPrivacySetting.objects.create(
        pet=pet,
        public_fields={"name": True, "species": True},
        allow_call=False,
        allow_whatsapp=True,
        allow_chat=True,
        show_city_only=True,
    )
    return Response(serialize_model(pet), status=status.HTTP_201_CREATED)


@api_view(["GET", "PUT", "DELETE"])
@authentication_classes([JWTAuthentication])
def pet_detail(request, pet_id):
    user = get_current_user(request)
    pet = _get_owned_pet(user, pet_id)
    if not pet:
        return Response({"detail": "Pet not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(serialize_model(pet))

    if request.method == "DELETE":
        pet.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    update_fields = [
        "name",
        "species",
        "breed",
        "color_markings",
        "dob",
        "age_text",
        "gender",
        "weight_kg",
        "spayed_neutered",
        "temperament",
        "special_needs",
        "instructions_if_found",
    ]
    for field in update_fields:
        if field in request.data:
            value = request.data[field]
            if field == "dob":
                value = parse_date(value)
            setattr(pet, field, value)
    pet.save()
    return Response(serialize_model(pet))


@api_view(["GET", "POST"])
@authentication_classes([JWTAuthentication])
def pet_photos(request, pet_id):
    user = get_current_user(request)
    pet = _get_owned_pet(user, pet_id)
    if not pet:
        return Response({"detail": "Pet not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        photos = PetPhoto.objects.filter(pet_id=pet_id)
        return Response(serialize_models(photos))

    file = request.FILES.get("file")
    if not file:
        return Response({"detail": "file required"}, status=status.HTTP_400_BAD_REQUEST)

    upload_dir = os.path.join(settings.MEDIA_ROOT, "pets")
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"{pet_id}_{int(datetime.now().timestamp())}_{file.name or 'photo'}"
    filepath = os.path.join(upload_dir, filename)

    with open(filepath, "wb") as buffer:
        for chunk in file.chunks():
            buffer.write(chunk)

    url = f"/uploads/pets/{filename}"
    photo = PetPhoto.objects.create(pet_id=pet_id, url=url, is_primary=False)
    return Response(serialize_model(photo), status=status.HTTP_201_CREATED)


@api_view(["GET", "PUT"])
@authentication_classes([JWTAuthentication])
def pet_privacy(request, pet_id):
    user = get_current_user(request)
    pet = _get_owned_pet(user, pet_id)
    if not pet:
        return Response({"detail": "Pet not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        privacy = PetPrivacySetting.objects.filter(pet_id=pet_id).first()
        if not privacy:
            return Response({"detail": "Privacy settings not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(serialize_model(privacy))

    privacy = PetPrivacySetting.objects.filter(pet_id=pet_id).first()
    if not privacy:
        privacy = PetPrivacySetting(pet_id=pet_id)
        privacy.save()

    update_fields = [
        "public_fields",
        "allow_call",
        "allow_whatsapp",
        "allow_chat",
        "show_city_only",
        "show_reward_note",
    ]
    for field in update_fields:
        if field in request.data:
            setattr(privacy, field, request.data[field])
    privacy.save()
    return Response(serialize_model(privacy))


@api_view(["GET", "POST"])
@authentication_classes([JWTAuthentication])
def pet_medical_records(request, pet_id):
    user = get_current_user(request)
    pet = _get_owned_pet(user, pet_id)
    if not pet:
        return Response({"detail": "Pet not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        records = PetMedicalRecord.objects.filter(pet_id=pet_id)
        return Response(serialize_models(records))

    data = request.data
    record = PetMedicalRecord.objects.create(
        pet_id=pet_id,
        created_by_id=user.id,
        type=data["type"],
        title=data["title"],
        notes=data.get("notes"),
        attachments=data.get("attachments"),
        record_date=parse_date(data["record_date"]),
    )
    return Response(serialize_model(record), status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
@authentication_classes([JWTAuthentication])
def pet_vaccinations(request, pet_id):
    user = get_current_user(request)
    pet = _get_owned_pet(user, pet_id)
    if not pet:
        return Response({"detail": "Pet not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        vaccinations = Vaccination.objects.filter(pet_id=pet_id)
        return Response(serialize_models(vaccinations))

    data = request.data
    vaccination = Vaccination.objects.create(
        pet_id=pet_id,
        vaccine_name=data["vaccine_name"],
        date_given=parse_date(data["date_given"]),
        next_due_date=parse_date(data.get("next_due_date")),
        notes=data.get("notes"),
    )
    return Response(serialize_model(vaccination), status=status.HTTP_201_CREATED)


@api_view(["POST"])
@authentication_classes([JWTAuthentication])
def activate_lost_mode(request, pet_id):
    user = get_current_user(request)
    pet = _get_owned_pet(user, pet_id)
    if not pet:
        return Response({"detail": "Pet not found"}, status=status.HTTP_404_NOT_FOUND)

    existing = LostPetReport.objects.filter(pet_id=pet_id, status=LostReportStatus.ACTIVE).first()
    if existing:
        return Response(
            {"detail": "Lost mode is already active for this pet", "report": serialize_model(existing)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    location_text = (request.data.get("location_text") or request.query_params.get("location_text") or "").strip()
    if not location_text:
        return Response({"detail": "location_text is required"}, status=status.HTTP_400_BAD_REQUEST)
    reward_note = request.data.get("reward_note") or request.query_params.get("reward_note")

    report = LostPetReport.objects.create(
        pet_id=pet_id,
        owner_id=user.id,
        last_seen_location_text=location_text,
        reward_note=reward_note,
        status=LostReportStatus.ACTIVE,
    )
    return Response(serialize_model(report), status=status.HTTP_201_CREATED)
