from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.db.session import get_db
from app.models.user import User
from app.models.nfc import NFCTag, TagActivation, LostPetReport, FoundReport, MaskedMessageThread, MaskedMessage, TagStatus, LostReportStatus, SenderType
from app.core.dependencies import get_current_active_user, get_current_user_optional
from app.core.config import settings

router = APIRouter()


@router.post("/tags/activate")
def activate_tag(
    tag_uid: str,
    pet_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    tag = db.query(NFCTag).filter(NFCTag.tag_uid == tag_uid).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    from app.models.pet import Pet
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.owner_user_id == current_user.id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    # Deactivate existing activations for this tag
    existing = db.query(TagActivation).filter(
        TagActivation.tag_id == tag.id,
        TagActivation.active == True
    ).all()
    for act in existing:
        act.active = False
        act.deactivated_at = datetime.utcnow()
    
    # Create new activation
    activation = TagActivation(
        tag_id=tag.id,
        pet_id=pet_id,
        owner_user_id=current_user.id,
        active=True
    )
    db.add(activation)
    tag.status = TagStatus.ASSIGNED
    db.commit()
    db.refresh(activation)
    
    return {"message": "Tag activated successfully", "activation": activation}


@router.post("/tags/deactivate")
def deactivate_tag(
    tag_uid: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    tag = db.query(NFCTag).filter(NFCTag.tag_uid == tag_uid).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    activation = db.query(TagActivation).filter(
        TagActivation.tag_id == tag.id,
        TagActivation.active == True,
        TagActivation.owner_user_id == current_user.id
    ).first()
    
    if not activation:
        raise HTTPException(status_code=404, detail="Active activation not found")
    
    activation.active = False
    activation.deactivated_at = datetime.utcnow()
    tag.status = TagStatus.AVAILABLE
    db.commit()
    
    return {"message": "Tag deactivated successfully"}


@router.get("/scan/{tag_uid}")
def scan_tag(tag_uid: str, db: Session = Depends(get_db)):
    tag = db.query(NFCTag).filter(NFCTag.tag_uid == tag_uid).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    activation = db.query(TagActivation).filter(
        TagActivation.tag_id == tag.id,
        TagActivation.active == True
    ).first()
    
    if not activation:
        return {"message": "Tag not activated", "tag_uid": tag_uid}
    
    from app.models.pet import Pet, PetPrivacySetting
    from app.models.user import UserProfile
    pet = db.query(Pet).filter(Pet.id == activation.pet_id).first()
    privacy = db.query(PetPrivacySetting).filter(PetPrivacySetting.pet_id == pet.id).first()
    owner_profile = db.query(UserProfile).filter(UserProfile.user_id == activation.owner_user_id).first()
    
    response = {
        "tag_uid": tag_uid,
        "pet_id": pet.id,
        "lost_mode_active": False
    }
    
    # Check if lost mode is active
    lost_report = db.query(LostPetReport).filter(
        LostPetReport.pet_id == pet.id,
        LostPetReport.status == LostReportStatus.ACTIVE
    ).first()
    
    if lost_report:
        response["lost_mode_active"] = True
        response["last_seen_location"] = lost_report.last_seen_location_text
        if privacy and privacy.show_reward_note and lost_report.reward_note:
            response["reward_note"] = lost_report.reward_note
    
    # Build response respecting privacy
    if privacy:
        public_fields = privacy.public_fields or {}
        if public_fields.get("name", True):
            response["name"] = pet.name
        if public_fields.get("species", True):
            response["species"] = pet.species.value
        if public_fields.get("breed", False):
            response["breed"] = pet.breed
        if public_fields.get("photo", False):
            # Get primary photo
            from app.models.pet import PetPhoto
            photo = db.query(PetPhoto).filter(
                PetPhoto.pet_id == pet.id,
                PetPhoto.is_primary == True
            ).first()
            if photo:
                response["photo_url"] = f"{settings.APP_URL}{photo.url}"
        
        response["contact_options"] = {
            "allow_call": privacy.allow_call,
            "allow_whatsapp": privacy.allow_whatsapp,
            "allow_chat": privacy.allow_chat
        }
        
        if owner_profile:
            if privacy.show_city_only:
                response["location"] = owner_profile.city
            else:
                response["location"] = f"{owner_profile.city}, {owner_profile.country}" if owner_profile.city else None
    else:
        # Default privacy - show name and species only
        response["name"] = pet.name
        response["species"] = pet.species.value
        response["contact_options"] = {
            "allow_call": False,
            "allow_whatsapp": False,
            "allow_chat": True
        }
    
    return response


@router.post("/pets/{pet_id}/lost/close")
def close_lost_mode(
    pet_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    from app.models.pet import Pet
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.owner_user_id == current_user.id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    report = db.query(LostPetReport).filter(
        LostPetReport.pet_id == pet_id,
        LostPetReport.status == LostReportStatus.ACTIVE
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Active lost report not found")
    
    report.status = LostReportStatus.CLOSED
    report.closed_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Lost mode closed successfully"}


@router.post("/pets/{pet_id}/found-report", status_code=201)
def create_found_report(
    pet_id: int,
    message: Optional[str] = None,
    location_text: Optional[str] = None,
    finder_name: Optional[str] = None,
    finder_contact: Optional[str] = None,
    db: Session = Depends(get_db)
):
    from app.models.pet import Pet
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    report = FoundReport(
        pet_id=pet_id,
        finder_name=finder_name,
        finder_contact=finder_contact,
        message=message,
        location_text=location_text
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    
    return {"message": "Found report submitted successfully", "report": report}


@router.get("/pets/{pet_id}/messages", response_model=List[dict])
def get_messages(
    pet_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    from app.models.pet import Pet
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    # Only owner can view messages
    if not current_user or pet.owner_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    threads = db.query(MaskedMessageThread).filter(
        MaskedMessageThread.pet_id == pet_id
    ).all()
    
    result = []
    for thread in threads:
        messages = db.query(MaskedMessage).filter(
            MaskedMessage.thread_id == thread.id
        ).order_by(MaskedMessage.created_at).all()
        
        result.append({
            "thread_id": thread.id,
            "finder_session_id": thread.finder_session_id,
            "messages": messages,
            "created_at": thread.created_at
        })
    
    return result


@router.post("/pets/{pet_id}/messages", status_code=201)
def send_message(
    pet_id: int,
    message: str,
    thread_id: Optional[int] = None,
    finder_session_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    from app.models.pet import Pet
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    # Find or create thread
    if thread_id:
        thread = db.query(MaskedMessageThread).filter(MaskedMessageThread.id == thread_id).first()
    elif finder_session_id:
        thread = db.query(MaskedMessageThread).filter(
            MaskedMessageThread.pet_id == pet_id,
            MaskedMessageThread.finder_session_id == finder_session_id
        ).first()
        if not thread:
            thread = MaskedMessageThread(
                pet_id=pet_id,
                owner_user_id=pet.owner_user_id,
                finder_session_id=finder_session_id
            )
            db.add(thread)
            db.flush()
    else:
        raise HTTPException(status_code=400, detail="thread_id or finder_session_id required")
    
    # Create message (sender_type would be determined by auth, defaulting to finder for public endpoint)
    msg = MaskedMessage(
        thread_id=thread.id,
        sender_type=SenderType.FINDER,
        message=message
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    
    return {"message": "Message sent successfully", "message_id": msg.id}
