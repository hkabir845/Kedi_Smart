from datetime import datetime

from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.models import UserRole
from api.authentication import JWTAuthentication, get_current_user
from api.utils import slugify
from api.views import paginate_queryset, serialize_model, serialize_models
from content.models import AnimalCategory, ContentStatus, ContentTopic, FAQItem, SEOSetting


def _require_staff_roles(request):
    user = get_current_user(request)
    if user.role not in (UserRole.ADMIN, UserRole.VET, UserRole.SUPER_ADMIN):
        raise PermissionDenied("Not enough permissions")
    return user


@api_view(["GET"])
@permission_classes([AllowAny])
def list_categories(request):
    return Response(serialize_models(AnimalCategory.objects.all()))


@api_view(["GET"])
@permission_classes([AllowAny])
def get_category(request, slug):
    category = AnimalCategory.objects.filter(slug=slug).first()
    if not category:
        return Response({"detail": "Category not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response(serialize_model(category))


@api_view(["GET", "POST"])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def topics(request):
    if request.method == "POST":
        try:
            user = _require_staff_roles(request)
        except (AuthenticationFailed, PermissionDenied) as exc:
            code = status.HTTP_401_UNAUTHORIZED if isinstance(exc, AuthenticationFailed) else status.HTTP_403_FORBIDDEN
            return Response({"detail": str(exc.detail if hasattr(exc, "detail") else exc)}, status=code)

        data = request.data
        title = data.get("title") or request.query_params.get("title")
        category_id = data.get("category_id") or request.query_params.get("category_id")
        excerpt = data.get("excerpt") or request.query_params.get("excerpt")
        body_md = data.get("body_md") or request.query_params.get("body_md")
        cover_image_url = data.get("cover_image_url") or request.query_params.get("cover_image_url")
        vet_verified = data.get("vet_verified", request.query_params.get("vet_verified", False))
        if isinstance(vet_verified, str):
            vet_verified = vet_verified.lower() in ("true", "1", "yes")

        slug = slugify(title)
        if ContentTopic.objects.filter(slug=slug).exists():
            slug = f"{slug}-{datetime.now().timestamp()}"

        topic = ContentTopic.objects.create(
            category_id=category_id,
            slug=slug,
            title=title,
            excerpt=excerpt,
            body_md=body_md,
            cover_image_url=cover_image_url,
            author_id=user.id,
            vet_verified=vet_verified if user.role == UserRole.VET else False,
            status=ContentStatus.DRAFT,
        )
        return Response(serialize_model(topic), status=status.HTTP_201_CREATED)

    category_id = request.query_params.get("category_id")
    skip = int(request.query_params.get("skip", 0))
    limit = int(request.query_params.get("limit", 20))
    queryset = ContentTopic.objects.filter(status=ContentStatus.PUBLISHED)
    if category_id:
        queryset = queryset.filter(category_id=category_id)
    items, total, page, size, pages = paginate_queryset(queryset, skip + 1, limit)
    return Response(
        {"items": serialize_models(items), "total": total, "page": page, "size": size, "pages": pages}
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def get_topic(request, slug):
    topic = ContentTopic.objects.filter(slug=slug).select_related("category").first()
    if not topic:
        return Response({"detail": "Topic not found"}, status=status.HTTP_404_NOT_FOUND)
    faqs = FAQItem.objects.filter(topic_id=topic.id)
    seo = SEOSetting.objects.filter(entity_type="topic", entity_id=topic.id).first()
    return Response(
        {
            "id": topic.id,
            "slug": topic.slug,
            "title": topic.title,
            "excerpt": topic.excerpt,
            "body_md": topic.body_md,
            "cover_image_url": topic.cover_image_url,
            "vet_verified": topic.vet_verified,
            "category": serialize_model(topic.category) if topic.category else None,
            "faqs": serialize_models(faqs),
            "seo": serialize_model(seo) if seo else None,
        }
    )


@api_view(["GET", "POST"])
@authentication_classes([JWTAuthentication])
@permission_classes([AllowAny])
def topic_faqs(request, slug):
    topic = ContentTopic.objects.filter(slug=slug).first()
    if not topic:
        return Response({"detail": "Topic not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "POST":
        try:
            _require_staff_roles(request)
        except (AuthenticationFailed, PermissionDenied) as exc:
            code = status.HTTP_401_UNAUTHORIZED if isinstance(exc, AuthenticationFailed) else status.HTTP_403_FORBIDDEN
            return Response({"detail": str(exc.detail if hasattr(exc, "detail") else exc)}, status=code)

        question = request.data.get("question") or request.query_params.get("question")
        answer = request.data.get("answer") or request.query_params.get("answer")
        faq = FAQItem.objects.create(topic_id=topic.id, question=question, answer=answer)
        return Response(serialize_model(faq), status=status.HTTP_201_CREATED)

    return Response(serialize_models(FAQItem.objects.filter(topic_id=topic.id)))
