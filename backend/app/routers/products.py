from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.product import Product
from app.schemas.ecommerce import ProductOut

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("/search", response_model=List[ProductOut])
def search_products(
    q: str = Query(..., min_length=1, max_length=200),
    db: Session = Depends(get_db),
):
    """
    Product search — a normal e-commerce feature. The logging middleware
    transiently captures `q` (never persisted) so the suspicious-input
    detector can inspect it for SQLi/XSS/path-traversal-like patterns.
    Registered before /{product_id} so "search" is never mistaken for an id.
    """
    like = f"%{q}%"
    results = (
        db.query(Product)
        .filter((Product.name.ilike(like)) | (Product.description.ilike(like)) | (Product.category.ilike(like)))
        .limit(50)
        .all()
    )
    return results


@router.get("", response_model=List[ProductOut])
def list_products(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Product)
    if category:
        query = query.filter(Product.category == category)
    return query.order_by(Product.id.asc()).all()


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product
