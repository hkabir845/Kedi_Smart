from sqlalchemy import Column, Integer, DateTime
from datetime import datetime
from app.db.session import Base


class TimestampMixin:
    """Mixin to add timestamp fields to models"""
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class SoftDeleteMixin:
    """Mixin for soft delete functionality"""
    deleted_at = Column(DateTime, nullable=True)
