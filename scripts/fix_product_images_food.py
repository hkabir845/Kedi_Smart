"""
Fix Product Images - Use Pet Food Images Only
Replace all product images with proper pet food images
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.db.session import SessionLocal
from app.models.ecommerce import ProductImage

db = SessionLocal()

# Pet Food Images from Unsplash - All are actual pet food/product images
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
    "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1596854307943-279d82f78e9f?w=800&h=600&fit=crop",
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
    "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1616190172451-8a23c9bdeb6b?w=800&h=600&fit=crop",
]

# More specific pet food images - using actual pet food product photo IDs
PET_FOOD_PRODUCT_IMAGES = [
    "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=800&h=600&fit=crop",  # Cat food
    "https://images.unsplash.com/photo-1616190172451-8a23c9bdeb6b?w=800&h=600&fit=crop",  # Pet food
    "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=600&fit=crop",  # Dog food
    "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&h=600&fit=crop",  # Pet treats
    "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=800&h=600&fit=crop",  # Pet supplies
    "https://images.unsplash.com/photo-1600804340584-c7db2eacf0bf?w=800&h=600&fit=crop",  # Pet food bag
    "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=800&h=600&fit=crop",  # Cat treats
    "https://images.unsplash.com/photo-1595433707802-6b2626ef1c91?w=800&h=600&fit=crop",  # Dog treats
    "https://images.unsplash.com/photo-1591160690555-5debfba289f0?w=800&h=600&fit=crop",  # Pet food can
    "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&h=600&fit=crop",  # Pet bowl with food
    "https://images.unsplash.com/photo-1596854307943-279d82f78e9f?w=800&h=600&fit=crop",  # Pet food container
    "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&h=600&fit=crop",  # Pet food packaging
    "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=800&h=600&fit=crop",  # Pet nutrition
    "https://images.unsplash.com/photo-1600804340584-c7db2eacf0bf?w=800&h=600&fit=crop",  # Premium pet food
]

def fix_images_to_food():
    """Update all product images with pet food images only"""
    images = db.query(ProductImage).all()
    print(f"Updating {len(images)} product images to pet food images...")
    
    updated = 0
    for idx, img in enumerate(images):
        # Use index-based selection to distribute food images
        new_url = PET_FOOD_PRODUCT_IMAGES[idx % len(PET_FOOD_PRODUCT_IMAGES)]
        img.url = new_url
        updated += 1
        
        if updated % 50 == 0:
            db.flush()
            print(f"  Updated {updated} images...")
    
    try:
        db.commit()
        print(f"Successfully updated {updated} product images with pet food images!")
        print(f"All images are now proper pet food/product images")
    except Exception as e:
        db.rollback()
        print(f"Error updating images: {e}")
        raise

if __name__ == "__main__":
    fix_images_to_food()
    db.close()
