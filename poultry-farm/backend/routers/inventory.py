from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date
from decimal import Decimal
from database import get_db
from models import Product, ProductCategory, StockAdjustment
from auth import get_current_user, User

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


class ProductIn(BaseModel):
    sku: Optional[str] = None
    name: str
    category: ProductCategory = ProductCategory.other
    unit: Optional[str] = None
    cost_price: Decimal = Decimal("0")
    sale_price: Decimal = Decimal("0")
    reorder_level: Decimal = Decimal("0")


class ProductOut(ProductIn):
    id: int
    quantity_on_hand: Decimal
    is_active: bool
    model_config = {"from_attributes": True}


class AdjustmentIn(BaseModel):
    product_id: int
    date: date
    quantity: Decimal
    reason: Optional[str] = None


class AdjustmentOut(AdjustmentIn):
    id: int
    created_by: Optional[int]
    model_config = {"from_attributes": True}


@router.get("/products", response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Product).filter(Product.is_active == True).all()


@router.post("/products", response_model=ProductOut)
def create_product(data: ProductIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = Product(**data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.put("/products/{pid}", response_model=ProductOut)
def update_product(pid: int, data: ProductIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(Product).filter(Product.id == pid).first()
    if not p:
        raise HTTPException(404, "Not found")
    for k, v in data.model_dump().items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/products/{pid}")
def delete_product(pid: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(Product).filter(Product.id == pid).first()
    if not p:
        raise HTTPException(404, "Not found")
    p.is_active = False
    db.commit()
    return {"ok": True}


@router.get("/adjustments", response_model=list[AdjustmentOut])
def list_adjustments(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(StockAdjustment).order_by(StockAdjustment.date.desc()).all()


@router.post("/adjustments", response_model=AdjustmentOut)
def create_adjustment(data: AdjustmentIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = db.query(Product).filter(Product.id == data.product_id).first()
    if not p:
        raise HTTPException(404, "Product not found")
    p.quantity_on_hand += data.quantity
    adj = StockAdjustment(**data.model_dump(), created_by=current_user.id)
    db.add(adj)
    db.commit()
    db.refresh(adj)
    return adj


@router.get("/low-stock", response_model=list[ProductOut])
def low_stock(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Product).filter(
        Product.is_active == True,
        Product.quantity_on_hand <= Product.reorder_level
    ).all()
