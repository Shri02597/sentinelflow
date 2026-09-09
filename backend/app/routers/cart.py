from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.product import Product
from app.models.cart_item import CartItem
from app.schemas.ecommerce import CartItemIn, CartItemOut, CartOut
from app.security.deps import get_current_user

router = APIRouter(prefix="/api/cart", tags=["cart"])


@router.get("", response_model=CartOut)
def get_cart(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.query(CartItem).filter(CartItem.user_id == current_user.id).all()
    total = sum(item.product.price * item.quantity for item in items)
    return CartOut(items=items, total=round(total, 2))


@router.post("", response_model=CartItemOut, status_code=201)
def add_to_cart(payload: CartItemIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = (
        db.query(CartItem)
        .filter(CartItem.user_id == current_user.id, CartItem.product_id == payload.product_id)
        .first()
    )
    if existing:
        existing.quantity = min(existing.quantity + payload.quantity, 99)
        db.commit()
        db.refresh(existing)
        return existing

    item = CartItem(user_id=current_user.id, product_id=payload.product_id, quantity=payload.quantity)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def remove_from_cart(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    db.delete(item)
    db.commit()
    return None
