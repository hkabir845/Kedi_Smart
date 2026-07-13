from sqlalchemy import Column, Integer, String, ForeignKey, Enum, JSON, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.db.session import Base
from app.db.base import TimestampMixin


class ModerationStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class NotificationType(str, enum.Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    VERIFICATION = "verification"
    ORDER = "order"
    APPOINTMENT = "appointment"
    MESSAGE = "message"


class SiteSetting(Base, TimestampMixin):
    __tablename__ = "site_settings"

    key = Column(String(255), unique=True, nullable=False, index=True)
    value_json = Column(JSON, nullable=True)


class ModerationQueue(Base, TimestampMixin):
    __tablename__ = "moderation_queue"

    entity_type = Column(String(100), nullable=False, index=True)  # listing, blog_post, comment, etc.
    entity_id = Column(Integer, nullable=False, index=True)
    status = Column(Enum(ModerationStatus), default=ModerationStatus.PENDING, nullable=False)
    admin_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)


class AuditLog(Base, TimestampMixin):
    __tablename__ = "audit_logs"

    actor_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(100), nullable=False, index=True)
    entity_id = Column(Integer, nullable=False, index=True)
    meta_json = Column(JSON, nullable=True)


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(Enum(NotificationType), nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=True)
    read = Column(Boolean, default=False, nullable=False)
