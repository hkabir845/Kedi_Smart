from sqlalchemy import Column, Integer, String, ForeignKey, Enum, JSON, Text, Date, Numeric, Boolean
from sqlalchemy.orm import relationship
import enum
from app.db.session import Base
from app.db.base import TimestampMixin


class PetSpecies(str, enum.Enum):
    CAT = "cat"
    DOG = "dog"
    BIRD = "bird"
    FISH = "fish"
    REPTILE = "reptile"
    SMALL_PET = "small_pet"
    LIVESTOCK = "livestock"
    EXOTIC = "exotic"
    OTHER = "other"


class PetGender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    UNKNOWN = "unknown"


class Pet(Base, TimestampMixin):
    __tablename__ = "pets"

    owner_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    species = Column(Enum(PetSpecies), nullable=False)
    breed = Column(String(120), nullable=True)
    color_markings = Column(String(255), nullable=True)
    dob = Column(Date, nullable=True)
    age_text = Column(String(50), nullable=True)
    gender = Column(Enum(PetGender), default=PetGender.UNKNOWN, nullable=False)
    weight_kg = Column(Numeric(5, 2), nullable=True)
    spayed_neutered = Column(Boolean, default=False, nullable=True)
    temperament = Column(Text, nullable=True)
    special_needs = Column(Text, nullable=True)
    instructions_if_found = Column(Text, nullable=True)

    photos = relationship("PetPhoto", back_populates="pet", cascade="all, delete-orphan")
    privacy_setting = relationship("PetPrivacySetting", back_populates="pet", uselist=False, cascade="all, delete-orphan")
    medical_records = relationship("PetMedicalRecord", back_populates="pet", cascade="all, delete-orphan")
    vaccinations = relationship("Vaccination", back_populates="pet", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="pet", cascade="all, delete-orphan")
    health_reminders = relationship("PetHealthReminder", back_populates="pet", cascade="all, delete-orphan")


class PetPhoto(Base, TimestampMixin):
    __tablename__ = "pet_photos"

    pet_id = Column(Integer, ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True)
    url = Column(String(500), nullable=False)
    is_primary = Column(Boolean, default=False, nullable=False)

    pet = relationship("Pet", back_populates="photos")


class PetPrivacySetting(Base):
    __tablename__ = "pet_privacy_settings"

    id = Column(Integer, primary_key=True, index=True)
    pet_id = Column(Integer, ForeignKey("pets.id", ondelete="CASCADE"), unique=True, nullable=False)
    public_fields = Column(JSON, default=dict, nullable=True)
    allow_call = Column(Boolean, default=False, nullable=False)
    allow_whatsapp = Column(Boolean, default=False, nullable=False)
    allow_chat = Column(Boolean, default=True, nullable=False)
    show_city_only = Column(Boolean, default=True, nullable=False)
    show_reward_note = Column(Boolean, default=True, nullable=False)

    pet = relationship("Pet", back_populates="privacy_setting")


class PetMedicalRecord(Base, TimestampMixin):
    __tablename__ = "pet_medical_records"

    pet_id = Column(Integer, ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    type = Column(String(100), nullable=False)  # checkup, surgery, diagnosis, etc.
    title = Column(String(255), nullable=False)
    notes = Column(Text, nullable=True)
    attachments = Column(JSON, default=list, nullable=True)
    record_date = Column(Date, nullable=False)

    pet = relationship("Pet", back_populates="medical_records")


class Vaccination(Base, TimestampMixin):
    __tablename__ = "vaccinations"

    pet_id = Column(Integer, ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True)
    vaccine_name = Column(String(255), nullable=False)
    date_given = Column(Date, nullable=False)
    next_due_date = Column(Date, nullable=True)
    vet_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)

    pet = relationship("Pet", back_populates="vaccinations")


class Prescription(Base, TimestampMixin):
    __tablename__ = "prescriptions"

    pet_id = Column(Integer, ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True)
    vet_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    issued_at = Column(Date, nullable=False)
    medication_list = Column(JSON, default=list, nullable=False)
    notes = Column(Text, nullable=True)
    attachments = Column(JSON, default=list, nullable=True)

    pet = relationship("Pet", back_populates="prescriptions")


class PetHealthReminder(Base, TimestampMixin):
    __tablename__ = "pet_health_reminders"

    pet_id = Column(Integer, ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(100), nullable=False)  # vaccination, checkup, medication, etc.
    due_date = Column(Date, nullable=False)
    status = Column(String(50), default="pending", nullable=False)  # pending, completed, dismissed

    pet = relationship("Pet", back_populates="health_reminders")
