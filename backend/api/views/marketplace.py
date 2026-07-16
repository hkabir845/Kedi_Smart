from decimal import Decimal

from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.models import UserRole
from api.authentication import JWTAuthentication, OptionalJWTAuthentication, get_current_user
from api.views import paginate_queryset, serialize_model, serialize_models
from marketplace.models import ListingPhoto, ListingReport, ListingStatus, PetListing
from siteplatform.models import ModerationQueue, ModerationStatus


@api_view(["GET", "POST"])
@authentication_classes([OptionalJWTAuthentication])
@permission_classes([AllowAny])
def listings(request):
    if request.method == "POST":
        try:
            user = get_current_user(request)
        except AuthenticationFailed:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        if user.role not in (
            UserRole.BREEDER,
            UserRole.TRADER,
            UserRole.SHELTER,
            UserRole.ADMIN,
            UserRole.SUPER_ADMIN,
        ):
            return Response({"detail": "Not enough permissions"}, status=status.HTTP_403_FORBIDDEN)
        request.user = user
        return _create_listing(request)
    return _list_listings(request)


def _list_listings(request):
    listing_type = request.query_params.get("type")
    species = request.query_params.get("species")
    skip = int(request.query_params.get("skip", 0))
    limit = int(request.query_params.get("limit", 20))
    mine = request.query_params.get("mine")

    queryset = PetListing.objects.filter(status=ListingStatus.PUBLISHED)
    if mine == "true":
        try:
            current_user = get_current_user(request)
        except AuthenticationFailed:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        queryset = PetListing.objects.filter(seller_id=current_user.id).order_by("-created_at")
    else:
        queryset = queryset.order_by("-created_at")

    if listing_type:
        queryset = queryset.filter(type=listing_type)
    if species:
        queryset = queryset.filter(species__icontains=species)

    page_num = (skip // limit) + 1 if limit > 0 else 1
    items, total, page, size, pages = paginate_queryset(queryset, page_num, limit)
    serialized = []
    for listing in items:
        row = serialize_model(listing)
        photo = ListingPhoto.objects.filter(listing_id=listing.id).order_by("id").first()
        row["cover_photo_url"] = photo.url if photo else None
        serialized.append(row)
    return Response(
        {
            "items": serialized,
            "total": total,
            "page": page,
            "size": size,
            "pages": pages,
        }
    )


@api_view(["GET", "PUT", "DELETE"])
@authentication_classes([OptionalJWTAuthentication])
@permission_classes([AllowAny])
def get_listing(request, listing_id):
    listing = PetListing.objects.filter(id=listing_id).first()
    if not listing:
        return Response({"detail": "Listing not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        user = getattr(request, "user", None)
        can_preview = bool(
            user
            and getattr(user, "is_authenticated", False)
            and (
                user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)
                or listing.seller_id == user.id
            )
        )
        if listing.status != ListingStatus.PUBLISHED and not can_preview:
            return Response({"detail": "Listing not found"}, status=status.HTTP_404_NOT_FOUND)
        photos = ListingPhoto.objects.filter(listing_id=listing_id)
        result = serialize_model(listing)
        result["photos"] = serialize_models(photos)
        return Response(result)

    try:
        user = get_current_user(request)
    except AuthenticationFailed:
        return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

    if listing.seller_id != user.id and user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        return Response({"detail": "Not enough permissions"}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "DELETE":
        listing.status = ListingStatus.CLOSED
        listing.save(update_fields=["status", "updated_at"])
        return Response({"message": "Listing closed", "listing": serialize_model(listing)})

    data = request.data
    updatable = (
        "species",
        "breed",
        "age_text",
        "gender",
        "location_text",
        "currency",
        "type",
        "vaccination_status_text",
        "description_md",
    )
    for field in updatable:
        if field in data:
            setattr(listing, field, data[field])
    if "price" in data:
        listing.price = Decimal(str(data["price"])) if data["price"] not in (None, "") else None
    if "status" in data:
        allowed = {ListingStatus.PENDING, ListingStatus.CLOSED, ListingStatus.PUBLISHED}
        # Sellers can close or re-submit for review; cannot self-publish if currently pending/rejected
        next_status = data["status"]
        if next_status == ListingStatus.CLOSED:
            listing.status = ListingStatus.CLOSED
        elif next_status == ListingStatus.PENDING:
            listing.status = ListingStatus.PENDING
        elif next_status in allowed and user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
            listing.status = next_status
    # Edits by sellers return listing to moderation unless already closed
    if user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN) and listing.status == ListingStatus.PUBLISHED:
        listing.status = ListingStatus.PENDING

    listing.save()
    return Response(serialize_model(listing))


def _create_listing(request):
    user = request.user
    data = request.data

    price = data.get("price") or request.query_params.get("price")
    if price is not None:
        price = Decimal(str(price))

    listing = PetListing.objects.create(
        seller_id=user.id,
        pet_id=data.get("pet_id") or request.query_params.get("pet_id"),
        species=data.get("species") or request.query_params.get("species"),
        breed=data.get("breed") or request.query_params.get("breed"),
        age_text=data.get("age_text") or request.query_params.get("age_text"),
        gender=data.get("gender") or request.query_params.get("gender"),
        location_text=data.get("location_text") or request.query_params.get("location_text"),
        price=price,
        currency=data.get("currency") or request.query_params.get("currency") or "BDT",
        type=data.get("type") or request.query_params.get("type"),
        vaccination_status_text=data.get("vaccination_status_text") or request.query_params.get("vaccination_status_text"),
        description_md=data.get("description_md") or request.query_params.get("description_md"),
        status=ListingStatus.PENDING,
    )
    ModerationQueue.objects.create(
        entity_type="listing",
        entity_id=listing.id,
        status=ModerationStatus.PENDING,
    )
    return Response(serialize_model(listing), status=status.HTTP_201_CREATED)


@api_view(["POST"])
@authentication_classes([OptionalJWTAuthentication])
def report_listing(request, listing_id):
    listing = PetListing.objects.filter(id=listing_id).first()
    if not listing:
        return Response({"detail": "Listing not found"}, status=status.HTTP_404_NOT_FOUND)

    reason = request.data.get("reason") or request.query_params.get("reason")
    current_user = request.user if request.user and getattr(request.user, "is_authenticated", False) else None

    report = ListingReport.objects.create(
        listing_id=listing_id,
        reporter_id=current_user.id if current_user else None,
        reason=reason,
    )
    ModerationQueue.objects.create(
        entity_type="listing",
        entity_id=listing_id,
        status=ModerationStatus.PENDING,
    )

    return Response(
        {"message": "Listing reported successfully", "report": serialize_model(report)},
        status=status.HTTP_201_CREATED,
    )
