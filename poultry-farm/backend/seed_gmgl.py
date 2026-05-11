"""
Seed GMGL data: Chart of Accounts, Products, Vendors, Customers.
Run once after first deploy: python seed_gmgl.py
Or triggered via POST /seed endpoint (admin only).
"""
from database import engine, Base
from models import Account, AccountType, Product, ProductCategory, Vendor, Customer
from sqlalchemy.orm import Session

# ── Chart of Accounts ────────────────────────────────────────────────────────
ACCOUNTS = [
    ("1000", "Cash at Bank",           "asset"),
    ("1010", "Trading Stock",          "asset"),
    ("1020", "Egg Stock",              "asset"),
    ("1030", "Feed Ingredients",       "asset"),
    ("2000", "Accounts Payable",       "liability"),
    ("2010", "Accrued Expenses",       "liability"),
    ("3000", "Owner Equity",           "equity"),
    ("3010", "Retained Earnings",      "equity"),
    ("4000", "Trading Shop Sales",     "revenue"),
    ("4010", "Egg Shop Sales",         "revenue"),
    ("5000", "Cost of Goods Sold",     "expense"),
    ("5010", "Farm Production Costs",  "expense"),
    ("6000", "Shop Rent",              "expense"),
    ("6010", "Shop Salaries",          "expense"),
    ("6020", "Transport",              "expense"),
    ("6030", "Medication",             "expense"),
    ("6040", "Utilities",              "expense"),
    ("6050", "Other Expenses",         "expense"),
]

# ── Products ─────────────────────────────────────────────────────────────────
# (sku, name, category, unit, cost_price, sale_price)
PRODUCTS = [
    # Trading products
    ("LM",      "LM",       "other",      "crate",  352, 365),
    ("GM",      "GM",       "other",      "crate",  340, 350),
    ("CM",      "CM",       "other",      "crate",  357, 370),
    ("BS",      "BS",       "other",      "crate",  395, 410),
    ("HEND5",   "Hend 5%",  "other",      "bag",    730, 750),
    ("GMG",     "GMG",      "other",      "bag",     80,  90),
    ("CRATES",  "Crates",   "other",      "unit",    80,  90),
    # Egg products
    ("EGG-XL",  "Extra Large", "eggs",   "crate",    0,   0),
    ("EGG-L",   "Large",       "eggs",   "crate",    0,   0),
    ("EGG-M",   "Medium",      "eggs",   "crate",    0,   0),
    ("EGG-S",   "Small",       "eggs",   "crate",    0,   0),
    ("EGG-P1",  "Pullet 1",    "eggs",   "crate",    0,   0),
    ("EGG-P2",  "Pullet 2",    "eggs",   "crate",    0,   0),
    ("EGG-BRK", "Broken",      "eggs",   "crate",    0,   0),
    # Feed ingredients
    ("FEED-MAIZE", "Maize",       "feed", "bag (50kg)", 0, 0),
    ("FEED-SOYA",  "Soya",        "feed", "bag (50kg)", 0, 0),
    ("FEED-CONC",  "Concentrate", "feed", "bag (25kg)", 0, 0),
    ("FEED-GMG",   "GMG Feed",    "feed", "bag",        0, 0),
    ("FEED-SHELL", "Shell",       "feed", "bag",        0, 0),
]

# ── Vendors ───────────────────────────────────────────────────────────────────
VENDORS = [
    ("Sankofa", "", "", ""),
]

# ── Customers (shops) ─────────────────────────────────────────────────────────
CUSTOMERS = [
    ("Akatsi Feed", "", "", ""),
    ("Abor Feed",   "", "", ""),
    ("Mobile Shop", "", "", ""),
    ("Egg Shop",    "", "", ""),
]


def seed(db: Session):
    # Accounts
    existing_codes = {a.code for a in db.query(Account.code).all()}
    for code, name, atype in ACCOUNTS:
        if code not in existing_codes:
            db.add(Account(code=code, name=name, type=AccountType(atype)))

    # Products
    existing_skus = {p.sku for p in db.query(Product.sku).all()}
    cat_map = {
        "other": ProductCategory.other,
        "eggs":  ProductCategory.eggs,
        "feed":  ProductCategory.feed,
    }
    for sku, name, cat, unit, cost, sale in PRODUCTS:
        if sku not in existing_skus:
            db.add(Product(sku=sku, name=name, category=cat_map[cat],
                           unit=unit, cost_price=cost, sale_price=sale))

    # Vendors
    existing_vendors = {v.name for v in db.query(Vendor.name).all()}
    for name, email, phone, address in VENDORS:
        if name not in existing_vendors:
            db.add(Vendor(name=name, email=email, phone=phone, address=address))

    # Customers
    existing_customers = {c.name for c in db.query(Customer.name).all()}
    for name, email, phone, address in CUSTOMERS:
        if name not in existing_customers:
            db.add(Customer(name=name, email=email, phone=phone, address=address))

    db.commit()
    return {"accounts": len(ACCOUNTS), "products": len(PRODUCTS),
            "vendors": len(VENDORS), "customers": len(CUSTOMERS)}


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    db = Session(engine)
    try:
        result = seed(db)
        print("Seeded:", result)
    finally:
        db.close()
