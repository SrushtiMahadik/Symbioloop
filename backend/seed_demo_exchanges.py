"""Seed demo data so the Sustainability page has something to show.

Run from the backend folder (with the virtual environment active):
    python seed_demo_exchanges.py          # add demo industries + completed exchanges
    python seed_demo_exchanges.py --reset  # remove the demo rows again

Everything created here is DEMO DATA. Remove it with --reset before real testing or a viva demo
that claims real results.
"""
from __future__ import annotations
import sys
from datetime import datetime

from main import SessionLocal, Industry, WasteListing, MaterialRequirement, Exchange, hash_password

DEMO_PASSWORD = "Demo@12345"
SUPPLIER_EMAIL = "demo.supplier@symbioloop.test"
BUYER_EMAIL = "demo.buyer@symbioloop.test"

# (months ago, material, kg) for completed exchanges
EXCHANGES = [
    (5, "NBR Scrap", 420), (5, "EPDM Scrap", 180),
    (4, "NBR Scrap", 510), (4, "SBR Scrap", 260),
    (3, "EPDM Scrap", 350), (3, "NBR Scrap", 300),
    (2, "Natural Rubber", 640), (2, "NBR Scrap", 450),
    (1, "SBR Scrap", 390), (1, "EPDM Scrap", 275),
    (0, "NBR Scrap", 560), (0, "Natural Rubber", 330),
]


def month_start(months_ago: int) -> datetime:
    now = datetime.utcnow()
    index = now.year * 12 + (now.month - 1) - months_ago
    return datetime(index // 12, index % 12 + 1, 15, 10, 0, 0)


def reset(db) -> None:
    demo = db.query(Industry).filter(Industry.email.in_([SUPPLIER_EMAIL, BUYER_EMAIL])).all()
    ids = [i.id for i in demo]
    if ids:
        db.query(Exchange).filter(Exchange.supplier_id.in_(ids) | Exchange.buyer_id.in_(ids)).delete(synchronize_session=False)
        for industry in demo:
            db.delete(industry)  # wastes and requirements are removed by the cascade
    db.commit()
    print(f"Removed {len(demo)} demo industries and their listings/exchanges.")


def seed(db) -> None:
    if db.query(Industry).filter(Industry.email == SUPPLIER_EMAIL).first():
        print("Demo data already exists. Run with --reset first to recreate it.")
        return
    supplier = Industry(name="Demo Rubber Supplier", email=SUPPLIER_EMAIL, password_hash=hash_password(DEMO_PASSWORD),
                        industry_type="Rubber Industry", location="Pune, Maharashtra", latitude=18.5204, longitude=73.8567)
    buyer = Industry(name="Demo Polymer Buyer", email=BUYER_EMAIL, password_hash=hash_password(DEMO_PASSWORD),
                     industry_type="Recycling Industry", location="Mumbai, Maharashtra", latitude=19.0760, longitude=72.8777)
    db.add_all([supplier, buyer]); db.commit(); db.refresh(supplier); db.refresh(buyer)

    for months_ago, material, kg in EXCHANGES:
        when = month_start(months_ago)
        # Listings are sized above the exchanged amount so some stock stays "Available".
        waste = WasteListing(owner_id=supplier.id, material_type=material, quantity_kg=kg * 0.4, quality_percent=80,
                             description="Demo listing", location=supplier.location, status="Available", created_at=when)
        req = MaterialRequirement(owner_id=buyer.id, material_type=material, quantity_kg=kg * 0.2, min_quality_percent=50,
                                  description="Demo requirement", location=buyer.location, status="Open", created_at=when)
        db.add_all([waste, req]); db.commit(); db.refresh(waste); db.refresh(req)
        db.add(Exchange(waste_id=waste.id, requirement_id=req.id, supplier_id=supplier.id, buyer_id=buyer.id,
                        quantity_kg=kg, status="Completed", notes="Demo exchange", created_at=when, updated_at=when))
        db.commit()
    print(f"Created 2 demo industries and {len(EXCHANGES)} completed exchanges.")
    print(f"Log in as {SUPPLIER_EMAIL} or {BUYER_EMAIL} with password {DEMO_PASSWORD}")


if __name__ == "__main__":
    session = SessionLocal()
    try:
        reset(session) if "--reset" in sys.argv else seed(session)
    finally:
        session.close()
