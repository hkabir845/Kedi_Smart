from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.user import User, UserProfile, UserRole
from app.schemas.user import User as UserSchema, UserProfile as UserProfileSchema, UserProfileUpdate
from app.core.dependencies import get_current_active_user, require_role

router = APIRouter()


@router.get("/me", response_model=UserSchema)
def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.get("/me/profile", response_model=UserProfileSchema)
def get_my_profile(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.put("/me/profile", response_model=UserProfileSchema)
def update_my_profile(
    data: UserProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id, full_name=current_user.email)
        db.add(profile)
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    
    db.commit()
    db.refresh(profile)
    return profile
