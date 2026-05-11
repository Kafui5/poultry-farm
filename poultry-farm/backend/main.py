from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from models import User, UserRole
from auth import hash_password, get_current_user
from sqlalchemy.orm import Session
import models  # ensure all models are registered

from routers import auth, accounts, journal, customers, vendors, invoices, bills, inventory, flocks, reports

app = FastAPI(title="Poultry Farm Accounting")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in [auth.router, accounts.router, journal.router, customers.router,
               vendors.router, invoices.router, bills.router, inventory.router,
               flocks.router, reports.router]:
    app.include_router(router)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    # Seed default admin if no users exist
    db = Session(engine)
    try:
        if not db.query(User).first():
            db.add(User(name="Admin", email="admin@farm.com",
                        hashed_password=hash_password("admin123"), role=UserRole.admin))
            db.commit()
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/seed")
def seed_data(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin only")
    from seed_gmgl import seed
    db = Session(engine)
    try:
        return seed(db)
    finally:
        db.close()
