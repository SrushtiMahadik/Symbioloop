"""Demand forecasting for SymbioLoop.

Pure Python (no FastAPI / SQLAlchemy / numpy) so it can be tested on its own.

Pipeline
    1. monthly_series()  - sum records per month, fill months that have no records
    2. four candidate models - 3-month average (baseline), simple exponential smoothing,
       damped Holt trend, linear trend. Each model tunes its own parameters on the
       training window only.
    3. rolling-origin backtest on the last TEST_ORIGINS months (forecasting 1-3 months
       ahead each time) -> MAE, RMSE, MAPE per model
    4. the model with the lowest RMSE is used for the forecast; an approximate 80%
       range is built from that model's backtest errors

With only a few dozen noisy monthly points no model is guaranteed to beat the baseline.
The result says so explicitly (improvement_vs_baseline_pct, verdict).
"""
from __future__ import annotations

import math
from typing import Callable, Optional

MIN_POINTS = 12      # fewer months than this -> baseline only, no validation
TEST_ORIGINS = 6     # number of forecast origins used in the backtest
MAX_EVAL_H = 3       # backtest looks 1..3 months ahead
Z80 = 1.2816         # z-value for an approximate 80% interval
BASELINE = "mean3"


# --------------------------------------------------------------------------- series
def month_index(key: str) -> int:
    year, month = key.split("-")[:2]
    return int(year) * 12 + int(month) - 1


def month_key(index: int) -> str:
    return f"{index // 12:04d}-{index % 12 + 1:02d}"


def _interpolate(values: list) -> list:
    """Linear interpolation of interior None gaps (first and last values are always known)."""
    out = list(values)
    n = len(out)
    i = 0
    while i < n:
        if out[i] is None:
            j = i
            while j < n and out[j] is None:
                j += 1
            left, right = out[i - 1], out[j]
            span = j - i + 1
            for k in range(i, j):
                out[k] = left + (right - left) * (k - i + 1) / span
            i = j
        else:
            i += 1
    return out


def monthly_series(pairs, fill: str = "interpolate"):
    """pairs: iterable of ("YYYY-MM", value). Returns (months, values, filled_flags, record_counts)."""
    totals: dict[int, float] = {}
    counts: dict[int, int] = {}
    for key, value in pairs:
        idx = month_index(key)
        totals[idx] = totals.get(idx, 0.0) + float(value)
        counts[idx] = counts.get(idx, 0) + 1
    if not totals:
        return [], [], [], []
    lo, hi = min(totals), max(totals)
    indices = list(range(lo, hi + 1))
    values = [totals.get(i) for i in indices]
    filled = [i not in totals for i in indices]
    records = [counts.get(i, 0) for i in indices]
    if fill == "zero":
        values = [0.0 if v is None else v for v in values]
    else:
        values = _interpolate(values)
    return [month_key(i) for i in indices], values, filled, records


# --------------------------------------------------------------------------- models
def _clip(values: list) -> list:
    return [max(0.0, v) for v in values]


def model_mean3(y: list, h: int) -> list:
    recent = y[-3:]
    return _clip([sum(recent) / len(recent)] * h)


def model_ses(y: list, h: int) -> list:
    best_alpha, best_sse = 0.3, float("inf")
    for step in range(1, 20):
        alpha = step * 0.05
        level, sse = y[0], 0.0
        for t in range(1, len(y)):
            err = y[t] - level
            sse += err * err
            level += alpha * err
        if sse < best_sse:
            best_alpha, best_sse = alpha, sse
    level = y[0]
    for t in range(1, len(y)):
        level += best_alpha * (y[t] - level)
    return _clip([level] * h)


def model_holt_damped(y: list, h: int) -> list:
    n = len(y)
    span = min(3, n - 1)
    b0 = (y[span] - y[0]) / span if span > 0 else 0.0
    best = (float("inf"), 0.3, 0.1, 0.9)
    for a_step in range(1, 10):
        alpha = a_step * 0.1
        for beta in (0.05, 0.1, 0.2, 0.3):
            for phi in (0.8, 0.9, 0.98):
                level, trend, sse = y[0], b0, 0.0
                for t in range(1, n):
                    pred = level + phi * trend
                    err = y[t] - pred
                    sse += err * err
                    new_level = pred + alpha * err
                    trend = beta * (new_level - level) + (1 - beta) * phi * trend
                    level = new_level
                if sse < best[0]:
                    best = (sse, alpha, beta, phi)
    _, alpha, beta, phi = best
    level, trend = y[0], b0
    for t in range(1, n):
        pred = level + phi * trend
        err = y[t] - pred
        new_level = pred + alpha * err
        trend = beta * (new_level - level) + (1 - beta) * phi * trend
        level = new_level
    out, damp = [], 0.0
    for step in range(1, h + 1):
        damp += phi ** step
        out.append(level + damp * trend)
    return _clip(out)


def model_linear(y: list, h: int) -> list:
    n = len(y)
    mean_t = (n - 1) / 2
    mean_y = sum(y) / n
    denom = sum((t - mean_t) ** 2 for t in range(n)) or 1.0
    slope = sum((t - mean_t) * (y[t] - mean_y) for t in range(n)) / denom
    intercept = mean_y - slope * mean_t
    return _clip([intercept + slope * (n - 1 + step) for step in range(1, h + 1)])


MODELS: dict[str, tuple[str, Callable]] = {
    "mean3": ("3-month average (baseline)", model_mean3),
    "ses": ("Simple exponential smoothing", model_ses),
    "holt": ("Damped Holt trend", model_holt_damped),
    "linear": ("Linear trend", model_linear),
}


# --------------------------------------------------------------------------- backtest
def backtest(model: Callable, y: list, test: int = TEST_ORIGINS, max_h: int = MAX_EVAL_H) -> dict:
    """Rolling-origin evaluation: for each origin t in the last `test` months, fit on y[:t]
    and forecast up to max_h months ahead, comparing with what really happened."""
    n = len(y)
    errors_by_h: dict[int, list] = {h: [] for h in range(1, max_h + 1)}
    pairs = []
    for t in range(n - test, n):
        horizon = min(max_h, n - t)
        forecast = model(y[:t], horizon)
        for h, f in enumerate(forecast, 1):
            actual = y[t + h - 1]
            errors_by_h[h].append(actual - f)
            pairs.append((actual, f))
    errors = [a - f for a, f in pairs]
    mae = sum(abs(e) for e in errors) / len(errors)
    rmse = math.sqrt(sum(e * e for e in errors) / len(errors))
    pct = [abs(a - f) / a for a, f in pairs if a > 0]
    mape = sum(pct) / len(pct) * 100 if pct else None
    return {"mae": mae, "rmse": rmse, "mape": mape, "errors_by_h": errors_by_h, "points": len(pairs)}


def _rmse(errors: list) -> float:
    return math.sqrt(sum(e * e for e in errors) / len(errors))


def _sigma_for_horizon(errors_by_h: dict, h: int, pooled: float) -> float:
    base = min(h, MAX_EVAL_H)
    errs = errors_by_h.get(base, [])
    sigma = _rmse(errs) if len(errs) >= 3 else pooled
    if h > MAX_EVAL_H:
        sigma *= math.sqrt(h / MAX_EVAL_H)
    return sigma


# --------------------------------------------------------------------------- main entry
def build_forecast(pairs, horizon: int = 6, fill: str = "interpolate") -> dict:
    months, values, filled, records = monthly_series(pairs, fill)
    n = len(values)
    warnings: list[str] = []
    if n == 0:
        return {"validated": False, "history": [], "forecast": [], "models": [], "n_observed": 0,
                "n_filled": 0, "filled_months": [], "warnings": ["No monthly data is available."],
                "method": "no data", "selected_model": None, "verdict": "No data."}

    n_filled = sum(filled)
    if n_filled:
        how = "set to 0" if fill == "zero" else "filled by linear interpolation"
        warnings.append(f"{n_filled} of {n} months had no records and were {how}.")
    mean_v = sum(values) / n
    if n > 1 and mean_v > 0:
        sd = math.sqrt(sum((v - mean_v) ** 2 for v in values) / (n - 1))
        if sd / mean_v > 0.6:
            warnings.append("Monthly totals vary a lot, so any forecast here is only indicative.")

    history = [{"month": m, "value": round(v, 2), "filled": f, "record_count": r}
               for m, v, f, r in zip(months, values, filled, records)]
    first_future = month_index(months[-1]) + 1
    future_months = [month_key(first_future + i) for i in range(horizon)]

    base = {
        "first_month": months[0], "last_month": months[-1], "n_observed": n - n_filled,
        "n_filled": n_filled, "filled_months": [m for m, f in zip(months, filled) if f],
        "history": history,
    }

    if n < MIN_POINTS:
        warnings.append(f"Only {n} months of history; at least {MIN_POINTS} are needed to validate models, "
                        "so the 3-month average is shown without a backtest.")
        fc = model_mean3(values, horizon)
        return {**base, "validated": False, "selected_model": BASELINE,
                "selected_label": MODELS[BASELINE][0], "baseline_model": BASELINE, "models": [],
                "improvement_vs_baseline_pct": None, "backtest": None, "interval": None,
                "forecast": [{"month": m, "value": round(v, 2), "low": None, "high": None, "model": BASELINE}
                             for m, v in zip(future_months, fc)],
                "method": "3-month average (not validated)", "warnings": warnings,
                "verdict": "Not enough history to validate a model."}

    results = {name: backtest(fn, values) for name, (_, fn) in MODELS.items()}
    best = min(results, key=lambda k: (results[k]["rmse"], 0 if k == BASELINE else 1))
    base_rmse, best_rmse = results[BASELINE]["rmse"], results[best]["rmse"]
    improvement = (base_rmse - best_rmse) / base_rmse * 100 if base_rmse > 0 else 0.0
    if best == BASELINE:
        verdict = "No model beat the 3-month average in the backtest, so the baseline is used."
    elif improvement < 5:
        verdict = "The best model is only marginally better than the 3-month average; treat the forecast as indicative."
    else:
        verdict = f"The selected model reduced backtest RMSE by {improvement:.0f}% versus the 3-month average."

    fc = MODELS[best][1](values, horizon)
    pooled = results[best]["rmse"]
    rows = []
    for i, (m, v) in enumerate(zip(future_months, fc), 1):
        band = Z80 * _sigma_for_horizon(results[best]["errors_by_h"], i, pooled)
        rows.append({"month": m, "value": round(v, 2), "low": round(max(0.0, v - band), 2),
                     "high": round(v + band, 2), "model": best})

    models = [{"name": k, "label": MODELS[k][0], "mae": round(r["mae"], 2), "rmse": round(r["rmse"], 2),
               "mape": round(r["mape"], 1) if r["mape"] is not None else None, "selected": k == best}
              for k, r in results.items()]
    return {**base, "validated": True, "selected_model": best, "selected_label": MODELS[best][0],
            "baseline_model": BASELINE, "models": models,
            "improvement_vs_baseline_pct": round(improvement, 1),
            "backtest": {"origins": TEST_ORIGINS, "max_horizon": MAX_EVAL_H, "points": results[best]["points"]},
            "interval": "approximate 80% range from backtest errors (small sample)",
            "forecast": rows, "method": f"{MODELS[best][0]}, validated by rolling backtest",
            "warnings": warnings, "verdict": verdict}