# Poultry Farm Accounting System

A full-stack accounting application built for poultry farming operations.

## Stack
- **Backend:** Python + FastAPI + SQLAlchemy
- **Database:** PostgreSQL
- **Frontend:** React + Vite + Tailwind CSS
- **Auth:** JWT tokens

## Quick Start

```bash
cd poultry-farm
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs

## Default Login
- **Email:** admin@farm.com
- **Password:** admin123

> Change this immediately after first login by registering a new admin user.

## Features

### Accounting
- Chart of Accounts (assets, liabilities, equity, revenue, expenses)
- Double-entry Journal Entries (enforces balanced debits = credits)
- Accounts Receivable & Payable tracking

### Sales & Purchasing
- Customer & Vendor management
- Invoices with line items (auto-deducts stock)
- Bills with line items (auto-adds stock)
- Status tracking (draft → sent/received → paid)

### Inventory
- Products with SKU, cost/sale price, unit
- Categories: live birds, eggs, feed, medication, equipment
- Stock adjustments (manual corrections)
- Low stock alerts (reorder level)

### Flock Management
- Flock batches with breed, date acquired, bird count
- Mortality records (auto-decrements flock count)
- Feed consumption logs (auto-deducts feed inventory)
- Egg production records
- Per-flock summary (mortality rate, total eggs, feed used)

### Reports
- Profit & Loss (date range)
- Balance Sheet (as of date)
- Trial Balance
- Inventory Valuation
- Accounts Receivable aging
- Accounts Payable aging

## User Roles
- **Admin** — full access, can create/manage users
- **Accountant** — full access to all accounting features
- **Viewer** — read-only access

## Project Structure
```
poultry-farm/
├── docker-compose.yml
├── backend/
│   ├── main.py          # FastAPI app entry point
│   ├── models.py        # SQLAlchemy models
│   ├── auth.py          # JWT authentication
│   ├── config.py        # Settings
│   ├── database.py      # DB connection
│   └── routers/         # API route handlers
└── frontend/
    └── src/
        ├── pages/       # React page components
        ├── components/  # Shared UI components
        ├── api.js       # Axios client
        └── AuthContext.jsx
```
