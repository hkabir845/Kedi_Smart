from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.db.session import get_db
from app.models.content import AnimalCategory, ContentTopic, ContentTag, FAQItem, SEOSetting, ContentStatus
from app.models.user import User, UserRole
from app.core.dependencies import get_current_user_optional, require_role
from app.utils.pagination import paginate
from app.utils.slug import slugify

router = APIRouter()


@router.get("/categories", response_model=List[dict])
def list_categories(db: Session = Depends(get_db)):
    categories = db.query(AnimalCategory).all()
    return categories


@router.get("/categories/{slug}", response_model=dict)
def get_category(slug: str, db: Session = Depends(get_db)):
    category = db.query(AnimalCategory).filter(AnimalCategory.slug == slug).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.get("/topics", response_model=dict)
def list_topics(
    category_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    query = db.query(ContentTopic).filter(ContentTopic.status == ContentStatus.PUBLISHED)
    if category_id:
        query = query.filter(ContentTopic.category_id == category_id)
    
    items, total, page, size, pages = paginate(query, skip + 1, limit)
    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}


@router.get("/topics/{slug}", response_model=dict)
def get_topic(slug: str, db: Session = Depends(get_db)):
    topic = db.query(ContentTopic).filter(ContentTopic.slug == slug).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    # Get FAQs
    faqs = db.query(FAQItem).filter(FAQItem.topic_id == topic.id).all()
    
    # Get SEO settings
    seo = db.query(SEOSetting).filter(
        SEOSetting.entity_type == "topic",
        SEOSetting.entity_id == topic.id
    ).first()
    
    result = {
        "id": topic.id,
        "slug": topic.slug,
        "title": topic.title,
        "excerpt": topic.excerpt,
        "body_md": topic.body_md,
        "cover_image_url": topic.cover_image_url,
        "vet_verified": topic.vet_verified,
        "category": topic.category,
        "faqs": faqs,
        "seo": seo
    }
    
    return result


@router.post("/topics", status_code=201)
def create_topic(
    title: str,
    category_id: int,
    excerpt: Optional[str] = None,
    body_md: Optional[str] = None,
    cover_image_url: Optional[str] = None,
    vet_verified: bool = False,
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.VET, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    slug = slugify(title)
    # Ensure uniqueness
    existing = db.query(ContentTopic).filter(ContentTopic.slug == slug).first()
    if existing:
        slug = f"{slug}-{datetime.now().timestamp()}"
    
    topic = ContentTopic(
        category_id=category_id,
        slug=slug,
        title=title,
        excerpt=excerpt,
        body_md=body_md,
        cover_image_url=cover_image_url,
        author_user_id=current_user.id,
        vet_verified=vet_verified if current_user.role == UserRole.VET else False,
        status=ContentStatus.DRAFT
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic


@router.get("/topics/{slug}/faqs", response_model=List[dict])
def get_topic_faqs(slug: str, db: Session = Depends(get_db)):
    topic = db.query(ContentTopic).filter(ContentTopic.slug == slug).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    faqs = db.query(FAQItem).filter(FAQItem.topic_id == topic.id).all()
    return faqs


@router.post("/topics/{slug}/faqs", status_code=201)
def create_faq(
    slug: str,
    question: str,
    answer: str,
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.VET, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    topic = db.query(ContentTopic).filter(ContentTopic.slug == slug).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    faq = FAQItem(
        topic_id=topic.id,
        question=question,
        answer=answer
    )
    db.add(faq)
    db.commit()
    db.refresh(faq)
    return faq
