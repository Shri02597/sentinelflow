from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Index
from sqlalchemy.orm import relationship

from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False, index=True)
    price = Column(Float, nullable=False)
    image = Column(String(500), nullable=True)  # URL or path to product image
    stock = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    cart_items = relationship("CartItem", back_populates="product", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_product_category_name", "category", "name"),
    )
