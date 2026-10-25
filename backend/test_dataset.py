"""Small standard-library validation for the bundled SymbioLoop dataset."""
from pathlib import Path
import csv
from collections import Counter

DATA = Path(__file__).resolve().parent / "data" / "symbioloop_synthetic_dataset.csv"

def main():
    if not DATA.exists():
        raise SystemExit(f"Dataset not found: {DATA}")
    with DATA.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    assert len(rows) == 100, f"Expected 100 generated rows, got {len(rows)}"
    products = Counter(row["Product"] for row in rows)
    assert products["APCOFLEX N 745"] == 50, products
    assert products["APCOFLEX N1110"] == 50, products
    assert all("SYNTHETIC" in row["Data_Status"].upper() for row in rows), "Every expanded row must be labelled synthetic"
    assert all(row.get("Manufacturing_Date") for row in rows), "Manufacturing dates should be populated"
    print("Dataset validation passed.")
    print(f"Rows: {len(rows)}")
    for product, count in sorted(products.items()):
        print(f"- {product}: {count} rows")
    print("Notice: all expanded rows are synthetic; source quantity unit is unspecified.")

if __name__ == "__main__":
    main()
