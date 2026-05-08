from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, model_validator
from typing import Optional
from datetime import date
from decimal import Decimal
from database import get_db
from models import JournalEntry, JournalLine
from auth import get_current_user, User

router = APIRouter(prefix="/api/journal", tags=["journal"])


class LineIn(BaseModel):
    account_id: int
    debit: Decimal = Decimal("0")
    credit: Decimal = Decimal("0")
    description: Optional[str] = None


class JournalEntryCreate(BaseModel):
    date: date
    reference: Optional[str] = None
    description: Optional[str] = None
    lines: list[LineIn]

    @model_validator(mode="after")
    def balanced(self):
        total_debit = sum(l.debit for l in self.lines)
        total_credit = sum(l.credit for l in self.lines)
        if total_debit != total_credit:
            raise ValueError("Journal entry must be balanced (debits == credits)")
        return self


class LineOut(BaseModel):
    id: int
    account_id: int
    debit: Decimal
    credit: Decimal
    description: Optional[str]
    model_config = {"from_attributes": True}


class JournalEntryOut(BaseModel):
    id: int
    date: date
    reference: Optional[str]
    description: Optional[str]
    created_by: Optional[int]
    lines: list[LineOut]
    model_config = {"from_attributes": True}


@router.get("", response_model=list[JournalEntryOut])
def list_entries(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(JournalEntry).order_by(JournalEntry.date.desc()).all()


@router.get("/{entry_id}", response_model=JournalEntryOut)
def get_entry(entry_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    entry = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Entry not found")
    return entry


@router.post("", response_model=JournalEntryOut)
def create_entry(data: JournalEntryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    entry = JournalEntry(date=data.date, reference=data.reference, description=data.description, created_by=current_user.id)
    db.add(entry)
    db.flush()
    for line in data.lines:
        db.add(JournalLine(entry_id=entry.id, **line.model_dump()))
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}")
def delete_entry(entry_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    entry = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Entry not found")
    db.delete(entry)
    db.commit()
    return {"ok": True}
