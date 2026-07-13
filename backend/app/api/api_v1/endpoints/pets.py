from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from datetime import datetime

from app.db.session import get_db
from app.models.user import User
from app.models.pet import Pet, PetPhoto, PetPrivacySetting, PetMedicalRecord, Vaccination
from app.schemas.pet import Pet as PetSchema, PetCreate, PetUpdate, PetPrivacySettingUpdate, PetPhotoCreate, PetMedicalRecordCreate, VaccinationCreate
from app.core.dependencies import get_current_active_user
from app.core.config import settings
from app.utils.pagination import paginate

router = APIRouter()


@router.get("", response_model=dict)
def list_pets(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(Pet).filter(Pet.owner_user_id == current_user.id)
    items, total, page, size, pages = paginate(query, skip + 1, limit)
    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}


@router.post("", response_model=PetSchema, status_code=201)
def create_pet(
    data: PetCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    pet = Pet(**data.model_dump(), owner_user_id=current_user.id)
    db.add(pet)
    db.flush()
    
    # Create default privacy settings
    privacy = PetPrivacySetting(
        pet_id=pet.id,
        public_fields={"name": True, "species": True},
        allow_call=False,
        allow_whatsapp=True,
        allow_chat=True,
        show_city_only=True
    )
    db.add(privacy)
    db.commit()
    db.refresh(pet)
    return pet


@router.get("/{pet_id}", response_model=PetSchema)
def get_pet(
    pet_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.owner_user_id == current_user.id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    return pet


@router.put("/{pet_id}", response_model=PetSchema)
def update_pet(
    pet_id: int,
    data: PetUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.owner_user_id == current_user.id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pet, field, value)
    
    db.commit()
    db.refresh(pet)
    return pet


@router.delete("/{pet_id}", status_code=204)
def delete_pet(
    pet_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.owner_user_id == current_user.id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    db.delete(pet)
    db.commit()
    return None


@router.get("/{pet_id}/photos", response_model=List[dict])
def get_pet_photos(
    pet_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.owner_user_id == current_user.id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    photos = db.query(PetPhoto).filter(PetPhoto.pet_id == pet_id).all()
    return photos


@router.post("/{pet_id}/photos", status_code=201)
async def upload_pet_photo(
    pet_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.owner_user_id == current_user.id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    # Save file (relative to backend directory)
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
    upload_dir = os.path.join(backend_dir, settings.UPLOAD_DIR, "pets")
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"{pet_id}_{int(datetime.now().timestamp())}_{file.filename or 'photo'}"
    filepath = os.path.join(upload_dir, filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    url = f"/uploads/pets/{filename}"
    photo = PetPhoto(pet_id=pet_id, url=url, is_primary=False)
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


@router.get("/{pet_id}/privacy", response_model=dict)
def get_pet_privacy(
    pet_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.owner_user_id == current_user.id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    privacy = db.query(PetPrivacySetting).filter(PetPrivacySetting.pet_id == pet_id).first()
    if not privacy:
        raise HTTPException(status_code=404, detail="Privacy settings not found")
    return privacy


@router.put("/{pet_id}/privacy", response_model=dict)
def update_pet_privacy(
    pet_id: int,
    data: PetPrivacySettingUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.owner_user_id == current_user.id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    privacy = db.query(PetPrivacySetting).filter(PetPrivacySetting.pet_id == pet_id).first()
    if not privacy:
        privacy = PetPrivacySetting(pet_id=pet_id)
        db.add(privacy)
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(privacy, field, value)
    
    db.commit()
    db.refresh(privacy)
    return privacy


@router.get("/{pet_id}/medical-records", response_model=List[dict])
def get_medical_records(
    pet_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.owner_user_id == current_user.id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    records = db.query(PetMedicalRecord).filter(PetMedicalRecord.pet_id == pet_id).all()
    return records


@router.post("/{pet_id}/medical-records", status_code=201)
def create_medical_record(
    pet_id: int,
    data: PetMedicalRecordCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.owner_user_id == current_user.id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    record = PetMedicalRecord(
        pet_id=pet_id,
        created_by_user_id=current_user.id,
        **data.model_dump()
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{pet_id}/vaccinations", response_model=List[dict])
def get_vaccinations(
    pet_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.owner_user_id == current_user.id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    vaccinations = db.query(Vaccination).filter(Vaccination.pet_id == pet_id).all()
    return vaccinations


@router.post("/{pet_id}/vaccinations", status_code=201)
def create_vaccination(
    pet_id: int,
    data: VaccinationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.owner_user_id == current_user.id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    vaccination = Vaccination(pet_id=pet_id, **data.model_dump())
    db.add(vaccination)
    db.commit()
    db.refresh(vaccination)
    return vaccination


@router.post("/{pet_id}/lost/activate", status_code=201)
def activate_lost_mode(
    pet_id: int,
    location_text: str,
    reward_note: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    from app.models.nfc import LostPetReport, LostReportStatus
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.owner_user_id == current_user.id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    report = LostPetReport(
        pet_id=pet_id,
        owner_user_id=current_user.id,
        last_seen_location_text=location_text,
        reward_note=reward_note,
        status=LostReportStatus.ACTIVE
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
