from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.db.session import get_db
from app.models.blog import BlogPost, BlogComment, BlogLike, BlogStatus
from app.models.user import User
from app.core.dependencies import get_current_active_user, get_current_user_optional
from app.utils.pagination import paginate
from app.utils.slug import slugify

router = APIRouter()


@router.get("/posts", response_model=dict)
def list_posts(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    query = db.query(BlogPost).filter(BlogPost.status == BlogStatus.PUBLISHED).order_by(BlogPost.published_at.desc())
    items, total, page, size, pages = paginate(query, skip + 1, limit)
    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}


@router.get("/posts/{slug}", response_model=dict)
def get_post(slug: str, db: Session = Depends(get_db)):
    post = db.query(BlogPost).filter(BlogPost.slug == slug).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Get comments
    comments = db.query(BlogComment).filter(BlogComment.post_id == post.id).order_by(BlogComment.created_at).all()
    
    # Get like count
    like_count = db.query(BlogLike).filter(BlogLike.post_id == post.id).count()
    
    return {
        **{c.name: getattr(post, c.name) for c in post.__table__.columns},
        "comments": comments,
        "like_count": like_count
    }


@router.post("/posts", status_code=201)
def create_post(
    title: str,
    excerpt: Optional[str] = None,
    body_md: Optional[str] = None,
    cover_image_url: Optional[str] = None,
    status: BlogStatus = BlogStatus.DRAFT,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    slug = slugify(title)
    existing = db.query(BlogPost).filter(BlogPost.slug == slug).first()
    if existing:
        slug = f"{slug}-{datetime.now().timestamp()}"
    
    post = BlogPost(
        author_user_id=current_user.id,
        slug=slug,
        title=title,
        excerpt=excerpt,
        body_md=body_md,
        cover_image_url=cover_image_url,
        status=status,
        published_at=datetime.utcnow() if status == BlogStatus.PUBLISHED else None
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.post("/posts/{slug}/comments", status_code=201)
def create_comment(
    slug: str,
    body: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    post = db.query(BlogPost).filter(BlogPost.slug == slug).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comment = BlogComment(
        post_id=post.id,
        user_id=current_user.id if current_user else None,
        body=body
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.post("/posts/{slug}/like", status_code=201)
def like_post(
    slug: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    post = db.query(BlogPost).filter(BlogPost.slug == slug).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    existing = db.query(BlogLike).filter(
        BlogLike.post_id == post.id,
        BlogLike.user_id == current_user.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Post already liked")
    
    like = BlogLike(post_id=post.id, user_id=current_user.id)
    db.add(like)
    db.commit()
    db.refresh(like)
    return {"message": "Post liked successfully"}


@router.delete("/posts/{slug}/like", status_code=204)
def unlike_post(
    slug: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    post = db.query(BlogPost).filter(BlogPost.slug == slug).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    like = db.query(BlogLike).filter(
        BlogLike.post_id == post.id,
        BlogLike.user_id == current_user.id
    ).first()
    
    if like:
        db.delete(like)
        db.commit()
    
    return None
