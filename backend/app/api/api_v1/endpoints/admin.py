from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.db.session import get_db
from app.models.user import User, UserRole, VerificationRequest, VerificationStatus
from app.models.platform import ModerationQueue, ModerationStatus, SiteSetting
from app.models.marketplace import PetListing, ListingStatus
from app.models.ecommerce import Order
from app.core.dependencies import require_role
from app.schemas.admin import VerificationApprove, VerificationReject, ModerationApprove, ModerationReject

router = APIRouter()


@router.get("/dashboard")
def admin_dashboard(
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    from app.models.ecommerce import Product
    from app.models.pet import Pet
    
    user_count = db.query(User).count()
    order_count = db.query(Order).count()
    product_count = db.query(Product).count()
    listing_count = db.query(PetListing).count()
    pending_moderation = db.query(ModerationQueue).filter(ModerationQueue.status == ModerationStatus.PENDING).count()
    pending_verifications = db.query(VerificationRequest).filter(VerificationRequest.status == VerificationStatus.PENDING).count()
    
    # Calculate revenue (from completed orders)
    from sqlalchemy import func
    revenue = db.query(func.sum(Order.total)).filter(Order.status == "delivered").scalar() or 0
    
    return {
        "users": user_count,
        "orders": order_count,
        "products": product_count,
        "listings": listing_count,
        "pending_moderation": pending_moderation,
        "pending_verifications": pending_verifications,
        "revenue": float(revenue) if revenue else 0
    }


@router.get("/users", response_model=List[dict])
def list_users(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    role: UserRole,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = role
    db.commit()
    db.refresh(user)
    return user


@router.get("/verifications", response_model=List[dict])
def list_verifications(
    status: Optional[VerificationStatus] = None,
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    query = db.query(VerificationRequest)
    if status:
        query = query.filter(VerificationRequest.status == status)
    
    requests = query.order_by(VerificationRequest.created_at.desc()).all()
    return requests


@router.put("/verifications/{request_id}/approve")
def approve_verification(
    request_id: int,
    data: VerificationApprove,
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    request = db.query(VerificationRequest).filter(VerificationRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Verification request not found")
    
    request.status = VerificationStatus.APPROVED
    request.admin_notes = data.notes
    request.reviewed_by_user_id = current_user.id
    request.reviewed_at = datetime.utcnow().isoformat()
    
    # Update user verification status if applicable
    user = db.query(User).filter(User.id == request.user_id).first()
    if user:
        user.is_verified = True
    
    db.commit()
    db.refresh(request)
    return request


@router.put("/verifications/{request_id}/reject")
def reject_verification(
    request_id: int,
    data: VerificationReject,
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    request = db.query(VerificationRequest).filter(VerificationRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Verification request not found")
    
    request.status = VerificationStatus.REJECTED
    request.admin_notes = data.notes
    request.reviewed_by_user_id = current_user.id
    request.reviewed_at = datetime.utcnow().isoformat()
    
    db.commit()
    db.refresh(request)
    return request


@router.get("/moderation", response_model=List[dict])
def list_moderation_queue(
    status: Optional[ModerationStatus] = None,
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    query = db.query(ModerationQueue)
    if status:
        query = query.filter(ModerationQueue.status == status)
    
    items = query.order_by(ModerationQueue.created_at.desc()).all()
    return items


@router.put("/moderation/{queue_id}/approve")
def approve_moderation(
    queue_id: int,
    data: ModerationApprove,
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    item = db.query(ModerationQueue).filter(ModerationQueue.id == queue_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Moderation item not found")
    
    item.status = ModerationStatus.APPROVED
    item.admin_user_id = current_user.id
    item.notes = data.notes
    
    # Update entity status based on type
    if item.entity_type == "listing":
        listing = db.query(PetListing).filter(PetListing.id == item.entity_id).first()
        if listing:
            listing.status = ListingStatus.PUBLISHED
    
    db.commit()
    db.refresh(item)
    return item


@router.put("/moderation/{queue_id}/reject")
def reject_moderation(
    queue_id: int,
    data: ModerationReject,
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    item = db.query(ModerationQueue).filter(ModerationQueue.id == queue_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Moderation item not found")
    
    item.status = ModerationStatus.REJECTED
    item.admin_user_id = current_user.id
    item.notes = data.notes
    
    # Update entity status
    if item.entity_type == "listing":
        listing = db.query(PetListing).filter(PetListing.id == item.entity_id).first()
        if listing:
            listing.status = ListingStatus.REJECTED
    
    db.commit()
    db.refresh(item)
    return item


@router.get("/orders", response_model=List[dict])
def list_all_orders(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    orders = db.query(Order).order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    return orders


@router.get("/settings", response_model=List[dict])
def list_settings(
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    settings = db.query(SiteSetting).all()
    return settings


@router.put("/settings/{key}")
def update_setting(
    key: str,
    value_json: dict,
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    setting = db.query(SiteSetting).filter(SiteSetting.key == key).first()
    if not setting:
        setting = SiteSetting(key=key, value_json=value_json)
        db.add(setting)
    else:
        setting.value_json = value_json
    
    db.commit()
    db.refresh(setting)
    return setting
