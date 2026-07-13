from sqlalchemy import Column, Integer, String, ForeignKey, Enum, JSON, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.db.session import Base
from app.db.base import TimestampMixin


class ContentStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


class AnimalCategory(Base, TimestampMixin):
    __tablename__ = "animal_categories"

    slug = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)

    topics = relationship("ContentTopic", back_populates="category")


class ContentTopic(Base, TimestampMixin):
    __tablename__ = "content_topics"

    category_id = Column(Integer, ForeignKey("animal_categories.id", ondelete="CASCADE"), nullable=False, index=True)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    excerpt = Column(Text, nullable=True)
    body_md = Column(Text, nullable=True)
    cover_image_url = Column(String(500), nullable=True)
    author_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    vet_verified = Column(Boolean, default=False, nullable=False)
    status = Column(Enum(ContentStatus), default=ContentStatus.DRAFT, nullable=False)
    published_at = Column(DateTime, nullable=True)

    category = relationship("AnimalCategory", back_populates="topics")
    tags = relationship("ContentTag", secondary="content_topic_tags", back_populates="topics")
    faqs = relationship("FAQItem", back_populates="topic", cascade="all, delete-orphan")


class ContentTag(Base, TimestampMixin):
    __tablename__ = "content_tags"

    slug = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)

    topics = relationship("ContentTopic", secondary="content_topic_tags", back_populates="tags")


class ContentTopicTag(Base):
    __tablename__ = "content_topic_tags"

    topic_id = Column(Integer, ForeignKey("content_topics.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("content_tags.id", ondelete="CASCADE"), primary_key=True)


class FAQItem(Base, TimestampMixin):
    __tablename__ = "faq_items"

    topic_id = Column(Integer, ForeignKey("content_topics.id", ondelete="CASCADE"), nullable=False, index=True)
    question = Column(String(500), nullable=False)
    answer = Column(Text, nullable=False)

    topic = relationship("ContentTopic", back_populates="faqs")


class SEOSetting(Base, TimestampMixin):
    __tablename__ = "seo_settings"

    entity_type = Column(String(100), nullable=False, index=True)  # topic, product, blog, etc.
    entity_id = Column(Integer, nullable=False, index=True)
    meta_title = Column(String(255), nullable=True)
    meta_description = Column(String(500), nullable=True)
    canonical_url = Column(String(500), nullable=True)
    og_image_url = Column(String(500), nullable=True)
    noindex = Column(Boolean, default=False, nullable=False)
    json_ld_override = Column(JSON, nullable=True)
