from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date
from decimal import Decimal
from database import get_db
from models import Invoice, InvoiceLine, InvoiceStatus, Product
from auth import get_current_user

router = APIRouter(prefix="/api/invoices", tags=["invoices"])


class LineIn(BaseModel):
    product_id: Optional[int] = None
    description: str
    quantity: Decimal
    unit_price: Decimal


class InvoiceIn(BaseModel):
    number: str
    customer_id: int
    date: date
    due_date: Optional[date] = None
    status: InvoiceStatus = InvoiceStatus.draft
    notes: Optional[str] = None
    lines: list[LineIn]


class LineOut(LineIn):
    id: int
    model_config = {"from_attributes": True}


class InvoiceOut(BaseModel):
    id: int
    number: str
    customer_id: int
    date: date
    due_date: Optional[date]
    status: InvoiceStatus
    notes: Optional[str]
    lines: list[LineOut]
    total: Decimal = Decimal("0")
    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_total(cls, inv):
        obj = cls.model_validate(inv)
        obj.total = sum(l.quantity * l.unit_price for l in inv.lines)
        return obj


@router.get("", response_model=list[InvoiceOut])
def list_invoices(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return [InvoiceOut.from_orm_with_total(i) for i in db.query(Invoice).order_by(Invoice.date.desc()).all()]


@router.get("/{inv_id}", response_model=InvoiceOut)
def get_invoice(inv_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
    if not inv:
        raise HTTPException(404, "Not found")
    return InvoiceOut.from_orm_with_total(inv)


@router.post("", response_model=InvoiceOut)
def create_invoice(data: InvoiceIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    if db.query(Invoice).filter(Invoice.number == data.number).first():
        raise HTTPException(400, "Invoice number already exists")
    inv = Invoice(number=data.number, customer_id=data.customer_id, date=data.date,
                  due_date=data.due_date, status=data.status, notes=data.notes)
    db.add(inv)
    db.flush()
    for line in data.lines:
        db.add(InvoiceLine(invoice_id=inv.id, **line.model_dump()))
        # Deduct stock if product linked
        if line.product_id:
            product = db.query(Product).filter(Product.id == line.product_id).first()
            if product:
                product.quantity_on_hand -= line.quantity
    db.commit()
    db.refresh(inv)
    return InvoiceOut.from_orm_with_total(inv)


@router.patch("/{inv_id}/status")
def update_status(inv_id: int, status: InvoiceStatus, db: Session = Depends(get_db), _=Depends(get_current_user)):
    inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
    if not inv:
        raise HTTPException(404, "Not found")
    inv.status = status
    db.commit()
    return {"status": inv.status}


@router.delete("/{inv_id}")
def delete_invoice(inv_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
    if not inv:
        raise HTTPException(404, "Not found")
    db.delete(inv)
    db.commit()
    return {"ok": True}
