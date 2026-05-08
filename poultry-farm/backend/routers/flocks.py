from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import date
from decimal import Decimal
from database import get_db
from models import Flock, FlockStatus, MortalityRecord, FeedRecord, ProductionRecord, Product
from auth import get_current_user

router = APIRouter(prefix="/api/flocks", tags=["flocks"])


class FlockIn(BaseModel):
    batch_number: str
    breed: Optional[str] = None
    date_acquired: date
    initial_count: int
    notes: Optional[str] = None


class FlockOut(BaseModel):
    id: int
    batch_number: str
    breed: Optional[str]
    date_acquired: date
    initial_count: int
    current_count: int
    status: FlockStatus
    notes: Optional[str]
    model_config = {"from_attributes": True}


class MortalityIn(BaseModel):
    date: date
    count: int
    cause: Optional[str] = None


class MortalityOut(MortalityIn):
    id: int
    flock_id: int
    model_config = {"from_attributes": True}


class FeedIn(BaseModel):
    product_id: int
    date: date
    quantity_kg: Decimal


class FeedOut(FeedIn):
    id: int
    flock_id: int
    model_config = {"from_attributes": True}


class ProductionIn(BaseModel):
    date: date
    eggs_collected: int = 0
    notes: Optional[str] = None


class ProductionOut(ProductionIn):
    id: int
    flock_id: int
    model_config = {"from_attributes": True}


# --- Flocks ---
@router.get("", response_model=list[FlockOut])
def list_flocks(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Flock).order_by(Flock.date_acquired.desc()).all()


@router.post("", response_model=FlockOut)
def create_flock(data: FlockIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    if db.query(Flock).filter(Flock.batch_number == data.batch_number).first():
        raise HTTPException(400, "Batch number already exists")
    flock = Flock(**data.model_dump(), current_count=data.initial_count)
    db.add(flock)
    db.commit()
    db.refresh(flock)
    return flock


@router.patch("/{flock_id}/status")
def update_flock_status(flock_id: int, status: FlockStatus, db: Session = Depends(get_db), _=Depends(get_current_user)):
    flock = db.query(Flock).filter(Flock.id == flock_id).first()
    if not flock:
        raise HTTPException(404, "Not found")
    flock.status = status
    db.commit()
    return {"status": flock.status}


# --- Mortality ---
@router.get("/{flock_id}/mortality", response_model=list[MortalityOut])
def list_mortality(flock_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(MortalityRecord).filter(MortalityRecord.flock_id == flock_id).order_by(MortalityRecord.date.desc()).all()


@router.post("/{flock_id}/mortality", response_model=MortalityOut)
def add_mortality(flock_id: int, data: MortalityIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    flock = db.query(Flock).filter(Flock.id == flock_id).first()
    if not flock:
        raise HTTPException(404, "Flock not found")
    flock.current_count = max(0, flock.current_count - data.count)
    record = MortalityRecord(flock_id=flock_id, **data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# --- Feed ---
@router.get("/{flock_id}/feed", response_model=list[FeedOut])
def list_feed(flock_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(FeedRecord).filter(FeedRecord.flock_id == flock_id).order_by(FeedRecord.date.desc()).all()


@router.post("/{flock_id}/feed", response_model=FeedOut)
def add_feed(flock_id: int, data: FeedIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    flock = db.query(Flock).filter(Flock.id == flock_id).first()
    if not flock:
        raise HTTPException(404, "Flock not found")
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if product:
        product.quantity_on_hand -= data.quantity_kg
    record = FeedRecord(flock_id=flock_id, **data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# --- Production ---
@router.get("/{flock_id}/production", response_model=list[ProductionOut])
def list_production(flock_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(ProductionRecord).filter(ProductionRecord.flock_id == flock_id).order_by(ProductionRecord.date.desc()).all()


@router.post("/{flock_id}/production", response_model=ProductionOut)
def add_production(flock_id: int, data: ProductionIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    if not db.query(Flock).filter(Flock.id == flock_id).first():
        raise HTTPException(404, "Flock not found")
    record = ProductionRecord(flock_id=flock_id, **data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# --- Summary ---
@router.get("/{flock_id}/summary")
def flock_summary(flock_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    flock = db.query(Flock).filter(Flock.id == flock_id).first()
    if not flock:
        raise HTTPException(404, "Not found")
    total_mortality = db.query(func.sum(MortalityRecord.count)).filter(MortalityRecord.flock_id == flock_id).scalar() or 0
    total_eggs = db.query(func.sum(ProductionRecord.eggs_collected)).filter(ProductionRecord.flock_id == flock_id).scalar() or 0
    total_feed_kg = db.query(func.sum(FeedRecord.quantity_kg)).filter(FeedRecord.flock_id == flock_id).scalar() or 0
    return {
        "batch_number": flock.batch_number,
        "initial_count": flock.initial_count,
        "current_count": flock.current_count,
        "total_mortality": total_mortality,
        "mortality_rate": round(total_mortality / flock.initial_count * 100, 2) if flock.initial_count else 0,
        "total_eggs_collected": total_eggs,
        "total_feed_kg": float(total_feed_kg),
    }
