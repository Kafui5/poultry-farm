from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from decimal import Decimal
from database import get_db
from models import Account, AccountType, JournalLine, Invoice, InvoiceLine, InvoiceStatus, Bill, BillLine, Product
from auth import get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])


def account_balance(db: Session, account_id: int) -> Decimal:
    row = db.query(
        func.coalesce(func.sum(JournalLine.debit), 0) - func.coalesce(func.sum(JournalLine.credit), 0)
    ).filter(JournalLine.account_id == account_id).scalar()
    return Decimal(str(row))


@router.get("/trial-balance")
def trial_balance(db: Session = Depends(get_db), _=Depends(get_current_user)):
    accounts = db.query(Account).filter(Account.is_active == True).order_by(Account.code).all()
    rows = []
    for acc in accounts:
        debit = db.query(func.coalesce(func.sum(JournalLine.debit), 0)).filter(JournalLine.account_id == acc.id).scalar()
        credit = db.query(func.coalesce(func.sum(JournalLine.credit), 0)).filter(JournalLine.account_id == acc.id).scalar()
        if debit or credit:
            rows.append({"code": acc.code, "name": acc.name, "type": acc.type, "debit": float(debit), "credit": float(credit)})
    return {"rows": rows, "total_debit": sum(r["debit"] for r in rows), "total_credit": sum(r["credit"] for r in rows)}


@router.get("/profit-loss")
def profit_loss(
    date_from: date = Query(...),
    date_to: date = Query(...),
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    def get_net(acc_type: AccountType):
        rows = db.query(Account).filter(Account.type == acc_type, Account.is_active == True).all()
        total = Decimal("0")
        items = []
        for acc in rows:
            credit = db.query(func.coalesce(func.sum(JournalLine.credit), 0)).join(
                JournalLine.entry).filter(
                JournalLine.account_id == acc.id,
                JournalLine.entry.has(date=None) | (JournalLine.entry.has())
            ).scalar()
            # Simplified: sum all lines for the account within date range via entry join
            from models import JournalEntry
            val = db.query(
                func.coalesce(func.sum(JournalLine.credit - JournalLine.debit), 0)
                if acc_type == AccountType.revenue else
                func.coalesce(func.sum(JournalLine.debit - JournalLine.credit), 0)
            ).join(JournalEntry, JournalLine.entry_id == JournalEntry.id).filter(
                JournalLine.account_id == acc.id,
                JournalEntry.date >= date_from,
                JournalEntry.date <= date_to
            ).scalar()
            if val:
                items.append({"code": acc.code, "name": acc.name, "amount": float(val)})
                total += Decimal(str(val))
        return items, total

    revenue_items, total_revenue = get_net(AccountType.revenue)
    expense_items, total_expenses = get_net(AccountType.expense)
    return {
        "date_from": date_from,
        "date_to": date_to,
        "revenue": revenue_items,
        "total_revenue": float(total_revenue),
        "expenses": expense_items,
        "total_expenses": float(total_expenses),
        "net_profit": float(total_revenue - total_expenses),
    }


@router.get("/balance-sheet")
def balance_sheet(as_of: date = Query(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    from models import JournalEntry

    def get_totals(acc_type: AccountType):
        accounts = db.query(Account).filter(Account.type == acc_type, Account.is_active == True).all()
        items = []
        total = Decimal("0")
        for acc in accounts:
            val = db.query(
                func.coalesce(func.sum(JournalLine.debit - JournalLine.credit), 0)
                if acc_type in (AccountType.asset,) else
                func.coalesce(func.sum(JournalLine.credit - JournalLine.debit), 0)
            ).join(JournalEntry, JournalLine.entry_id == JournalEntry.id).filter(
                JournalLine.account_id == acc.id,
                JournalEntry.date <= as_of
            ).scalar()
            if val:
                items.append({"code": acc.code, "name": acc.name, "amount": float(val)})
                total += Decimal(str(val))
        return items, total

    assets, total_assets = get_totals(AccountType.asset)
    liabilities, total_liabilities = get_totals(AccountType.liability)
    equity, total_equity = get_totals(AccountType.equity)
    return {
        "as_of": as_of,
        "assets": assets, "total_assets": float(total_assets),
        "liabilities": liabilities, "total_liabilities": float(total_liabilities),
        "equity": equity, "total_equity": float(total_equity),
    }


@router.get("/inventory-valuation")
def inventory_valuation(db: Session = Depends(get_db), _=Depends(get_current_user)):
    products = db.query(Product).filter(Product.is_active == True).all()
    rows = [{"id": p.id, "name": p.name, "sku": p.sku, "quantity": float(p.quantity_on_hand),
             "cost_price": float(p.cost_price), "value": float(p.quantity_on_hand * p.cost_price)} for p in products]
    return {"rows": rows, "total_value": sum(r["value"] for r in rows)}


@router.get("/accounts-receivable")
def accounts_receivable(db: Session = Depends(get_db), _=Depends(get_current_user)):
    from models import Customer
    invoices = db.query(Invoice).filter(Invoice.status.in_([InvoiceStatus.sent, InvoiceStatus.overdue])).all()
    rows = []
    for inv in invoices:
        total = sum(l.quantity * l.unit_price for l in inv.lines)
        customer = db.query(Customer).filter(Customer.id == inv.customer_id).first()
        rows.append({"invoice_number": inv.number, "customer": customer.name if customer else "", "date": inv.date,
                     "due_date": inv.due_date, "status": inv.status, "amount": float(total)})
    return {"rows": rows, "total": sum(r["amount"] for r in rows)}


@router.get("/accounts-payable")
def accounts_payable(db: Session = Depends(get_db), _=Depends(get_current_user)):
    from models import Vendor
    bills = db.query(Bill).filter(Bill.status.in_(["received"])).all()
    rows = []
    for bill in bills:
        total = sum(l.quantity * l.unit_price for l in bill.lines)
        vendor = db.query(Vendor).filter(Vendor.id == bill.vendor_id).first()
        rows.append({"bill_number": bill.number, "vendor": vendor.name if vendor else "", "date": bill.date,
                     "due_date": bill.due_date, "status": bill.status, "amount": float(total)})
    return {"rows": rows, "total": sum(r["amount"] for r in rows)}
