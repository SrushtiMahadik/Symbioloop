"""SymbioLoop API. Production-oriented starter backend; no frontend files are modified."""
from __future__ import annotations
import os, math, hashlib, secrets, json, csv
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Query  # type: ignore[import-not-found]
from fastapi.middleware.cors import CORSMiddleware  # type: ignore[import-not-found]
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials  # type: ignore[import-not-found]
from pydantic import BaseModel, EmailStr, Field, ConfigDict  # type: ignore[import-not-found]
from sqlalchemy import create_engine, String, Float, Integer, DateTime, ForeignKey, Text, Boolean, func  # type: ignore[import-not-found]
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker, Session  # type: ignore[import-not-found]
from jose import jwt, JWTError  # type: ignore
try:
    from dotenv import load_dotenv  # type: ignore[import-not-found]
except ImportError:
    def load_dotenv(*_args, **_kwargs):
        return False
from sustainability import load_factor_config, build_summary
from forecasting import build_forecast, month_index

APP_DIR = Path(__file__).resolve().parent
load_dotenv(APP_DIR / ".env")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{APP_DIR / 'symbioloop.db'}")
JWT_SECRET = os.getenv("JWT_SECRET", "CHANGE_THIS_SECRET_BEFORE_DEPLOYMENT")
JWT_ALGORITHM = "HS256"
TOKEN_MINUTES = int(os.getenv("TOKEN_MINUTES", "720"))
CORS_ORIGINS = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if x.strip()]

engine_kwargs = {"pool_pre_ping": True}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

class Base(DeclarativeBase): pass

class Industry(Base):
    __tablename__ = "industries"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(300), nullable=False)
    industry_type: Mapped[str] = mapped_column(String(120), default="Rubber Industry")
    location: Mapped[str] = mapped_column(String(200), default="")
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    phone: Mapped[str] = mapped_column(String(40), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    wastes: Mapped[list["WasteListing"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    requirements: Mapped[list["MaterialRequirement"]] = relationship(back_populates="owner", cascade="all, delete-orphan")

class WasteListing(Base):
    __tablename__ = "waste_listings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("industries.id"), index=True)
    material_type: Mapped[str] = mapped_column(String(100), index=True)
    quantity_kg: Mapped[float] = mapped_column(Float)
    quality_percent: Mapped[float] = mapped_column(Float, default=75)
    description: Mapped[str] = mapped_column(Text, default="")
    location: Mapped[str] = mapped_column(String(200), default="")
    status: Mapped[str] = mapped_column(String(40), default="Available", index=True)
    image_path: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    owner: Mapped[Industry] = relationship(back_populates="wastes")

class MaterialRequirement(Base):
    __tablename__ = "material_requirements"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("industries.id"), index=True)
    material_type: Mapped[str] = mapped_column(String(100), index=True)
    quantity_kg: Mapped[float] = mapped_column(Float)
    min_quality_percent: Mapped[float] = mapped_column(Float, default=50)
    description: Mapped[str] = mapped_column(Text, default="")
    location: Mapped[str] = mapped_column(String(200), default="")
    status: Mapped[str] = mapped_column(String(40), default="Open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    owner: Mapped[Industry] = relationship(back_populates="requirements")

class Exchange(Base):
    __tablename__ = "exchanges"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    waste_id: Mapped[int] = mapped_column(ForeignKey("waste_listings.id"), index=True)
    requirement_id: Mapped[int] = mapped_column(ForeignKey("material_requirements.id"), index=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("industries.id"), index=True)
    buyer_id: Mapped[int] = mapped_column(ForeignKey("industries.id"), index=True)
    quantity_kg: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(40), default="Requested", index=True)
    estimated_transport_cost: Mapped[float] = mapped_column(Float, default=0)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SymbioLoop API", version="1.0.0", description="Backend APIs for rubber waste exchange, matching and sustainability.")
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
security = HTTPBearer(auto_error=False)

# --- DTOs ---
class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    industry_type: str = "Rubber Industry"
    location: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: str = ""
class LoginIn(BaseModel): email: EmailStr; password: str
class IndustryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:int; name:str; email:str; industry_type:str; location:str; latitude:Optional[float]; longitude:Optional[float]; phone:str; created_at:datetime
class TokenOut(BaseModel): access_token:str; token_type:str="bearer"; user:IndustryOut
class WasteIn(BaseModel):
    material_type:str=Field(min_length=2,max_length=100); quantity_kg:float=Field(gt=0); quality_percent:float=Field(default=75,ge=0,le=100); description:str=""; location:str=""; status:str="Available"
class WasteOut(BaseModel):
    model_config=ConfigDict(from_attributes=True)
    id:int; owner_id:int; material_type:str; quantity_kg:float; quality_percent:float; description:str; location:str; status:str; image_path:str; created_at:datetime
class RequirementIn(BaseModel):
    material_type:str=Field(min_length=2,max_length=100); quantity_kg:float=Field(gt=0); min_quality_percent:float=Field(default=50,ge=0,le=100); description:str=""; location:str=""; status:str="Open"
class RequirementOut(BaseModel):
    model_config=ConfigDict(from_attributes=True)
    id:int; owner_id:int; material_type:str; quantity_kg:float; min_quality_percent:float; description:str; location:str; status:str; created_at:datetime
class ExchangeIn(BaseModel): waste_id:int; requirement_id:int; quantity_kg:float=Field(gt=0); notes:str=""
class ExchangeStatusIn(BaseModel): status:str
class AssistantIn(BaseModel): message:str=Field(min_length=1,max_length=2000)

# --- utilities ---
def get_db():
    db=SessionLocal()
    try: yield db
    finally: db.close()

def hash_password(password:str, salt:Optional[bytes]=None)->str:
    salt=salt or secrets.token_bytes(16)
    digest=hashlib.pbkdf2_hmac("sha256",password.encode(),salt,310000)
    return f"pbkdf2_sha256${salt.hex()}${digest.hex()}"

def verify_password(password:str, encoded:str)->bool:
    try:
        _,salt_hex,digest_hex=encoded.split("$")
        return secrets.compare_digest(hashlib.pbkdf2_hmac("sha256",password.encode(),bytes.fromhex(salt_hex),310000).hex(),digest_hex)
    except Exception: return False

def create_token(user:Industry)->str:
    exp=datetime.now(timezone.utc)+timedelta(minutes=TOKEN_MINUTES)
    return jwt.encode({"sub":str(user.id),"exp":exp},JWT_SECRET,algorithm=JWT_ALGORITHM)

def current_user(credentials:HTTPAuthorizationCredentials=Depends(security), db:Session=Depends(get_db))->Industry:
    if not credentials: raise HTTPException(status_code=401,detail="Bearer token required")
    try:
        payload=jwt.decode(credentials.credentials,JWT_SECRET,algorithms=[JWT_ALGORITHM]); uid=int(payload.get("sub",0))
    except (JWTError,ValueError): raise HTTPException(status_code=401,detail="Invalid or expired token")
    user=db.get(Industry,uid)
    if not user or not user.is_active: raise HTTPException(status_code=401,detail="User account not found or inactive")
    return user

def material_match(a:str,b:str)->bool:
    norm=lambda s:" ".join(s.lower().replace("-"," ").replace("_"," ").split())
    x,y=norm(a),norm(b)
    return x==y or x in y or y in x

def distance_km(a:Industry,b:Industry)->Optional[float]:
    if None in (a.latitude,a.longitude,b.latitude,b.longitude): return None
    r=6371
    p1,p2=math.radians(a.latitude),math.radians(b.latitude)
    dp=math.radians(b.latitude-a.latitude); dl=math.radians(b.longitude-a.longitude)
    h=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*r*math.asin(min(1,math.sqrt(h)))

def public_industry(u:Industry):
    return {"id":u.id,"name":u.name,"industry_type":u.industry_type,"location":u.location,"latitude":u.latitude,"longitude":u.longitude}

@app.get("/")
def home(): return {"message":"SymbioLoop API is running","docs":"/docs","health":"/api/health"}
@app.get("/api/health")
def health(): return {"status":"healthy","database":"connected","project":"SymbioLoop"}

@app.post("/api/auth/register",response_model=TokenOut,status_code=201)
def register(data:RegisterIn,db:Session=Depends(get_db)):
    email=data.email.lower()
    if db.query(Industry).filter(func.lower(Industry.email)==email).first(): raise HTTPException(409,"An account with this email already exists")
    user=Industry(name=data.name.strip(),email=email,password_hash=hash_password(data.password),industry_type=data.industry_type,location=data.location,latitude=data.latitude,longitude=data.longitude,phone=data.phone)
    db.add(user); db.commit(); db.refresh(user)
    return {"access_token":create_token(user),"user":user}
@app.post("/api/auth/login",response_model=TokenOut)
def login(data:LoginIn,db:Session=Depends(get_db)):
    user=db.query(Industry).filter(func.lower(Industry.email)==data.email.lower()).first()
    if not user or not verify_password(data.password,user.password_hash): raise HTTPException(401,"Incorrect email or password")
    if not user.is_active: raise HTTPException(403,"Account is inactive")
    return {"access_token":create_token(user),"user":user}
@app.get("/api/auth/me",response_model=IndustryOut)
def me(user:Industry=Depends(current_user)): return user
@app.patch("/api/profile",response_model=IndustryOut)
def update_profile(data:dict,db:Session=Depends(get_db),user:Industry=Depends(current_user)):
    allowed={"name","industry_type","location","latitude","longitude","phone"}
    for k,v in data.items():
        if k in allowed: setattr(user,k,v)
    db.commit(); db.refresh(user); return user

@app.get("/api/industries")
def industries(db:Session=Depends(get_db),user:Industry=Depends(current_user),q:Optional[str]=None):
    query=db.query(Industry).filter(Industry.is_active==True,Industry.id!=user.id)
    if q: query=query.filter(Industry.name.ilike(f"%{q}%"))
    return [public_industry(x) for x in query.order_by(Industry.name).all()]

@app.post("/api/waste",response_model=WasteOut,status_code=201)
def create_waste(data:WasteIn,db:Session=Depends(get_db),user:Industry=Depends(current_user)):
    item=WasteListing(owner_id=user.id,**data.model_dump()); db.add(item); db.commit(); db.refresh(item); return item
@app.get("/api/waste",response_model=List[WasteOut])
def list_waste(db:Session=Depends(get_db),user:Industry=Depends(current_user),material_type:Optional[str]=None,status_filter:Optional[str]=Query(None,alias="status")):
    q=db.query(WasteListing)
    if material_type: q=q.filter(WasteListing.material_type.ilike(f"%{material_type}%"))
    if status_filter: q=q.filter(WasteListing.status==status_filter)
    return q.order_by(WasteListing.created_at.desc()).all()
@app.get("/api/waste/{item_id}",response_model=WasteOut)
def get_waste(item_id:int,db:Session=Depends(get_db),user:Industry=Depends(current_user)):
    item=db.get(WasteListing,item_id)
    if not item: raise HTTPException(404,"Waste listing not found")
    return item
@app.patch("/api/waste/{item_id}",response_model=WasteOut)
def update_waste(item_id:int,data:dict,db:Session=Depends(get_db),user:Industry=Depends(current_user)):
    item=db.get(WasteListing,item_id)
    if not item: raise HTTPException(404,"Waste listing not found")
    if item.owner_id!=user.id: raise HTTPException(403,"You can only update your own listing")
    for k,v in data.items():
        if k in {"material_type","quantity_kg","quality_percent","description","location","status"}: setattr(item,k,v)
    db.commit(); db.refresh(item); return item
@app.delete("/api/waste/{item_id}",status_code=204)
def delete_waste(item_id:int,db:Session=Depends(get_db),user:Industry=Depends(current_user)):
    item=db.get(WasteListing,item_id)
    if not item: raise HTTPException(404,"Waste listing not found")
    if item.owner_id!=user.id: raise HTTPException(403,"You can only delete your own listing")
    db.delete(item); db.commit(); return None

@app.post("/api/requirements",response_model=RequirementOut,status_code=201)
def create_requirement(data:RequirementIn,db:Session=Depends(get_db),user:Industry=Depends(current_user)):
    item=MaterialRequirement(owner_id=user.id,**data.model_dump()); db.add(item); db.commit(); db.refresh(item); return item
@app.get("/api/requirements",response_model=List[RequirementOut])
def list_requirements(db:Session=Depends(get_db),user:Industry=Depends(current_user),material_type:Optional[str]=None,status_filter:Optional[str]=Query(None,alias="status")):
    q=db.query(MaterialRequirement)
    if material_type: q=q.filter(MaterialRequirement.material_type.ilike(f"%{material_type}%"))
    if status_filter: q=q.filter(MaterialRequirement.status==status_filter)
    return q.order_by(MaterialRequirement.created_at.desc()).all()
@app.patch("/api/requirements/{item_id}",response_model=RequirementOut)
def update_requirement(item_id:int,data:dict,db:Session=Depends(get_db),user:Industry=Depends(current_user)):
    item=db.get(MaterialRequirement,item_id)
    if not item: raise HTTPException(404,"Requirement not found")
    if item.owner_id!=user.id: raise HTTPException(403,"You can only update your own requirement")
    for k,v in data.items():
        if k in {"material_type","quantity_kg","min_quality_percent","description","location","status"}: setattr(item,k,v)
    db.commit(); db.refresh(item); return item
@app.delete("/api/requirements/{item_id}",status_code=204)
def delete_requirement(item_id:int,db:Session=Depends(get_db),user:Industry=Depends(current_user)):
    item=db.get(MaterialRequirement,item_id)
    if not item: raise HTTPException(404,"Requirement not found")
    if item.owner_id!=user.id: raise HTTPException(403,"You can only delete your own requirement")
    db.delete(item); db.commit(); return None

@app.get("/api/matches")
def matches(db:Session=Depends(get_db),user:Industry=Depends(current_user),limit:int=Query(100,ge=1,le=500)):
    wastes=db.query(WasteListing).filter(WasteListing.status=="Available",WasteListing.quantity_kg>0).all()
    reqs=db.query(MaterialRequirement).filter(MaterialRequirement.status=="Open",MaterialRequirement.quantity_kg>0).all()
    out=[]
    for w in wastes:
        supplier=db.get(Industry,w.owner_id)
        if not supplier: continue
        for r in reqs:
            # Only show matches involving the authenticated industry; this also
            # prevents unrelated industries from initiating another pair's exchange.
            if user.id not in (w.owner_id, r.owner_id): continue
            if r.owner_id==w.owner_id or not material_match(w.material_type,r.material_type) or w.quality_percent < r.min_quality_percent: continue
            buyer=db.get(Industry,r.owner_id)
            qty=min(w.quantity_kg,r.quantity_kg)
            qty_score=min(100,qty/max(w.quantity_kg,r.quantity_kg)*100)
            quality_score=min(100,w.quality_percent)
            dist=distance_km(supplier,buyer)
            location_score=75 if dist is None else max(0,100-dist/5)
            score=round(0.55*quality_score+0.25*qty_score+0.20*location_score,1)
            out.append({"waste_id":w.id,"requirement_id":r.id,"supplier":public_industry(supplier),"buyer":public_industry(buyer),"material_type":w.material_type,"available_kg":w.quantity_kg,"required_kg":r.quantity_kg,"suggested_quantity_kg":qty,"quality_percent":w.quality_percent,"distance_km":round(dist,2) if dist is not None else None,"compatibility_score":score,"reasons":["Material type is compatible",f"Quality {w.quality_percent:.0f}% meets minimum {r.min_quality_percent:.0f}%",f"Quantity available for exchange: {qty:g} kg"],"score_type":"rule-based; not a trained ML model"})
    return sorted(out,key=lambda x:x["compatibility_score"],reverse=True)[:limit]

@app.post("/api/exchanges",status_code=201)
def create_exchange(data:ExchangeIn,db:Session=Depends(get_db),user:Industry=Depends(current_user)):
    waste=db.get(WasteListing,data.waste_id); req=db.get(MaterialRequirement,data.requirement_id)
    if not waste or not req: raise HTTPException(404,"Waste listing or requirement not found")
    if waste.owner_id==req.owner_id: raise HTTPException(400,"An industry cannot exchange with itself")
    if not material_match(waste.material_type,req.material_type): raise HTTPException(400,"Material types are incompatible")
    if waste.quality_percent<req.min_quality_percent: raise HTTPException(400,"Waste quality is below the buyer's minimum")
    if data.quantity_kg>waste.quantity_kg or data.quantity_kg>req.quantity_kg: raise HTTPException(400,"Requested quantity exceeds available or required quantity")
    if user.id not in (waste.owner_id,req.owner_id): raise HTTPException(403,"Only the supplier or buyer can create this exchange request")
    ex=Exchange(waste_id=waste.id,requirement_id=req.id,supplier_id=waste.owner_id,buyer_id=req.owner_id,quantity_kg=data.quantity_kg,notes=data.notes)
    db.add(ex); db.commit(); db.refresh(ex); return exchange_json(ex,db)

def exchange_json(ex:Exchange,db:Session):
    w=db.get(WasteListing,ex.waste_id); r=db.get(MaterialRequirement,ex.requirement_id)
    return {"id":ex.id,"waste_id":ex.waste_id,"requirement_id":ex.requirement_id,"supplier_id":ex.supplier_id,"buyer_id":ex.buyer_id,"quantity_kg":ex.quantity_kg,"status":ex.status,"estimated_transport_cost":ex.estimated_transport_cost,"notes":ex.notes,"created_at":ex.created_at,"material_type":w.material_type if w else None,"supplier":public_industry(db.get(Industry,ex.supplier_id)),"buyer":public_industry(db.get(Industry,ex.buyer_id))}
@app.get("/api/exchanges")
def list_exchanges(db:Session=Depends(get_db),user:Industry=Depends(current_user)):
    q=db.query(Exchange).filter((Exchange.supplier_id==user.id)|(Exchange.buyer_id==user.id)).order_by(Exchange.created_at.desc())
    return [exchange_json(x,db) for x in q.all()]
@app.patch("/api/exchanges/{exchange_id}")
def update_exchange(exchange_id:int,data:ExchangeStatusIn,db:Session=Depends(get_db),user:Industry=Depends(current_user)):
    ex=db.get(Exchange,exchange_id)
    if not ex: raise HTTPException(404,"Exchange not found")
    if user.id not in (ex.supplier_id,ex.buyer_id): raise HTTPException(403,"Not authorized for this exchange")
    allowed={"Requested":{"Accepted","Rejected","Cancelled"},"Accepted":{"Completed","Cancelled"},"Rejected":set(),"Completed":set(),"Cancelled":set()}
    if data.status not in allowed.get(ex.status,set()): raise HTTPException(400,f"Cannot change status from {ex.status} to {data.status}")
    ex.status=data.status
    if data.status=="Completed":
        waste=db.get(WasteListing,ex.waste_id); req=db.get(MaterialRequirement,ex.requirement_id)
        if waste: waste.quantity_kg=max(0,waste.quantity_kg-ex.quantity_kg); waste.status="Available" if waste.quantity_kg>0 else "Exchanged"
        if req: req.quantity_kg=max(0,req.quantity_kg-ex.quantity_kg); req.status="Open" if req.quantity_kg>0 else "Fulfilled"
    db.commit(); db.refresh(ex); return exchange_json(ex,db)

def load_synthetic_records() -> list[dict]:
    """Read bundled, clearly-labelled synthetic certificate records without requiring pandas."""
    dataset_path = APP_DIR / "data" / "symbioloop_synthetic_dataset.csv"
    if not dataset_path.exists():
        return []
    try:
        with dataset_path.open("r", encoding="utf-8-sig", newline="") as handle:
            return list(csv.DictReader(handle))
    except (OSError, csv.Error):
        return []

def numeric(value):
    try:
        if value is None or str(value).strip() == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None

@app.get("/api/industrial-data/summary")
def industrial_data_summary():
    """Summary of the bundled project dataset. All expanded rows are synthetic."""
    records = load_synthetic_records()
    product_counts = {}
    parameter_stats = {}
    for row in records:
        product = row.get("Product", "Unknown")
        product_counts[product] = product_counts.get(product, 0) + 1
        for key, raw_value in row.items():
            if not key.endswith(" Result"):
                continue
            value = numeric(raw_value)
            if value is None:
                continue
            parameter = key[:-7]
            stat_key = (product, parameter)
            stat = parameter_stats.setdefault(stat_key, {"product": product, "parameter": parameter, "values": [], "min_spec": numeric(row.get(f"{parameter} Min Spec")), "max_spec": numeric(row.get(f"{parameter} Max Spec")), "uom": row.get(f"{parameter} UOM", "")})
            stat["values"].append(value)
    quality = []
    for stat in parameter_stats.values():
        values = stat.pop("values")
        lo, hi = stat["min_spec"], stat["max_spec"]
        out_of_spec = sum(1 for v in values if (lo is not None and v < lo) or (hi is not None and v > hi))
        quality.append({
            **stat,
            "sample_count": len(values),
            "average": round(sum(values) / len(values), 3) if values else None,
            "minimum_observed": round(min(values), 3) if values else None,
            "maximum_observed": round(max(values), 3) if values else None,
            "out_of_spec_count": out_of_spec,
            "status": "Within generated limits" if out_of_spec == 0 else "Review required"
        })
    return {
        "dataset_name": "SymbioLoop Expanded COA Dataset",
        "record_count": len(records),
        "data_status": "SYNTHETIC - for development and demonstration only; not actual company records",
        "product_counts": [{"product": k, "records": v} for k, v in sorted(product_counts.items())],
        "quality_summary": sorted(quality, key=lambda x: (x["product"], x["parameter"])),
        "limitations": [
            "Generated records are synthetic and must not be represented as actual STAR Enterprises measurements.",
            "Quantity units were not specified in the source certificate; supplied quantities are not assumed to be kilograms.",
            "APCOFLEX N1110 includes only the two parameters present in its source certificate."
        ]
    }

@app.get("/api/forecast")
def forecast(db:Session=Depends(get_db),user:Industry=Depends(current_user),periods:int=Query(6,ge=1,le=12),source:str=Query("dataset",pattern="^(dataset|database)$"),product:str=Query("all"),fill:str=Query("interpolate",pattern="^(interpolate|zero)$")):
    """Monthly demand forecast. source=dataset uses the bundled COA records, source=database uses live waste listings."""
    current=datetime.utcnow().strftime("%Y-%m")
    products=[]
    if source=="database":
        # The current month is still in progress, so it is left out of the history.
        pairs=[(dt.strftime("%Y-%m"),float(q)) for dt,q in db.query(WasteListing.created_at,WasteListing.quantity_kg).all() if dt and q is not None and dt.strftime("%Y-%m")!=current]
        measure="waste listed per month (kg)"; note="Built from waste listings created on this platform."
    else:
        records=load_synthetic_records()
        products=sorted({r.get("Product","") for r in records if r.get("Product")})
        pairs=[]
        for r in records:
            if product!="all" and r.get("Product")!=product: continue
            d=(r.get("Manufacturing_Date") or "")[:7]; q=numeric(r.get("Quantity_Supplied"))
            if len(d)==7 and q is not None: pairs.append((d,q))
        measure="quantity supplied per month (unit not specified in source)"
        note="Synthetic demonstration data. Quantity units are not specified, so values are not labelled as kilograms."
    result=build_forecast(pairs,periods,fill)
    if result.get("last_month") and month_index(result["last_month"])<month_index(current)-1:
        result["warnings"].append(f"The data ends in {result['last_month']}. The forecast starts the month after it, so it may cover months that have already passed.")
    result.update({"source":"synthetic_project_dataset" if source=="dataset" else "live_application_database","measure":measure,"note":note,"products":products,"product":product,"synthetic":source=="dataset"})
    return result

@app.get("/api/optimization")
def optimization(db:Session=Depends(get_db),user:Industry=Depends(current_user),transport_cost_per_km:float=Query(18,ge=0,le=100000)):
    candidates=[]
    wastes=db.query(WasteListing).filter(WasteListing.status=="Available",WasteListing.quantity_kg>0).all()
    reqs=db.query(MaterialRequirement).filter(MaterialRequirement.status=="Open",MaterialRequirement.quantity_kg>0).all()
    for w in wastes:
        supplier=db.get(Industry,w.owner_id)
        for r in reqs:
            if w.owner_id==r.owner_id or not material_match(w.material_type,r.material_type) or w.quality_percent<r.min_quality_percent: continue
            buyer=db.get(Industry,r.owner_id); dist=distance_km(supplier,buyer); qty=min(w.quantity_kg,r.quantity_kg)
            cost=round(dist*transport_cost_per_km,2) if dist is not None else None
            candidates.append({"waste_id":w.id,"requirement_id":r.id,"material_type":w.material_type,"supplier":public_industry(supplier),"buyer":public_industry(buyer),"quantity_kg":qty,"distance_km":round(dist,2) if dist is not None else None,"estimated_transport_cost":cost,"cost_per_kg":round(cost/qty,2) if cost is not None and qty else None,"calculation":"straight-line distance × configured cost/km; road distance not included" if dist is not None else "Coordinates missing; add supplier and buyer latitude/longitude"})
    candidates.sort(key=lambda x:(x["estimated_transport_cost"] is None,x["estimated_transport_cost"] or float("inf")))
    return {"transport_cost_per_km":transport_cost_per_km,"recommendations":candidates,"note":"Estimates only. Add coordinates and a road-routing provider for road distance and realistic cost."}

@app.post("/api/assistant")
def assistant(data:AssistantIn,db:Session=Depends(get_db),user:Industry=Depends(current_user)):
    msg=data.message.lower(); waste_count=db.query(WasteListing).count(); req_count=db.query(MaterialRequirement).count(); match_count=len(matches(db,user,100))
    if any(k in msg for k in ["match","compatible","buyer","supplier"]):
        top=matches(db,user,5)
        if not top: answer="No compatible listings were found yet. Add available waste and open material requirements from different industries."
        else: answer="Top rule-based matches:\n"+"\n".join([f"{m['material_type']}: {m['supplier']['name']} → {m['buyer']['name']}, {m['suggested_quantity_kg']:g} kg, score {m['compatibility_score']}%." for m in top])
    elif any(k in msg for k in ["forecast","demand","predict"]):
        f=forecast(db,user,3,"dataset","all","interpolate"); nxt=f["forecast"][0]["value"] if f["forecast"] else None
        answer=f"Forecast method: {f['method']}. {f['verdict']} Next month: {nxt:g} (synthetic dataset, unit not specified)." if nxt is not None else "No monthly history is available to forecast from yet."
    elif any(k in msg for k in ["sustainability","environment","saved","divert","co2","carbon"]):
        sm=sustainability(db,user,"platform",6); co2=sm["co2"]
        answer=f"Completed exchanges: {sm['completed_exchange_count']}; rubber reused: {sm['total_reused_kg']:g} kg; estimated CO2 avoided: {co2['estimated_saved_kg']:g} kg CO2e ({co2['factor_status']} emission factor). {sm['environmental_note']}"
    else: answer=f"Hello {user.name}! I can help with waste matching, demand forecasts, exchanges, and sustainability. Current platform records: {waste_count} waste listings, {req_count} requirements, and {match_count} compatible rule-based matches. Ask about one of these modules."
    return {"answer":answer,"assistant_type":"built-in retrieval/rule-based assistant","llm_configured":bool(os.getenv("OPENAI_API_KEY")),"note":"No external LLM call is made by this starter assistant."}

@app.get("/api/sustainability")
def sustainability(db:Session=Depends(get_db),user:Industry=Depends(current_user),scope:str=Query("platform",pattern="^(platform|mine)$"),months:int=Query(6,ge=2,le=12)):
    """Reuse, landfill-diversion and estimated CO2 metrics. scope=mine limits data to the logged-in industry."""
    waste_q=db.query(func.coalesce(func.sum(WasteListing.quantity_kg),0))
    if scope=="mine": waste_q=waste_q.filter(WasteListing.owner_id==user.id)
    total_listed=waste_q.scalar() or 0
    available=waste_q.filter(WasteListing.status=="Available").scalar() or 0
    ex_q=db.query(Exchange,WasteListing.material_type).join(WasteListing,Exchange.waste_id==WasteListing.id).filter(Exchange.status=="Completed")
    if scope=="mine": ex_q=ex_q.filter((Exchange.supplier_id==user.id)|(Exchange.buyer_id==user.id))
    # updated_at is refreshed on the status change, and Completed is a final state, so it is the completion time.
    completed=[{"quantity_kg":ex.quantity_kg,"material_type":mat,"completed_at":ex.updated_at,"supplier_id":ex.supplier_id,"buyer_id":ex.buyer_id} for ex,mat in ex_q.all()]
    result=build_summary(completed,float(total_listed),float(available),load_factor_config(),months=months)
    result["scope"]=scope
    return result

@app.post("/api/vision/predict")
async def vision_predict(file:UploadFile=File(...),user:Industry=Depends(current_user)):
    """Run a trained HOG/SVM image classifier when one has been trained locally.

    This endpoint never invents a material class: without a model it returns a clear setup status.
    """
    allowed={"image/jpeg","image/png","image/webp"}
    if file.content_type not in allowed: raise HTTPException(415,"Upload a JPG, PNG or WEBP image")
    content=await file.read()
    if len(content)>10*1024*1024: raise HTTPException(413,"Image must be 10 MB or smaller")
    if not content: raise HTTPException(400,"The uploaded image is empty")
    model_path=APP_DIR / "models" / "rubber_waste_classifier.joblib"
    if not model_path.exists():
        return {"status":"model_not_configured","filename":file.filename,"bytes_received":len(content),"prediction":None,"confidence":None,"message":"Image upload was received. To enable actual classification, add labelled images under backend/dataset/<class_name>/ and run train_vision_model.py. No class is guessed without a trained model."}
    try:
        from importlib import import_module
        Image=import_module("PIL.Image")
        from skimage.feature import hog  # type: ignore[import-not-found]
        import numpy as np  # type: ignore[import-not-found]
        import joblib  # type: ignore[import-not-found]
        import io
        image=Image.open(io.BytesIO(content)).convert("RGB").resize((128,128))
        gray=np.asarray(image.convert("L"))
        features=hog(gray,orientations=9,pixels_per_cell=(8,8),cells_per_block=(2,2),block_norm="L2-Hys")
        model=joblib.load(model_path)
        prediction=str(model.predict([features])[0])
        confidence=None
        if hasattr(model,"predict_proba"):
            confidence=round(float(max(model.predict_proba([features])[0])),4)
        return {"status":"success","filename":file.filename,"prediction":prediction,"confidence":confidence,"model":"HOG + SVM trained from local labelled dataset","warning":"Prediction quality depends on the training dataset. Verify the material manually before industrial use."}
    except Exception as exc:
        raise HTTPException(500,f"Image classification failed: {exc}. Check backend vision dependencies and the trained model file.")

@app.get("/api/dashboard")
def dashboard(db:Session=Depends(get_db),user:Industry=Depends(current_user)):
    waste_count=db.query(WasteListing).count(); req_count=db.query(MaterialRequirement).count(); exchange_count=db.query(Exchange).count()
    total_available=db.query(func.coalesce(func.sum(WasteListing.quantity_kg),0)).filter(WasteListing.status=="Available").scalar() or 0
    completed=db.query(Exchange).filter(Exchange.status=="Completed").all()
    return {"industry":public_industry(user),"total_waste_listings":waste_count,"total_requirements":req_count,"total_exchanges":exchange_count,"available_waste_kg":round(float(total_available),2),"completed_exchange_kg":round(sum(x.quantity_kg for x in completed),2),"compatible_matches":len(matches(db,user,500))}

@app.get("/api/modules")
def modules():
    return {"modules":[{"name":"Authentication","status":"implemented"},{"name":"Waste management","status":"implemented"},{"name":"Material requirements","status":"implemented"},{"name":"Rule-based matching","status":"implemented"},{"name":"Exchange workflow","status":"implemented"},{"name":"Demand forecast","status":"statistical models with rolling backtest (MAE, RMSE, MAPE)"},{"name":"Cost optimization","status":"estimated; requires coordinates for distances"},{"name":"Assistant","status":"rule-based; no LLM configured"},{"name":"Rubber image classification","status":"requires trained model/dataset"},{"name":"Sustainability","status":"database-derived; CO2 estimate uses a configurable emission factor"}]}
