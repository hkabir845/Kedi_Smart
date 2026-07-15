from django.db import connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def index(request):
    return Response({"message": "Kedi Smart API", "version": "1.0.0"})


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    db_ok = False
    try:
        connection.ensure_connection()
        db_ok = connection.is_usable()
    except Exception:
        db_ok = False
    payload = {"status": "healthy" if db_ok else "degraded", "database": db_ok}
    return Response(payload, status=200 if db_ok else 503)
