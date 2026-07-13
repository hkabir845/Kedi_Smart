from sqlalchemy import Column, Integer, String, ForeignKey, Enum, Text, Numeric, DateTime
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.db.session import Base
from app.db.base import TimestampMixin


class ListingType(str, enum.Enum):
    SALE = "sale"
    ADOPTION = "adoption"
    GIVEAWAY = "giveaway"
    CUBS = "cubs"


class ListingStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    PUBLISHED = "published"
    CLOSED = "closed"


class PetListing(Base, TimestampMixin):
    __tablename__ = "pet_listings"

    seller_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    pet_id = Column(Integer, ForeignKey("pets.id", ondelete="SET NULL"), nullable=True)
    species = Column(String(100), nullable=False)
    breed = Column(String(255), nullable=True)
    age_text = Column(String(50), nullable=True)
    gender = Column(String(20), nullable=True)
    location_text = Column(Text, nullable=False)
    price = Column(Numeric(10, 2), nullable=True)
    currency = Column(String(3), default="BDT", nullable=True)
    type = Column(Enum(ListingType), nullable=False)
    vaccination_status_text = Column(Text, nullable=True)
    description_md = Column(Text, nullable=True)
    status = Column(Enum(ListingStatus), default=ListingStatus.PENDING, nullable=False)

    photos = relationship("ListingPhoto", back_populates="listing", cascade="all, delete-orphan")
    reports = relationship("ListingReport", back_populates="listing", cascade="all, delete-orphan")


class ListingPhoto(Base, TimestampMixin):
    __tablename__ = "listing_photos"

    listing_id = Column(Integer, ForeignKey("pet_listings.id", ondelete="CASCADE"), nullable=False, index=True)
    url = Column(String(500), nullable=False)

    listing = relationship("PetListing", back_populates="photos")


class ListingReport(Base, TimestampMixin):
    __tablename__ = "listing_reports"

    listing_id = Column(Integer, ForeignKey("pet_listings.id", ondelete="CASCADE"), nullable=False, index=True)
    reporter_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reason = Column(Text, nullable=False)

    listing = relationship("PetListing", back_populates="reports")
