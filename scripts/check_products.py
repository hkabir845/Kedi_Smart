import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.db.session import SessionLocal
from app.models.ecommerce import Product, ProductImage

db = SessionLocal()
p_count = db.query(Product).count()
img_count = db.query(ProductImage).count()
print(f'Products: {p_count}, Images: {img_count}')

if p_count > 0:
    p1 = db.query(Product).first()
    print(f'First product: {p1.title}')
    img1 = db.query(ProductImage).filter(ProductImage.product_id == p1.id).first()
    print(f'First image URL: {img1.url if img1 else None}')
    
    # Check for duplicates
    all_urls = [img.url for img in db.query(ProductImage).all()]
    unique_urls = len(set(all_urls))
    print(f'Total images: {len(all_urls)}')
    print(f'Unique images: {unique_urls}')
    print(f'Duplicates: {len(all_urls) - unique_urls}')

db.close()
