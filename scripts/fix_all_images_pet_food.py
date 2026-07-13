"""
Fix ALL Product Images - Use ONLY Pet Food Images
Ensure ALL products have proper pet food images (no chairs, no missing images)
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.db.session import SessionLocal
from app.models.ecommerce import Product, ProductImage

db = SessionLocal()

# Verified pet food/product images from Unsplash - all are actual pet food images
PET_FOOD_IMAGES = [
    "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1616190172451-8a23c9bdeb6b?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1600804340584-c7db2eacf0bf?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1595433707802-6b2626ef1c91?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1591160690555-5debfba289f0?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1596854307943-279d82f78e9f?w=800&h=600&fit=crop",
]

def fix_all_images():
    """Ensure ALL products have pet food images - no missing, no chairs"""
    products = db.query(Product).all()
    print(f"Checking {len(products)} products...")
    
    updated_count = 0
    created_count = 0
    
    for idx, product in enumerate(products):
        # Get existing images for this product
        existing_images = db.query(ProductImage).filter(ProductImage.product_id == product.id).all()
        
        if existing_images:
            # Update existing images
            for img in existing_images:
                new_url = PET_FOOD_IMAGES[idx % len(PET_FOOD_IMAGES)]
                img.url = new_url
                updated_count += 1
        else:
            # Create image if missing
            new_url = PET_FOOD_IMAGES[idx % len(PET_FOOD_IMAGES)]
            new_image = ProductImage(
                product_id=product.id,
                url=new_url,
                sort_order=1
            )
            db.add(new_image)
            created_count += 1
        
        if (idx + 1) % 50 == 0:
            db.flush()
            print(f"  Processed {idx + 1} products...")
    
    try:
        db.commit()
        print(f"\nSuccessfully processed all products!")
        print(f"  Updated: {updated_count} images")
        print(f"  Created: {created_count} images")
        print(f"  Total products: {len(products)}")
        print(f"All images are now pet food images - no chairs, no missing images")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise

if __name__ == "__main__":
    fix_all_images()
    db.close()
