from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Enum, JSON, Text
from sqlalchemy.orm import relationship
import enum
from app.db.session import Base
from app.db.base import TimestampMixin


class UserRole(str, enum.Enum):
    OWNER = "OWNER"
    VET = "VET"
    VENDOR = "VENDOR"
    BREEDER = "BREEDER"
    TRADER = "TRADER"
    SHELTER = "SHELTER"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"


class VerificationType(str, enum.Enum):
    VET = "vet"
    VENDOR = "vendor"
    SELLER = "seller"
    SHELTER = "shelter"


class VerificationStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.OWNER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    profile = relationship("UserProfile", back_populates="user", uselist=False)
    # verification_requests relationship removed due to multiple foreign keys
    # Access via: db.query(VerificationRequest).filter(VerificationRequest.user_id == user.id)


class UserProfile(Base, TimestampMixin):
    __tablename__ = "user_profiles"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(60), nullable=True)
    city = Column(String(120), nullable=True)
    country = Column(String(120), nullable=True)
    address = Column(Text, nullable=True)
    emergency_contact = Column(JSON, default=dict, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    privacy_settings = Column(JSON, default=dict, nullable=True)

    user = relationship("User", back_populates="profile")


class VerificationRequest(Base, TimestampMixin):
    __tablename__ = "verification_requests"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(Enum(VerificationType), nullable=False)
    docs_urls = Column(JSON, default=list, nullable=True)
    status = Column(Enum(VerificationStatus), default=VerificationStatus.PENDING, nullable=False)
    admin_notes = Column(Text, nullable=True)
    reviewed_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(String(255), nullable=True)

    user = relationship("User", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by_user_id])
