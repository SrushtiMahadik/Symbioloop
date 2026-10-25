"""Sustainability calculations for SymbioLoop.

Pure functions only (no FastAPI / SQLAlchemy imports) so the maths can be tested
on its own and reused by the API, the assistant and the seed script.

CO2 model (an ESTIMATE, not a measurement):
    co2_saved_kg = quantity_kg_reused x emission_factor(material)

The emission factor is "kg CO2e avoided per kg of rubber reused instead of
disposed". It must come from a cited source (LCA paper, SRS reference, company
data). Until CO2_FACTOR_SOURCE is set in backend/.env the factor is reported
as a PLACEHOLDER and the UI shows a warning banner.
"""
from __future__ import annotations

import json
import os
from collections import defaultdict
from datetime import datetime
from typing import Iterable, Optional

MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _norm(text: str) -> str:
    return " ".join(str(text).lower().replace("-", " ").replace("_", " ").split())


def load_factor_config() -> dict:
    """Read emission-factor settings from environment variables (backend/.env).

    CO2_FACTOR_DEFAULT   kg CO2e avoided per kg reused (fallback for any material)
    CO2_FACTORS_JSON     optional per-material overrides, e.g. {"NBR": 2.1, "EPDM": 1.8}
    CO2_FACTOR_SOURCE    citation for the factors; leave empty while they are placeholders
    """
    try:
        default = float(os.getenv("CO2_FACTOR_DEFAULT", "1.0"))
    except ValueError:
        default = 1.0
    per_material: dict[str, float] = {}
    raw = os.getenv("CO2_FACTORS_JSON", "").strip()
    if raw:
        try:
            per_material = {_norm(k): float(v) for k, v in json.loads(raw).items()}
        except (ValueError, TypeError, AttributeError):
            per_material = {}
    source = os.getenv("CO2_FACTOR_SOURCE", "").strip()
    return {"default": default, "per_material": per_material, "source": source or None}


def factor_for(material: Optional[str], config: dict) -> float:
    """Emission factor for a material: exact match, then substring match, then default."""
    if material:
        name = _norm(material)
        table = config.get("per_material", {})
        if name in table:
            return table[name]
        for key, value in table.items():
            if key in name or name in key:
                return value
    return config.get("default", 1.0)


def _month_key(dt: datetime) -> str:
    return f"{dt.year:04d}-{dt.month:02d}"


def _last_months(now: datetime, count: int) -> list[str]:
    """The last `count` month keys ending at `now`'s month, oldest first."""
    year, month = now.year, now.month
    keys = []
    for _ in range(count):
        keys.append(f"{year:04d}-{month:02d}")
        month -= 1
        if month == 0:
            month, year = 12, year - 1
    return list(reversed(keys))


def month_label(key: str) -> str:
    year, month = key.split("-")
    return f"{MONTH_NAMES[int(month) - 1]} {year[2:]}"


def build_summary(
    completed: Iterable[dict],
    total_listed_kg: float,
    available_kg: float,
    config: dict,
    now: Optional[datetime] = None,
    months: int = 6,
) -> dict:
    """Aggregate completed exchanges into the sustainability payload.

    Each item of `completed` needs: quantity_kg, material_type, completed_at (datetime),
    supplier_id, buyer_id.
    """
    now = now or datetime.utcnow()
    completed = list(completed)

    month_keys = _last_months(now, months)
    monthly = {k: {"month": k, "label": month_label(k), "reused_kg": 0.0, "co2_saved_kg": 0.0, "exchanges": 0} for k in month_keys}
    by_material: dict[str, dict] = defaultdict(lambda: {"reused_kg": 0.0, "co2_saved_kg": 0.0, "exchanges": 0})
    industries: set[int] = set()
    total_reused = 0.0
    total_co2 = 0.0

    for ex in completed:
        qty = float(ex["quantity_kg"] or 0)
        material = ex.get("material_type") or "Unspecified"
        co2 = qty * factor_for(material, config)
        total_reused += qty
        total_co2 += co2
        industries.update(i for i in (ex.get("supplier_id"), ex.get("buyer_id")) if i is not None)

        bucket = by_material[material]
        bucket["reused_kg"] += qty
        bucket["co2_saved_kg"] += co2
        bucket["exchanges"] += 1

        completed_at = ex.get("completed_at")
        if completed_at is not None:
            key = _month_key(completed_at)
            if key in monthly:
                monthly[key]["reused_kg"] += qty
                monthly[key]["co2_saved_kg"] += co2
                monthly[key]["exchanges"] += 1

    materials = [
        {
            "material_type": name,
            "reused_kg": round(v["reused_kg"], 2),
            "co2_saved_kg": round(v["co2_saved_kg"], 2),
            "exchanges": v["exchanges"],
            "factor": factor_for(name, config),
        }
        for name, v in by_material.items()
    ]
    materials.sort(key=lambda m: m["reused_kg"], reverse=True)

    status = "sourced" if config.get("source") else "placeholder"
    if status == "placeholder":
        note = (
            "CO2 figures are ESTIMATES using a placeholder emission factor. "
            "Set CO2_FACTOR_SOURCE and verified factors in backend/.env before reporting them."
        )
    else:
        note = f"CO2 figures are estimates (reused kg x emission factor). Factor source: {config['source']}."

    denominator = total_reused + float(available_kg)
    return {
        "total_listed_kg": round(float(total_listed_kg), 2),
        "currently_available_kg": round(float(available_kg), 2),
        "completed_exchange_count": len(completed),
        "total_reused_kg": round(total_reused, 2),
        "landfill_diverted_kg": round(total_reused, 2),
        "waste_diversion_percent": round(total_reused / denominator * 100, 2) if denominator > 0 else 0,
        "industries_participating": len(industries),
        "co2": {
            "estimated_saved_kg": round(total_co2, 2),
            "unit": "kg CO2e",
            "factor_default": config.get("default"),
            "factor_status": status,
            "factor_source": config.get("source"),
        },
        "monthly": [
            {**m, "reused_kg": round(m["reused_kg"], 2), "co2_saved_kg": round(m["co2_saved_kg"], 2)}
            for m in monthly.values()
        ],
        "by_material": materials,
        "environmental_note": note,
    }
