from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, time

from app.db.session import get_db
from app.models.vet import VetProfile, VetAvailability, Appointment, ConsultationNote, AppointmentMode, AppointmentStatus
from app.models.user import User, UserRole
from app.core.dependencies import get_current_active_user, require_role
from app.schemas.vet import AppointmentStatusUpdate

router = APIRouter()


@router.get("", response_model=List[dict])
def list_vets(
    city: Optional[str] = None,
    specialty: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(VetProfile).filter(VetProfile.verification_status == "approved")
    if city:
        query = query.filter(VetProfile.city.ilike(f"%{city}%"))
    
    vets = query.all()
    
    # Filter by specialty if provided
    if specialty:
        vets = [v for v in vets if v.specialties and specialty.lower() in [s.lower() for s in v.specialties]]
    
    return vets


@router.get("/{vet_id}", response_model=dict)
def get_vet(vet_id: int, db: Session = Depends(get_db)):
    vet = db.query(VetProfile).filter(VetProfile.user_id == vet_id).first()
    if not vet:
        raise HTTPException(status_code=404, detail="Vet not found")
    
    availability = db.query(VetAvailability).filter(VetAvailability.vet_user_id == vet.user_id).all()
    
    return {
        **{c.name: getattr(vet, c.name) for c in vet.__table__.columns},
        "availability": availability
    }


@router.put("/profile", response_model=dict)
def update_vet_profile(
    clinic_name: Optional[str] = None,
    specialties: Optional[List[str]] = None,
    years_experience: Optional[int] = None,
    address: Optional[str] = None,
    city: Optional[str] = None,
    online_consultation_enabled: Optional[bool] = None,
    current_user: User = Depends(require_role(UserRole.VET)),
    db: Session = Depends(get_db)
):
    vet = db.query(VetProfile).filter(VetProfile.user_id == current_user.id).first()
    if not vet:
        # Create profile if doesn't exist
        vet = VetProfile(user_id=current_user.id, clinic_name=clinic_name or "", address=address or "", city=city or "")
        db.add(vet)
    else:
        if clinic_name is not None:
            vet.clinic_name = clinic_name
        if specialties is not None:
            vet.specialties = specialties
        if years_experience is not None:
            vet.years_experience = years_experience
        if address is not None:
            vet.address = address
        if city is not None:
            vet.city = city
        if online_consultation_enabled is not None:
            vet.online_consultation_enabled = online_consultation_enabled
    
    db.commit()
    db.refresh(vet)
    return vet


@router.post("/availability", status_code=201)
def create_availability(
    day_of_week: int,
    start_time: time,
    end_time: time,
    mode: AppointmentMode,
    current_user: User = Depends(require_role(UserRole.VET)),
    db: Session = Depends(get_db)
):
    availability = VetAvailability(
        vet_user_id=current_user.id,
        day_of_week=day_of_week,
        start_time=start_time,
        end_time=end_time,
        mode=mode
    )
    db.add(availability)
    db.commit()
    db.refresh(availability)
    return availability


@router.post("/appointments", status_code=201)
def create_appointment(
    pet_id: int,
    vet_user_id: int,
    scheduled_at: datetime,
    mode: AppointmentMode,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    from app.models.pet import Pet
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.owner_user_id == current_user.id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    vet = db.query(VetProfile).filter(VetProfile.user_id == vet_user_id).first()
    if not vet:
        raise HTTPException(status_code=404, detail="Vet not found")
    
    appointment = Appointment(
        pet_id=pet_id,
        owner_user_id=current_user.id,
        vet_user_id=vet_user_id,
        scheduled_at=scheduled_at,
        mode=mode,
        status=AppointmentStatus.REQUESTED,
        notes=notes
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


@router.get("/appointments", response_model=List[dict])
def list_appointments(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role == UserRole.VET:
        appointments = db.query(Appointment).filter(Appointment.vet_user_id == current_user.id).order_by(Appointment.scheduled_at).all()
    else:
        appointments = db.query(Appointment).filter(Appointment.owner_user_id == current_user.id).order_by(Appointment.scheduled_at).all()
    
    return appointments


@router.put("/appointments/{appointment_id}/status", response_model=dict)
def update_appointment_status(
    appointment_id: int,
    data: AppointmentStatusUpdate,
    current_user: User = Depends(require_role(UserRole.VET)),
    db: Session = Depends(get_db)
):
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.vet_user_id == current_user.id
    ).first()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    appointment.status = data.status
    if data.status == AppointmentStatus.COMPLETED:
        appointment.scheduled_at = datetime.utcnow()
    
    db.commit()
    db.refresh(appointment)
    return appointment


@router.post("/appointments/{appointment_id}/notes", status_code=201)
def create_consultation_note(
    appointment_id: int,
    notes: str,
    attachments: Optional[List[str]] = None,
    current_user: User = Depends(require_role(UserRole.VET)),
    db: Session = Depends(get_db)
):
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.vet_user_id == current_user.id
    ).first()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    consultation_note = ConsultationNote(
        appointment_id=appointment_id,
        vet_user_id=current_user.id,
        notes=notes,
        attachments=attachments or []
    )
    db.add(consultation_note)
    db.commit()
    db.refresh(consultation_note)
    return consultation_note
