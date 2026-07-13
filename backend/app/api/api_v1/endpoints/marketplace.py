from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal

from app.db.session import get_db
from app.models.marketplace import PetListing, ListingPhoto, ListingReport, ListingType, ListingStatus
from app.models.user import User, UserRole
from app.core.dependencies import get_current_active_user, require_role
from app.utils.pagination import paginate

router = APIRouter()


@router.get("/listings", response_model=dict)
def list_listings(
    type: Optional[ListingType] = None,
    species: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    query = db.query(PetListing).filter(PetListing.status == ListingStatus.PUBLISHED)
    
    if type:
        query = query.filter(PetListing.type == type)
    if species:
        query = query.filter(PetListing.species.ilike(f"%{species}%"))
    
    items, total, page, size, pages = paginate(query.order_by(PetListing.created_at.desc()), skip + 1, limit)
    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}


@router.get("/listings/{listing_id}", response_model=dict)
def get_listing(listing_id: int, db: Session = Depends(get_db)):
    listing = db.query(PetListing).filter(PetListing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    photos = db.query(ListingPhoto).filter(ListingPhoto.listing_id == listing_id).all()
    
    return {
        **{c.name: getattr(listing, c.name) for c in listing.__table__.columns},
        "photos": photos
    }


@router.post("/listings", status_code=201)
def create_listing(
    species: str,
    type: ListingType,
    location_text: str,
    breed: Optional[str] = None,
    age_text: Optional[str] = None,
    gender: Optional[str] = None,
    price: Optional[Decimal] = None,
    currency: str = "BDT",
    vaccination_status_text: Optional[str] = None,
    description_md: Optional[str] = None,
    pet_id: Optional[int] = None,
    current_user: User = Depends(require_role(UserRole.BREEDER, UserRole.TRADER, UserRole.SHELTER, UserRole.ADMIN, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    listing = PetListing(
        seller_user_id=current_user.id,
        pet_id=pet_id,
        species=species,
        breed=breed,
        age_text=age_text,
        gender=gender,
        location_text=location_text,
        price=price,
        currency=currency,
        type=type,
        vaccination_status_text=vaccination_status_text,
        description_md=description_md,
        status=ListingStatus.PENDING
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing


@router.post("/listings/{listing_id}/report", status_code=201)
def report_listing(
    listing_id: int,
    reason: str,
    current_user: Optional[User] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    listing = db.query(PetListing).filter(PetListing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    report = ListingReport(
        listing_id=listing_id,
        reporter_user_id=current_user.id if current_user else None,
        reason=reason
    )
    db.add(report)
    
    # Add to moderation queue
    from app.models.platform import ModerationQueue, ModerationStatus
    mod_queue = ModerationQueue(
        entity_type="listing",
        entity_id=listing_id,
        status=ModerationStatus.PENDING
    )
    db.add(mod_queue)
    
    db.commit()
    db.refresh(report)
    return {"message": "Listing reported successfully", "report": report}
