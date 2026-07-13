from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from app.models.pet import PetSpecies, PetGender


class PetBase(BaseModel):
    name: str
    species: PetSpecies
    breed: Optional[str] = None
    color_markings: Optional[str] = None
    dob: Optional[date] = None
    age_text: Optional[str] = None
    gender: PetGender = PetGender.UNKNOWN
    weight_kg: Optional[float] = None
    spayed_neutered: Optional[bool] = None
    temperament: Optional[str] = None
    special_needs: Optional[str] = None
    instructions_if_found: Optional[str] = None


class PetCreate(PetBase):
    pass


class PetUpdate(BaseModel):
    name: Optional[str] = None
    species: Optional[PetSpecies] = None
    breed: Optional[str] = None
    color_markings: Optional[str] = None
    dob: Optional[date] = None
    age_text: Optional[str] = None
    gender: Optional[PetGender] = None
    weight_kg: Optional[float] = None
    spayed_neutered: Optional[bool] = None
    temperament: Optional[str] = None
    special_needs: Optional[str] = None
    instructions_if_found: Optional[str] = None


class Pet(PetBase):
    id: int
    owner_user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PetPrivacySettingUpdate(BaseModel):
    public_fields: Optional[Dict[str, Any]] = None
    allow_call: Optional[bool] = None
    allow_whatsapp: Optional[bool] = None
    allow_chat: Optional[bool] = None
    show_city_only: Optional[bool] = None
    show_reward_note: Optional[bool] = None


class PetPhotoCreate(BaseModel):
    url: str
    is_primary: bool = False


class PetMedicalRecordCreate(BaseModel):
    type: str
    title: str
    notes: Optional[str] = None
    attachments: Optional[List[str]] = None
    record_date: date


class VaccinationCreate(BaseModel):
    vaccine_name: str
    date_given: date
    next_due_date: Optional[date] = None
    notes: Optional[str] = None
