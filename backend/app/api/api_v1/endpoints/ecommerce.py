from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
from datetime import datetime

from app.db.session import get_db
from app.models.ecommerce import (
    Product, ProductCategory, ProductVariant, ProductImage, ProductReview,
    Cart, CartItem, Order, OrderItem, Payment, ShippingAddress, PaymentMethod, PaymentStatus, OrderStatus
)
from app.models.user import User, UserRole
from app.schemas.ecommerce import ProductCreate, ProductUpdate, CartItemAdd, OrderCreate
from app.core.dependencies import get_current_active_user, get_current_user_optional, require_role
from app.utils.pagination import paginate
from app.utils.slug import slugify

router = APIRouter()


@router.get("/categories", response_model=List[dict])
def list_categories(db: Session = Depends(get_db)):
    categories = db.query(ProductCategory).all()
    return categories


@router.get("/products", response_model=dict)
def list_products(
    category_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    from sqlalchemy import desc
    query = db.query(Product).filter(Product.status == "published").order_by(desc(Product.created_at))
    if category_id:
        query = query.filter(Product.category_id == category_id)
    
    # Convert skip (offset) to page number: page = (skip // limit) + 1
    page_num = (skip // limit) + 1 if limit > 0 else 1
    items, total, page, size, pages = paginate(query, page_num, limit)
    
    # Enhance items with variants, images, and ratings
    enhanced_items = []
    for item in items:
        variants = db.query(ProductVariant).filter(ProductVariant.product_id == item.id, ProductVariant.is_active == True).all()
        images = db.query(ProductImage).filter(ProductImage.product_id == item.id).order_by(ProductImage.sort_order).all()
        reviews = db.query(ProductReview).filter(ProductReview.product_id == item.id).all()
        avg_rating = sum(r.rating for r in reviews) / len(reviews) if reviews else None
        
        # Convert product to dict
        item_dict = {c.name: getattr(item, c.name) for c in item.__table__.columns}
        # Convert Decimal to string for JSON serialization
        for key, value in item_dict.items():
            if isinstance(value, Decimal):
                item_dict[key] = float(value)
        
        # Convert variants to dicts
        variants_dict = []
        for v in variants:
            v_dict = {c.name: getattr(v, c.name) for c in v.__table__.columns}
            for key, value in v_dict.items():
                if isinstance(value, Decimal):
                    v_dict[key] = float(value)
            variants_dict.append(v_dict)
        
        # Convert images to dicts
        images_dict = []
        for img in images:
            img_dict = {c.name: getattr(img, c.name) for c in img.__table__.columns}
            images_dict.append(img_dict)
        
        # Get category info
        category = None
        if item.category_id:
            from app.models.ecommerce import ProductCategory
            cat = db.query(ProductCategory).filter(ProductCategory.id == item.category_id).first()
            if cat:
                category = {"id": cat.id, "name": cat.name, "slug": cat.slug}
        
        item_dict["variants"] = variants_dict
        item_dict["images"] = images_dict
        item_dict["category"] = category
        item_dict["average_rating"] = round(avg_rating, 2) if avg_rating else None
        enhanced_items.append(item_dict)
    
    return {"items": enhanced_items, "total": total, "page": page, "size": size, "pages": pages}


@router.get("/products/{slug}", response_model=dict)
def get_product(slug: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.slug == slug).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    variants = db.query(ProductVariant).filter(ProductVariant.product_id == product.id, ProductVariant.is_active == True).all()
    images = db.query(ProductImage).filter(ProductImage.product_id == product.id).order_by(ProductImage.sort_order).all()
    reviews = db.query(ProductReview).filter(ProductReview.product_id == product.id).order_by(ProductReview.created_at.desc()).limit(10).all()
    
    avg_rating = db.query(ProductReview.rating).filter(ProductReview.product_id == product.id).all()
    avg_rating = sum(r[0] for r in avg_rating) / len(avg_rating) if avg_rating else 0
    
    return {
        **{c.name: getattr(product, c.name) for c in product.__table__.columns},
        "variants": variants,
        "images": images,
        "reviews": reviews,
        "average_rating": round(avg_rating, 2) if avg_rating else None
    }


@router.post("/products", status_code=201)
def create_product(
    data: ProductCreate,
    current_user: User = Depends(require_role(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    slug = slugify(data.title)
    existing = db.query(Product).filter(Product.slug == slug).first()
    if existing:
        slug = f"{slug}-{datetime.now().timestamp()}"
    
    product = Product(
        vendor_user_id=current_user.id if current_user.role == UserRole.VENDOR else None,
        category_id=data.category_id,
        slug=slug,
        title=data.title,
        description_md=data.description_md,
        brand=data.brand,
        status=data.status,
        is_digital=data.is_digital,
        is_nfc_tag_product=data.is_nfc_tag_product
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/cart", response_model=dict)
def get_cart(
    current_user: Optional[User] = Depends(get_current_user_optional),
    session_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    if current_user:
        cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    elif session_id:
        cart = db.query(Cart).filter(Cart.session_id == session_id).first()
    else:
        raise HTTPException(status_code=400, detail="User or session_id required")
    
    if not cart:
        return {"items": [], "subtotal": 0}
    
    items = db.query(CartItem).filter(CartItem.cart_id == cart.id).all()
    subtotal = sum(item.qty * item.variant.price for item in items if item.variant)
    
    return {"items": items, "subtotal": float(subtotal)}


@router.post("/cart/items", status_code=201)
def add_to_cart(
    data: CartItemAdd,
    current_user: Optional[User] = Depends(get_current_user_optional),
    session_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    variant = db.query(ProductVariant).filter(ProductVariant.id == data.variant_id).first()
    if not variant or not variant.is_active:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    if current_user:
        cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
        if not cart:
            cart = Cart(user_id=current_user.id)
            db.add(cart)
            db.flush()
    elif session_id:
        cart = db.query(Cart).filter(Cart.session_id == session_id).first()
        if not cart:
            cart = Cart(session_id=session_id)
            db.add(cart)
            db.flush()
    else:
        raise HTTPException(status_code=400, detail="User or session_id required")
    
    existing_item = db.query(CartItem).filter(
        CartItem.cart_id == cart.id,
        CartItem.variant_id == data.variant_id
    ).first()
    
    if existing_item:
        existing_item.qty += data.qty
    else:
        cart_item = CartItem(cart_id=cart.id, variant_id=data.variant_id, qty=data.qty)
        db.add(cart_item)
    
    db.commit()
    return {"message": "Item added to cart"}


@router.post("/checkout", status_code=201)
def checkout(
    data: OrderCreate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    session_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    if current_user:
        cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    elif session_id:
        cart = db.query(Cart).filter(Cart.session_id == session_id).first()
    else:
        raise HTTPException(status_code=400, detail="User or session_id required")
    
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    items = db.query(CartItem).filter(CartItem.cart_id == cart.id).all()
    if not items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Calculate totals
    subtotal = sum(item.qty * item.variant.price for item in items if item.variant)
    shipping_fee = Decimal("100.00")  # Default shipping
    tax = subtotal * Decimal("0.05")  # 5% tax
    total = subtotal + shipping_fee + tax
    
    # Create order
    order = Order(
        user_id=current_user.id if current_user else None,
        guest_email=None,  # Could be added from data
        status=OrderStatus.PENDING,
        subtotal=subtotal,
        discount=Decimal("0.00"),
        shipping_fee=shipping_fee,
        tax=tax,
        total=total,
        currency="BDT"
    )
    db.add(order)
    db.flush()
    
    # Create order items
    for item in items:
        if item.variant:
            order_item = OrderItem(
                order_id=order.id,
                variant_id=item.variant_id,
                title_snapshot=item.variant.product.title,
                price_snapshot=item.variant.price,
                qty=item.qty
            )
            db.add(order_item)
    
    # Create shipping address
    shipping = ShippingAddress(
        order_id=order.id,
        **data.shipping_address.model_dump()
    )
    db.add(shipping)
    
    # Create payment
    payment = Payment(
        order_id=order.id,
        method=PaymentMethod(data.payment_method),
        status=PaymentStatus.PENDING
    )
    db.add(payment)
    
    # Clear cart
    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
    db.delete(cart)
    
    db.commit()
    db.refresh(order)
    return order


@router.get("/orders", response_model=List[dict])
def list_orders(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    orders = db.query(Order).filter(Order.user_id == current_user.id).order_by(Order.created_at.desc()).all()
    return orders
