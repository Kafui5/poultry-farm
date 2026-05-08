from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date
from decimal import Decimal
from database import get_db
from models import Bill, BillLine, BillStatus, Product
from auth import get_current_user

router = APIRouter(prefix="/api/bills", tags=["bills"])


class LineIn(BaseModel):
    product_id: Optional[int] = None
    description: str
    quantity: Decimal
    unit_price: Decimal


class BillIn(BaseModel):
    number: str
    vendor_id: int
    date: date
    due_date: Optional[date] = None
    status: BillStatus = BillStatus.draft
    notes: Optional[str] = None
    lines: list[LineIn]


class LineOut(LineIn):
    id: int
    model_config = {"from_attributes": True}


class BillOut(BaseModel):
    id: int
    number: str
    vendor_id: int
    date: date
    due_date: Optional[date]
    status: BillStatus
    notes: Optional[str]
    lines: list[LineOut]
    total: Decimal = Decimal("0")
    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_total(cls, bill):
        obj = cls.model_validate(bill)
        obj.total = sum(l.quantity * l.unit_price for l in bill.lines)
        return obj


@router.get("", response_model=list[BillOut])
def list_bills(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return [BillOut.from_orm_with_total(b) for b in db.query(Bill).order_by(Bill.date.desc()).all()]


@router.get("/{bill_id}", response_model=BillOut)
def get_bill(bill_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(404, "Not found")
    return BillOut.from_orm_with_total(bill)


@router.post("", response_model=BillOut)
def create_bill(data: BillIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    if db.query(Bill).filter(Bill.number == data.number).first():
        raise HTTPException(400, "Bill number already exists")
    bill = Bill(number=data.number, vendor_id=data.vendor_id, date=data.date,
                due_date=data.due_date, status=data.status, notes=data.notes)
    db.add(bill)
    db.flush()
    for line in data.lines:
        db.add(BillLine(bill_id=bill.id, **line.model_dump()))
        # Add stock if product linked
        if line.product_id:
            product = db.query(Product).filter(Product.id == line.product_id).first()
            if product:
                product.quantity_on_hand += line.quantity
    db.commit()
    db.refresh(bill)
    return BillOut.from_orm_with_total(bill)


@router.patch("/{bill_id}/status")
def update_status(bill_id: int, status: BillStatus, db: Session = Depends(get_db), _=Depends(get_current_user)):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(404, "Not found")
    bill.status = status
    db.commit()
    return {"status": bill.status}


@router.delete("/{bill_id}")
def delete_bill(bill_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(404, "Not found")
    db.delete(bill)
    db.commit()
    return {"ok": True}
