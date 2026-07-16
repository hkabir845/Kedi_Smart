from datetime import datetime

from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from api.authentication import JWTAuthentication, OptionalJWTAuthentication, get_current_user
from api.utils import slugify
from api.views import paginate_queryset, serialize_model, serialize_models
from blog.models import BlogComment, BlogLike, BlogPost, BlogStatus


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def posts(request):
    if request.method == "POST":
        auth = JWTAuthentication()
        result = auth.authenticate(request)
        if result is None:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        request.user, _ = result
        return _create_post(request)
    return _list_posts(request)


@api_view(["GET"])
@permission_classes([AllowAny])
def post_detail(request, slug):
    return _get_post(request, slug)


@api_view(["POST", "DELETE"])
@authentication_classes([JWTAuthentication])
def post_like(request, slug):
    if request.method == "DELETE":
        return _unlike_post(request, slug)
    return _like_post(request, slug)


def _list_posts(request):
    skip = int(request.query_params.get("skip", 0) or 0)
    limit = int(request.query_params.get("limit", 20) or 20)
    page_param = request.query_params.get("page")
    q = (request.query_params.get("q") or "").strip()
    queryset = BlogPost.objects.filter(status=BlogStatus.PUBLISHED).order_by("-published_at")
    if q:
        queryset = queryset.filter(
            Q(title__icontains=q) | Q(excerpt__icontains=q) | Q(body_md__icontains=q)
        )
    if page_param is not None:
        page_num = max(1, int(page_param or 1))
    else:
        page_num = skip + 1
    items, total, page, size, pages = paginate_queryset(queryset, page_num, limit)
    return Response(
        {
            "items": serialize_models(items),
            "total": total,
            "page": page,
            "size": size,
            "pages": pages,
        }
    )


def _get_post(request, slug):
    post = BlogPost.objects.filter(slug=slug).first()
    if not post:
        return Response({"detail": "Post not found"}, status=status.HTTP_404_NOT_FOUND)

    comments = BlogComment.objects.filter(post_id=post.id).order_by("created_at")
    like_count = BlogLike.objects.filter(post_id=post.id).count()

    result = serialize_model(post)
    result["comments"] = serialize_models(comments)
    result["like_count"] = like_count
    return Response(result)


def _create_post(request):
    user = get_current_user(request)
    data = request.data
    title = data.get("title") or request.query_params.get("title")
    excerpt = data.get("excerpt") or request.query_params.get("excerpt")
    body_md = data.get("body_md") or request.query_params.get("body_md")
    cover_image_url = data.get("cover_image_url") or request.query_params.get("cover_image_url")
    post_status = data.get("status") or request.query_params.get("status") or BlogStatus.DRAFT

    slug = slugify(title)
    if BlogPost.objects.filter(slug=slug).exists():
        slug = f"{slug}-{datetime.now().timestamp()}"

    post = BlogPost.objects.create(
        author_id=user.id,
        slug=slug,
        title=title,
        excerpt=excerpt,
        body_md=body_md,
        cover_image_url=cover_image_url,
        status=post_status,
        published_at=timezone.now() if post_status == BlogStatus.PUBLISHED else None,
    )
    return Response(serialize_model(post), status=status.HTTP_201_CREATED)


@api_view(["POST"])
@authentication_classes([OptionalJWTAuthentication])
def create_comment(request, slug):
    post = BlogPost.objects.filter(slug=slug).first()
    if not post:
        return Response({"detail": "Post not found"}, status=status.HTTP_404_NOT_FOUND)

    body = request.data.get("body") or request.query_params.get("body")
    current_user = request.user if request.user and getattr(request.user, "is_authenticated", False) else None

    comment = BlogComment.objects.create(
        post_id=post.id,
        user_id=current_user.id if current_user else None,
        body=body,
    )
    return Response(serialize_model(comment), status=status.HTTP_201_CREATED)


def _like_post(request, slug):
    user = get_current_user(request)
    post = BlogPost.objects.filter(slug=slug).first()
    if not post:
        return Response({"detail": "Post not found"}, status=status.HTTP_404_NOT_FOUND)

    if BlogLike.objects.filter(post_id=post.id, user_id=user.id).exists():
        return Response({"detail": "Post already liked"}, status=status.HTTP_400_BAD_REQUEST)

    BlogLike.objects.create(post_id=post.id, user_id=user.id)
    return Response({"message": "Post liked successfully"}, status=status.HTTP_201_CREATED)


def _unlike_post(request, slug):
    user = get_current_user(request)
    post = BlogPost.objects.filter(slug=slug).first()
    if not post:
        return Response({"detail": "Post not found"}, status=status.HTTP_404_NOT_FOUND)

    BlogLike.objects.filter(post_id=post.id, user_id=user.id).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
