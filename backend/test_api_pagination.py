"""Test API pagination behavior"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.db.session import SessionLocal
from app.models.ecommerce import Product, ProductVariant, ProductImage, ProductReview
from app.utils.pagination import paginate
from sqlalchemy import desc
from decimal import Decimal

db = SessionLocal()

# Simulate the API endpoint logic
skip = 24
limit = 24
category_id = None

query = db.query(Product).filter(Product.status == "published").order_by(desc(Product.created_at))
if category_id:
    query = query.filter(Product.category_id == category_id)

items, total, page, size, pages = paginate(query, skip + 1, limit)

print(f"Skip: {skip}, Limit: {limit}")
print(f"Calculated page: {skip + 1} = {page}")
print(f"Items returned: {len(items)}")
print(f"Total: {total}, Pages: {pages}")

# Enhance items (simulate API enhancement)
enhanced_items = []
for item in items:
    variants = db.query(ProductVariant).filter(ProductVariant.product_id == item.id, ProductVariant.is_active == True).all()
    images = db.query(ProductImage).filter(ProductImage.product_id == item.id).order_by(ProductImage.sort_order).all()
    reviews = db.query(ProductReview).filter(ProductReview.product_id == item.id).all()
    avg_rating = sum(r.rating for r in reviews) / len(reviews) if reviews else None
    
    item_dict = {c.name: getattr(item, c.name) for c in item.__table__.columns}
    for key, value in item_dict.items():
        if isinstance(value, Decimal):
            item_dict[key] = float(value)
    
    enhanced_items.append(item_dict)

print(f"Enhanced items: {len(enhanced_items)}")

db.close()
