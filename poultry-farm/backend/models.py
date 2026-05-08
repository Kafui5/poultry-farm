from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, Numeric, Date, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    accountant = "accountant"
    viewer = "viewer"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.accountant)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AccountType(str, enum.Enum):
    asset = "asset"
    liability = "liability"
    equity = "equity"
    revenue = "revenue"
    expense = "expense"


class Account(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(150), nullable=False)
    type = Column(Enum(AccountType), nullable=False)
    parent_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    children = relationship("Account", backref="parent", remote_side=[id])
    journal_lines = relationship("JournalLine", back_populates="account")


class JournalEntry(Base):
    __tablename__ = "journal_entries"
    id = Column(Integer, primary_key=True)
    date = Column(Date, nullable=False)
    reference = Column(String(50))
    description = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    lines = relationship("JournalLine", back_populates="entry", cascade="all, delete-orphan")


class JournalLine(Base):
    __tablename__ = "journal_lines"
    id = Column(Integer, primary_key=True)
    entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    debit = Column(Numeric(15, 2), default=0)
    credit = Column(Numeric(15, 2), default=0)
    description = Column(Text)
    entry = relationship("JournalEntry", back_populates="lines")
    account = relationship("Account", back_populates="journal_lines")


class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False)
    email = Column(String(150))
    phone = Column(String(30))
    address = Column(Text)
    invoices = relationship("Invoice", back_populates="customer")


class Vendor(Base):
    __tablename__ = "vendors"
    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False)
    email = Column(String(150))
    phone = Column(String(30))
    address = Column(Text)
    bills = relationship("Bill", back_populates="vendor")


class InvoiceStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    paid = "paid"
    overdue = "overdue"
    cancelled = "cancelled"


class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True)
    number = Column(String(50), unique=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    date = Column(Date, nullable=False)
    due_date = Column(Date)
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.draft)
    notes = Column(Text)
    customer = relationship("Customer", back_populates="invoices")
    lines = relationship("InvoiceLine", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"
    id = Column(Integer, primary_key=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    description = Column(String(255), nullable=False)
    quantity = Column(Numeric(10, 3), nullable=False)
    unit_price = Column(Numeric(15, 2), nullable=False)
    invoice = relationship("Invoice", back_populates="lines")
    product = relationship("Product")


class BillStatus(str, enum.Enum):
    draft = "draft"
    received = "received"
    paid = "paid"
    cancelled = "cancelled"


class Bill(Base):
    __tablename__ = "bills"
    id = Column(Integer, primary_key=True)
    number = Column(String(50), unique=True, nullable=False)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    date = Column(Date, nullable=False)
    due_date = Column(Date)
    status = Column(Enum(BillStatus), default=BillStatus.draft)
    notes = Column(Text)
    vendor = relationship("Vendor", back_populates="bills")
    lines = relationship("BillLine", back_populates="bill", cascade="all, delete-orphan")


class BillLine(Base):
    __tablename__ = "bill_lines"
    id = Column(Integer, primary_key=True)
    bill_id = Column(Integer, ForeignKey("bills.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    description = Column(String(255), nullable=False)
    quantity = Column(Numeric(10, 3), nullable=False)
    unit_price = Column(Numeric(15, 2), nullable=False)
    bill = relationship("Bill", back_populates="lines")
    product = relationship("Product")


class ProductCategory(str, enum.Enum):
    live_birds = "live_birds"
    eggs = "eggs"
    feed = "feed"
    medication = "medication"
    equipment = "equipment"
    other = "other"


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    sku = Column(String(50), unique=True)
    name = Column(String(150), nullable=False)
    category = Column(Enum(ProductCategory), default=ProductCategory.other)
    unit = Column(String(30))
    cost_price = Column(Numeric(15, 2), default=0)
    sale_price = Column(Numeric(15, 2), default=0)
    quantity_on_hand = Column(Numeric(10, 3), default=0)
    reorder_level = Column(Numeric(10, 3), default=0)
    is_active = Column(Boolean, default=True)
    adjustments = relationship("StockAdjustment", back_populates="product")


class StockAdjustment(Base):
    __tablename__ = "stock_adjustments"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    date = Column(Date, nullable=False)
    quantity = Column(Numeric(10, 3), nullable=False)  # positive=in, negative=out
    reason = Column(String(255))
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    product = relationship("Product", back_populates="adjustments")


class FlockStatus(str, enum.Enum):
    active = "active"
    sold = "sold"
    closed = "closed"


class Flock(Base):
    __tablename__ = "flocks"
    id = Column(Integer, primary_key=True)
    batch_number = Column(String(50), unique=True, nullable=False)
    breed = Column(String(100))
    date_acquired = Column(Date, nullable=False)
    initial_count = Column(Integer, nullable=False)
    current_count = Column(Integer, nullable=False)
    status = Column(Enum(FlockStatus), default=FlockStatus.active)
    notes = Column(Text)
    mortality_records = relationship("MortalityRecord", back_populates="flock", cascade="all, delete-orphan")
    feed_records = relationship("FeedRecord", back_populates="flock", cascade="all, delete-orphan")
    production_records = relationship("ProductionRecord", back_populates="flock", cascade="all, delete-orphan")


class MortalityRecord(Base):
    __tablename__ = "mortality_records"
    id = Column(Integer, primary_key=True)
    flock_id = Column(Integer, ForeignKey("flocks.id"), nullable=False)
    date = Column(Date, nullable=False)
    count = Column(Integer, nullable=False)
    cause = Column(String(255))
    flock = relationship("Flock", back_populates="mortality_records")


class FeedRecord(Base):
    __tablename__ = "feed_records"
    id = Column(Integer, primary_key=True)
    flock_id = Column(Integer, ForeignKey("flocks.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    date = Column(Date, nullable=False)
    quantity_kg = Column(Numeric(10, 3), nullable=False)
    flock = relationship("Flock", back_populates="feed_records")
    product = relationship("Product")


class ProductionRecord(Base):
    __tablename__ = "production_records"
    id = Column(Integer, primary_key=True)
    flock_id = Column(Integer, ForeignKey("flocks.id"), nullable=False)
    date = Column(Date, nullable=False)
    eggs_collected = Column(Integer, default=0)
    notes = Column(Text)
    flock = relationship("Flock", back_populates="production_records")
