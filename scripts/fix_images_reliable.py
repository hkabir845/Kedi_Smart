"""
Fix Product Images - Use Reliable Image Service
Use via.placeholder.com for guaranteed working images with pet food theme
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.db.session import SessionLocal
from app.models.ecommerce import ProductImage

db = SessionLocal()

def fix_images_reliable():
    """Update all product images with reliable placeholder URLs"""
    images = db.query(ProductImage).all()
    print(f"Updating {len(images)} product images with reliable placeholder URLs...")
    
    # Use via.placeholder.com - very reliable service
    # Using pet/food themed colors and text
    updated = 0
    for idx, img in enumerate(images):
        # Create unique image URL with pet/food theme
        # Using different colors and patterns for variety
        colors = [
            ('FF6B6B', '4ECDC4'),  # Red-Cyan
            ('95E1D3', 'F38181'),  # Teal-Pink
            ('AA96DA', 'FCBAD3'),  # Purple-Pink
            ('FDFF8F', '8FD9A8'),  # Yellow-Green
            ('D4A5A5', 'EFD5C3'),  # Beige-Brown
            ('C5F4E0', 'A8E6CF'),  # Light Green
            ('FFD3A5', 'FFAAA5'),  # Orange-Red
            ('A8E6CF', 'FFD3B6'),  # Green-Orange
        ]
        color1, color2 = colors[idx % len(colors)]
        # Use pet food related text
        texts = ['Pet Food', 'Dog Food', 'Cat Food', 'Pet Treats', 'Pet Supplies', 'Premium Food']
        text = texts[idx % len(texts)]
        
        # via.placeholder.com format: width/height/color1/color2?text=text
        new_url = f"https://via.placeholder.com/800x600/{color1}/{color2}?text={text}"
        img.url = new_url
        updated += 1
        
        if updated % 50 == 0:
            db.flush()
            print(f"  Updated {updated} images...")
    
    try:
        db.commit()
        print(f"Successfully updated {updated} product images!")
        print(f"Using via.placeholder.com - reliable service with pet food theme")
    except Exception as e:
        db.rollback()
        print(f"Error updating images: {e}")
        raise

if __name__ == "__main__":
    fix_images_reliable()
    db.close()
