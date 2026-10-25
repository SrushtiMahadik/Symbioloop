# SymbioLoop: Rubber Resource Exchange Platform

An industrial symbiosis platform for the rubber industry. One factory lists its rubber waste, another lists what it needs, and SymbioLoop matches them, tracks the exchange, forecasts demand and reports the environmental impact. BE final-year project, Ajeenkya DY Patil School of Engineering, Pune.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, react-router-dom, lucide-react |
| Backend | FastAPI (Python 3.11 or 3.12), SQLAlchemy |
| Database | MySQL 8 (SQLite is used automatically if no `DATABASE_URL` is set) |
| Auth | Email and password, signed bearer token (JWT) |
| ML | scikit-learn and scikit-image (HOG + SVM image classifier) |

## Modules and current status

| Module | What it does | Status |
|---|---|---|
| Authentication, My Profile | Register, log in, edit industry profile | Implemented |
| Add Waste, Add Requirement | Create, edit and delete waste listings and material requirements | Implemented |
| Rubber image classification | Suggests a material type from an uploaded image | Prototype. Small training set, accuracy not validated |
| Find Matches | Rule-based compatibility score with reasons (material, quality, quantity, location) | Implemented (rule-based, not ML) |
| Exchanges | Request, accept, reject, complete or cancel an exchange. Completing deducts quantities | Implemented |
| Cost & Route | Estimated transport cost from straight-line distance | Baseline estimate |
| Demand Forecast | Monthly forecast with model comparison, rolling backtest (MAE, RMSE, MAPE) and an approximate 80% range | Implemented, uses synthetic data |
| Sustainability | Reuse, landfill diversion, monthly trend, per-material totals and estimated CO₂ avoided | Implemented. CO₂ factor is a placeholder until a cited value is set |
| AI Assistant | Answers questions about platform data using keyword rules | Rule-based, no LLM |
| Dashboard | Summary of platform activity | Implemented |

## Project structure

```
src/                     React frontend
  pages/                 One page per sidebar item
  components/            Shared UI (AppShell, Card, Stat, LineChart, ...)
  api.js                 fetch wrapper that adds the login token
backend/
  main.py                Models, auth and API endpoints
  sustainability.py      Reuse, diversion and CO2 calculations
  forecasting.py         Monthly series, models, backtest, prediction range
  seed_demo_exchanges.py Demo data for the Sustainability page
  test_sustainability.py, test_forecasting.py
  schema_mysql.sql       MySQL schema (run in MySQL Workbench)
  data/                  Bundled synthetic COA dataset
  dataset/, models/      Image classifier training images and trained model
```

## Setup (Windows)

Requirements: Python 3.11 or 3.12 (newer versions can fail to install scikit-image), Node.js 20 LTS, and optionally MySQL 8.

### 1. Backend

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
copy .env.example .env
python -m uvicorn main:app --reload
```

- API: http://127.0.0.1:8000, interactive docs at `/docs`, health check at `/api/health`.
- With no `DATABASE_URL`, a local SQLite file is created. To use MySQL, run `schema_mysql.sql` in Workbench, then set `DATABASE_URL` and a long random `JWT_SECRET` in `backend/.env`.
- If PowerShell blocks the activate script, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.

### 2. Frontend (second terminal, from the project root)

```powershell
npm install
npm run dev
```

Open http://localhost:5173 and register an account. There are no default accounts.

`START_SYMBIOLOOP.bat` starts both servers in one step.

## Configuration (`backend/.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL connection string. Leave unset to use SQLite |
| `JWT_SECRET` | Secret used to sign login tokens. Use a long random value |
| `CO2_FACTOR_DEFAULT` | kg CO₂e avoided per kg of rubber reused. Default 1.0 is only a placeholder |
| `CO2_FACTORS_JSON` | Optional per-material factors, for example `{"NBR": 2.1}` |
| `CO2_FACTOR_SOURCE` | Citation for the factors. While empty, the UI labels CO₂ values as placeholder estimates |

Never commit `backend/.env`.

## Demo data and tests

```powershell
cd backend
python seed_demo_exchanges.py            # adds demo industries and completed exchanges
python seed_demo_exchanges.py --reset    # removes them again
python test_sustainability.py
python test_forecasting.py
```

The seed script prints the demo login details. Remove demo data before presenting results as real.

## Main API endpoints

| Area | Endpoints |
|---|---|
| Auth and profile | `/api/auth/*`, `/api/profile` |
| Waste and requirements | `/api/waste`, `/api/requirements` |
| Matching | `/api/matches` |
| Exchanges | `/api/exchanges` |
| Forecast | `/api/forecast?source=dataset or database&product=...&periods=6` |
| Sustainability | `/api/sustainability?scope=platform or mine&months=6` |
| Assistant, vision | `/api/assistant`, `/api/vision/predict` |

## Data and limitations

- The bundled certificate-of-analysis dataset (`backend/data/`) is **synthetic**: 100 records, 2 products, with quantity units not specified. It must not be presented as real company data, and forecasts built on it are demonstrations only.
- The forecast is validated by a rolling backtest, but with about 31 noisy monthly points its accuracy is low and its model choice is uncertain. The page says so.
- CO₂ figures are estimates (reused kg × emission factor) and stay labelled as placeholders until a cited factor is configured.
- Matching and the assistant are rule-based. The image classifier is trained on a very small image set.

## Planned work

1. Match, Feedback and Material tables from the SRS
2. Real route distances and a better cost model for Cost & Route
3. Semantic matching and an LLM/RAG assistant
4. Validated image classifier with a larger dataset

## Working with Git

- Branch from the latest `main`: `git checkout main`, `git pull`, `git checkout -b feature/<module-name>`.
- Open a pull request and get a teammate's review before merging. Don't push directly to `main`.
- Never commit `.venv/`, `node_modules/`, `.env` or `*.db`.