from fastapi import APIRouter

from app.api.api_v1.endpoints import auth, users, pets, nfc, content, blog, ecommerce, vet, marketplace, admin

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(pets.router, prefix="/pets", tags=["pets"])
api_router.include_router(nfc.router, prefix="/nfc", tags=["nfc"])
api_router.include_router(content.router, prefix="/content", tags=["content"])
api_router.include_router(blog.router, prefix="/blog", tags=["blog"])
api_router.include_router(ecommerce.router, prefix="/shop", tags=["ecommerce"])
api_router.include_router(vet.router, prefix="/vets", tags=["vets"])
api_router.include_router(marketplace.router, prefix="/marketplace", tags=["marketplace"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
