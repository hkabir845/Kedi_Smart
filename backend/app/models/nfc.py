from sqlalchemy import Column, Integer, String, ForeignKey, Enum, JSON, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.db.session import Base
from app.db.base import TimestampMixin


class TagStatus(str, enum.Enum):
    AVAILABLE = "available"
    ASSIGNED = "assigned"
    LOST = "lost"
    RETIRED = "retired"


class LostReportStatus(str, enum.Enum):
    ACTIVE = "active"
    FOUND = "found"
    CLOSED = "closed"


class SenderType(str, enum.Enum):
    OWNER = "owner"
    FINDER = "finder"


class NFCTag(Base, TimestampMixin):
    __tablename__ = "nfc_tags"

    sku_product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    tag_uid = Column(String(100), unique=True, nullable=False, index=True)
    nfc_url = Column(String(500), nullable=True)
    qr_url = Column(String(500), nullable=True)
    status = Column(Enum(TagStatus), default=TagStatus.AVAILABLE, nullable=False)

    activations = relationship("TagActivation", back_populates="tag")


class TagActivation(Base, TimestampMixin):
    __tablename__ = "tag_activations"

    tag_id = Column(Integer, ForeignKey("nfc_tags.id", ondelete="CASCADE"), nullable=False, index=True)
    pet_id = Column(Integer, ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    activated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    deactivated_at = Column(DateTime, nullable=True)
    active = Column(Boolean, default=True, nullable=False)

    tag = relationship("NFCTag", back_populates="activations")


class LostPetReport(Base, TimestampMixin):
    __tablename__ = "lost_pet_reports"

    pet_id = Column(Integer, ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    last_seen_location_text = Column(Text, nullable=False)
    last_seen_lat = Column(String(50), nullable=True)
    last_seen_lng = Column(String(50), nullable=True)
    reward_note = Column(Text, nullable=True)
    status = Column(Enum(LostReportStatus), default=LostReportStatus.ACTIVE, nullable=False)
    activated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    closed_at = Column(DateTime, nullable=True)


class FoundReport(Base, TimestampMixin):
    __tablename__ = "found_reports"

    pet_id = Column(Integer, ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True)
    finder_name = Column(String(255), nullable=True)
    finder_contact = Column(String(255), nullable=True)
    message = Column(Text, nullable=True)
    location_text = Column(Text, nullable=True)
    lat = Column(String(50), nullable=True)
    lng = Column(String(50), nullable=True)
    photo_urls = Column(JSON, default=list, nullable=True)


class MaskedMessageThread(Base, TimestampMixin):
    __tablename__ = "masked_message_threads"

    pet_id = Column(Integer, ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    finder_session_id = Column(String(255), nullable=True, index=True)

    messages = relationship("MaskedMessage", back_populates="thread", cascade="all, delete-orphan")


class MaskedMessage(Base, TimestampMixin):
    __tablename__ = "masked_messages"

    thread_id = Column(Integer, ForeignKey("masked_message_threads.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_type = Column(Enum(SenderType), nullable=False)
    message = Column(Text, nullable=False)

    thread = relationship("MaskedMessageThread", back_populates="messages")
