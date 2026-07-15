from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.models import UserProfile, UserRole
from api.authentication import JWTAuthentication, get_current_user, require_roles
from api.views import parse_datetime, parse_time, serialize_model, serialize_models
from pets.models import Pet
from vets.models import (
    Appointment,
    AppointmentStatus,
    ConsultationNote,
    VetAvailability,
    VetProfile,
)


@api_view(["GET"])
@permission_classes([AllowAny])
def list_vets(request):
    city = request.query_params.get("city")
    specialty = request.query_params.get("specialty")

    queryset = VetProfile.objects.filter(verification_status="approved")
    if city:
        queryset = queryset.filter(city__icontains=city)

    vets = list(queryset)
    if specialty:
        vets = [
            v
            for v in vets
            if v.specialties and specialty.lower() in [s.lower() for s in v.specialties]
        ]

    results = []
    for vet in vets:
        row = serialize_model(vet)
        profile = UserProfile.objects.filter(user_id=vet.user_id).first()
        row["full_name"] = profile.full_name if profile else None
        row["avatar_url"] = profile.avatar_url if profile else None
        results.append(row)
    return Response(results)


@api_view(["GET"])
@permission_classes([AllowAny])
def get_vet(request, vet_id):
    vet = VetProfile.objects.filter(user_id=vet_id).first()
    if not vet:
        return Response({"detail": "Vet not found"}, status=status.HTTP_404_NOT_FOUND)

    availability = VetAvailability.objects.filter(vet_id=vet.user_id)
    profile = UserProfile.objects.filter(user_id=vet.user_id).first()
    result = serialize_model(vet)
    result["full_name"] = profile.full_name if profile else None
    result["avatar_url"] = profile.avatar_url if profile else None
    result["availability"] = serialize_models(availability)
    return Response(result)


@api_view(["PUT"])
@require_roles(UserRole.VET)
def update_vet_profile(request):
    user = request.user
    data = request.data

    vet = VetProfile.objects.filter(user_id=user.id).first()
    if not vet:
        vet = VetProfile(
            user_id=user.id,
            clinic_name=data.get("clinic_name") or "",
            address=data.get("address") or "",
            city=data.get("city") or "",
            country="",
        )
        vet.save()
    else:
        if "clinic_name" in data:
            vet.clinic_name = data["clinic_name"]
        if "specialties" in data:
            vet.specialties = data["specialties"]
        if "years_experience" in data:
            vet.years_experience = data["years_experience"]
        if "license_no" in data:
            vet.license_no = data["license_no"]
        if "address" in data:
            vet.address = data["address"]
        if "city" in data:
            vet.city = data["city"]
        if "country" in data:
            vet.country = data["country"]
        if "online_consultation_enabled" in data:
            vet.online_consultation_enabled = data["online_consultation_enabled"]
        vet.save()

    return Response(serialize_model(vet))


@api_view(["POST"])
@require_roles(UserRole.VET)
def create_availability(request):
    user = request.user
    data = request.data

    day_of_week = data.get("day_of_week") or request.query_params.get("day_of_week")
    start_time = data.get("start_time") or request.query_params.get("start_time")
    end_time = data.get("end_time") or request.query_params.get("end_time")
    mode = data.get("mode") or request.query_params.get("mode")

    availability = VetAvailability.objects.create(
        vet_id=user.id,
        day_of_week=int(day_of_week),
        start_time=parse_time(start_time),
        end_time=parse_time(end_time),
        mode=mode,
    )
    return Response(serialize_model(availability), status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@require_roles(UserRole.VET)
def delete_availability(request, availability_id):
    user = request.user
    slot = VetAvailability.objects.filter(id=availability_id, vet_id=user.id).first()
    if not slot:
        return Response({"detail": "Availability not found"}, status=status.HTTP_404_NOT_FOUND)
    slot.delete()
    return Response({"message": "Availability removed"})


@api_view(["GET", "POST"])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def appointments(request):
    if request.method == "POST":
        return create_appointment(request)
    return list_appointments(request)


@api_view(["POST"])
@authentication_classes([JWTAuthentication])
def create_appointment(request):
    user = get_current_user(request)
    data = request.data

    pet_id = data.get("pet_id") or request.query_params.get("pet_id")
    vet_user_id = data.get("vet_user_id") or request.query_params.get("vet_user_id")
    scheduled_at = data.get("scheduled_at") or request.query_params.get("scheduled_at")
    mode = data.get("mode") or request.query_params.get("mode")
    notes = data.get("notes") or request.query_params.get("notes")

    pet = Pet.objects.filter(id=pet_id, owner_id=user.id).first()
    if not pet:
        return Response({"detail": "Pet not found"}, status=status.HTTP_404_NOT_FOUND)

    vet = VetProfile.objects.filter(user_id=vet_user_id).first()
    if not vet:
        return Response({"detail": "Vet not found"}, status=status.HTTP_404_NOT_FOUND)

    appointment = Appointment.objects.create(
        pet_id=pet_id,
        owner_id=user.id,
        vet_id=vet_user_id,
        scheduled_at=parse_datetime(scheduled_at),
        mode=mode,
        status=AppointmentStatus.REQUESTED,
        notes=notes,
    )
    return Response(serialize_model(appointment), status=status.HTTP_201_CREATED)


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
def list_appointments(request):
    user = get_current_user(request)
    if user.role == UserRole.VET:
        appointments = Appointment.objects.filter(vet_id=user.id).order_by("scheduled_at")
    else:
        appointments = Appointment.objects.filter(owner_id=user.id).order_by("scheduled_at")
    results = []
    for appointment in appointments:
        row = serialize_model(appointment)
        pet = Pet.objects.filter(id=appointment.pet_id).first()
        owner_profile = UserProfile.objects.filter(user_id=appointment.owner_id).first()
        row["pet_name"] = pet.name if pet else None
        row["pet_species"] = pet.species if pet else None
        row["owner_name"] = owner_profile.full_name if owner_profile else None
        row["owner_phone"] = owner_profile.phone if owner_profile else None
        results.append(row)
    return Response(results)

@api_view(["PUT"])
@require_roles(UserRole.VET)
def update_appointment_status(request, appointment_id):
    user = request.user
    data = request.data
    new_status = data.get("status")

    appointment = Appointment.objects.filter(id=appointment_id, vet_id=user.id).first()
    if not appointment:
        return Response({"detail": "Appointment not found"}, status=status.HTTP_404_NOT_FOUND)

    appointment.status = new_status
    if new_status == AppointmentStatus.COMPLETED:
        appointment.scheduled_at = timezone.now()
    appointment.save()

    return Response(serialize_model(appointment))


@api_view(["POST"])
@require_roles(UserRole.VET)
def create_consultation_note(request, appointment_id):
    user = request.user
    data = request.data

    notes = data.get("notes") or request.query_params.get("notes")
    attachments = data.get("attachments") or request.query_params.get("attachments") or []

    appointment = Appointment.objects.filter(id=appointment_id, vet_id=user.id).first()
    if not appointment:
        return Response({"detail": "Appointment not found"}, status=status.HTTP_404_NOT_FOUND)

    consultation_note = ConsultationNote.objects.create(
        appointment_id=appointment_id,
        vet_id=user.id,
        notes=notes,
        attachments=attachments,
    )
    return Response(serialize_model(consultation_note), status=status.HTTP_201_CREATED)
