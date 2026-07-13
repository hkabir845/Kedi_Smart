from sqlalchemy import Column, Integer, String, ForeignKey, Enum, JSON, Text, Boolean, DateTime, Time
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.db.session import Base
from app.db.base import TimestampMixin


class AppointmentMode(str, enum.Enum):
    ONLINE = "online"
    CLINIC = "clinic"


class AppointmentStatus(str, enum.Enum):
    REQUESTED = "requested"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class VetProfile(Base):
    __tablename__ = "vet_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    clinic_name = Column(String(255), nullable=False)
    specialties = Column(JSON, default=list, nullable=True)
    years_experience = Column(Integer, nullable=True)
    license_no = Column(String(255), nullable=True)
    address = Column(Text, nullable=False)
    city = Column(String(120), nullable=False)
    country = Column(String(120), nullable=False)
    online_consultation_enabled = Column(Boolean, default=False, nullable=False)
    verification_status = Column(String(50), default="pending", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    availability = relationship("VetAvailability", back_populates="vet", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="vet")


class VetAvailability(Base, TimestampMixin):
    __tablename__ = "vet_availability"

    vet_user_id = Column(Integer, ForeignKey("vet_profiles.user_id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    mode = Column(Enum(AppointmentMode), nullable=False)

    vet = relationship("VetProfile", back_populates="availability")


class Appointment(Base, TimestampMixin):
    __tablename__ = "appointments"

    pet_id = Column(Integer, ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    vet_user_id = Column(Integer, ForeignKey("vet_profiles.user_id", ondelete="CASCADE"), nullable=False, index=True)
    scheduled_at = Column(DateTime, nullable=False)
    mode = Column(Enum(AppointmentMode), nullable=False)
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.REQUESTED, nullable=False)
    notes = Column(Text, nullable=True)

    vet = relationship("VetProfile", back_populates="appointments")
    consultation_notes = relationship("ConsultationNote", back_populates="appointment", cascade="all, delete-orphan")


class ConsultationNote(Base, TimestampMixin):
    __tablename__ = "consultation_notes"

    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, index=True)
    vet_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    notes = Column(Text, nullable=False)
    attachments = Column(JSON, default=list, nullable=True)

    appointment = relationship("Appointment", back_populates="consultation_notes")
