"""Checks for forecasting.py. Run from the backend folder: python test_forecasting.py"""
from forecasting import (build_forecast, monthly_series, month_key, month_index,
                         model_mean3, model_linear, MIN_POINTS)


def months(n, start=(2024, 1)):
    y, m = start
    out = []
    for _ in range(n):
        out.append(f"{y:04d}-{m:02d}")
        m += 1
        if m == 13:
            m, y = 1, y + 1
    return out


def test_month_helpers_cross_year():
    assert month_key(month_index("2025-12") + 1) == "2026-01"
    assert month_key(month_index("2024-01")) == "2024-01"


def test_gap_interpolation_and_zero_fill():
    pairs = [("2024-01", 10), ("2024-03", 30), ("2024-04", 40)]
    m, v, filled, rec = monthly_series(pairs, "interpolate")
    assert m == ["2024-01", "2024-02", "2024-03", "2024-04"]
    assert v == [10, 20, 30, 40] and filled == [False, True, False, False] and rec == [1, 0, 1, 1]
    _, vz, _, _ = monthly_series(pairs, "zero")
    assert vz[1] == 0.0


def test_records_in_same_month_are_summed():
    _, v, _, rec = monthly_series([("2024-01", 5), ("2024-01", 7)], "interpolate")
    assert v == [12] and rec == [2]


def test_simple_models():
    assert model_mean3([1, 2, 3, 10], 2) == [5.0, 5.0]
    lin = model_linear([100 + 10 * t for t in range(10)], 3)
    assert [round(x) for x in lin] == [200, 210, 220]
    assert min(model_linear([50, 40, 30, 20, 10], 3)) >= 0  # never negative


def test_trending_series_picks_trend_model_and_continues_it():
    ms = months(24)
    pairs = [(m, 100 + 10 * i) for i, m in enumerate(ms)]
    r = build_forecast(pairs, horizon=3)
    assert r["validated"] and r["selected_model"] in ("linear", "holt")
    assert r["forecast"][0]["month"] == "2026-01"
    assert abs(r["forecast"][0]["value"] - (100 + 10 * 24)) < 15
    assert r["improvement_vs_baseline_pct"] > 50


def test_forecast_starts_after_last_observed_month():
    pairs = [(m, 50 + (i % 3)) for i, m in enumerate(months(15))]  # 2024-01 .. 2025-03
    r = build_forecast(pairs, horizon=2)
    assert [f["month"] for f in r["forecast"]] == ["2025-04", "2025-05"]
    assert all(f["low"] <= f["value"] <= f["high"] for f in r["forecast"])


def test_short_series_is_not_validated():
    pairs = [(m, 10 + i) for i, m in enumerate(months(MIN_POINTS - 1))]
    r = build_forecast(pairs, horizon=3)
    assert r["validated"] is False and r["models"] == [] and r["forecast"][0]["low"] is None
    assert any("validate" in w for w in r["warnings"])


def test_empty_input():
    r = build_forecast([], horizon=3)
    assert r["history"] == [] and r["forecast"] == []


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn(); print("ok", name)