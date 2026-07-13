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
    return Response({"status": "healthy"})
