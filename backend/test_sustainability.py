"""Quick checks for sustainability.py. Run: python test_sustainability.py"""
from datetime import datetime
from sustainability import build_summary, factor_for, _last_months

CFG = {"default": 1.0, "per_material": {"nbr": 2.0}, "source": None}
NOW = datetime(2026, 10, 24)


def ex(kg, material, when, s=1, b=2):
    return {"quantity_kg": kg, "material_type": material, "completed_at": when, "supplier_id": s, "buyer_id": b}


def test_factor_lookup():
    assert factor_for("NBR Scrap", CFG) == 2.0      # substring match
    assert factor_for("nbr", CFG) == 2.0            # exact match
    assert factor_for("EPDM Scrap", CFG) == 1.0     # default
    assert factor_for(None, CFG) == 1.0


def test_month_window_crosses_year():
    assert _last_months(datetime(2026, 2, 10), 4) == ["2025-11", "2025-12", "2026-01", "2026-02"]


def test_summary_totals_and_months():
    done = [ex(100, "NBR Scrap", datetime(2026, 10, 3)), ex(50, "EPDM Scrap", datetime(2026, 9, 20), s=3), ex(10, "NBR Scrap", datetime(2025, 1, 5))]
    r = build_summary(done, total_listed_kg=500, available_kg=40, config=CFG, now=NOW, months=6)
    assert r["total_reused_kg"] == 160 and r["completed_exchange_count"] == 3
    assert r["co2"]["estimated_saved_kg"] == 100 * 2 + 50 * 1 + 10 * 2
    assert r["co2"]["factor_status"] == "placeholder"
    assert r["waste_diversion_percent"] == round(160 / 200 * 100, 2)
    assert r["industries_participating"] == 3
    months = {m["month"]: m for m in r["monthly"]}
    assert list(months) == ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]
    assert months["2026-10"]["reused_kg"] == 100 and months["2026-09"]["reused_kg"] == 50
    assert sum(m["reused_kg"] for m in months.values()) == 150   # Jan-2025 exchange is outside the window but in totals
    assert r["by_material"][0]["material_type"] == "NBR Scrap" and r["by_material"][0]["exchanges"] == 2


def test_empty_and_sourced():
    r = build_summary([], 0, 0, {"default": 1.5, "per_material": {}, "source": "Example LCA 2024"}, now=NOW)
    assert r["total_reused_kg"] == 0 and r["waste_diversion_percent"] == 0 and r["by_material"] == []
    assert r["co2"]["factor_status"] == "sourced" and "Example LCA 2024" in r["environmental_note"]
    assert len(r["monthly"]) == 6


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn(); print("ok", name)
