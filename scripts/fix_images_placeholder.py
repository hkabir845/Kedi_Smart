"""
Fix Product Images - Use Reliable Placeholder Service
Use Picsum Photos (Lorem Picsum) for guaranteed working images
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.db.session import SessionLocal
from app.models.ecommerce import ProductImage

db = SessionLocal()

def fix_images_with_placeholders():
    """Update all product images with reliable placeholder service URLs"""
    images = db.query(ProductImage).all()
    print(f"Updating {len(images)} product images with reliable placeholder URLs...")
    
    updated = 0
    for idx, img in enumerate(images):
        # Use Picsum Photos - reliable placeholder service
        # Each image gets a unique ID based on index
        image_id = (idx % 1000) + 1
        # Use specific dimensions and add random seed for variety
        new_url = f"https://picsum.photos/800/600?random={image_id}"
        img.url = new_url
        updated += 1
        
        if updated % 50 == 0:
            db.flush()
            print(f"  Updated {updated} images...")
    
    try:
        db.commit()
        print(f"Successfully updated {updated} product images!")
        print(f"Using Picsum Photos service - reliable placeholder images")
    except Exception as e:
        db.rollback()
        print(f"Error updating images: {e}")
        raise

if __name__ == "__main__":
    fix_images_with_placeholders()
    db.close()
