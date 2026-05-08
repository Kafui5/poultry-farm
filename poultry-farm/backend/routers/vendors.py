from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Vendor
from auth import get_current_user

router = APIRouter(prefix="/api/vendors", tags=["vendors"])


class VendorIn(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class VendorOut(VendorIn):
    id: int
    model_config = {"from_attributes": True}


@router.get("", response_model=list[VendorOut])
def list_vendors(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Vendor).all()


@router.post("", response_model=VendorOut)
def create_vendor(data: VendorIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    v = Vendor(**data.model_dump())
    db.add(v)
    db.commit()
    db.refresh(v)
    return v


@router.put("/{vid}", response_model=VendorOut)
def update_vendor(vid: int, data: VendorIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    v = db.query(Vendor).filter(Vendor.id == vid).first()
    if not v:
        raise HTTPException(404, "Not found")
    for k, v2 in data.model_dump().items():
        setattr(v, k, v2)
    db.commit()
    db.refresh(v)
    return v


@router.delete("/{vid}")
def delete_vendor(vid: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    v = db.query(Vendor).filter(Vendor.id == vid).first()
    if not v:
        raise HTTPException(404, "Not found")
    db.delete(v)
    db.commit()
    return {"ok": True}
