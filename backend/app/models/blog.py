from sqlalchemy import Column, Integer, String, ForeignKey, Enum, Text, DateTime
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.db.session import Base
from app.db.base import TimestampMixin


class BlogStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


class BlogPost(Base, TimestampMixin):
    __tablename__ = "blog_posts"

    author_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=False, index=True)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    excerpt = Column(Text, nullable=True)
    body_md = Column(Text, nullable=True)
    cover_image_url = Column(String(500), nullable=True)
    status = Column(Enum(BlogStatus), default=BlogStatus.DRAFT, nullable=False)
    published_at = Column(DateTime, nullable=True)

    comments = relationship("BlogComment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("BlogLike", back_populates="post", cascade="all, delete-orphan")


class BlogComment(Base, TimestampMixin):
    __tablename__ = "blog_comments"

    post_id = Column(Integer, ForeignKey("blog_posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    body = Column(Text, nullable=False)

    post = relationship("BlogPost", back_populates="comments")


class BlogLike(Base, TimestampMixin):
    __tablename__ = "blog_likes"

    post_id = Column(Integer, ForeignKey("blog_posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    post = relationship("BlogPost", back_populates="likes")
