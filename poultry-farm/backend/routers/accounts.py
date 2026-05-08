from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Account, AccountType
from auth import get_current_user

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


class AccountCreate(BaseModel):
    code: str
    name: str
    type: AccountType
    parent_id: Optional[int] = None


class AccountOut(BaseModel):
    id: int
    code: str
    name: str
    type: AccountType
    parent_id: Optional[int]
    is_active: bool
    model_config = {"from_attributes": True}


@router.get("", response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Account).order_by(Account.code).all()


@router.post("", response_model=AccountOut)
def create_account(data: AccountCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    if db.query(Account).filter(Account.code == data.code).first():
        raise HTTPException(400, "Account code already exists")
    account = Account(**data.model_dump())
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.put("/{account_id}", response_model=AccountOut)
def update_account(account_id: int, data: AccountCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(404, "Account not found")
    for k, v in data.model_dump().items():
        setattr(account, k, v)
    db.commit()
    db.refresh(account)
    return account


@router.delete("/{account_id}")
def delete_account(account_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(404, "Account not found")
    account.is_active = False
    db.commit()
    return {"ok": True}
