# Outside-In Diligence Tool — Backend

Python + FastAPI backend for the AI-Assisted Delivery Experiment (Team 2).

## Overview

REST API that powers the Outside-In Due Diligence tool. Two core responsibilities:
1. **Roster Analysis** — Accept Excel file uploads, parse workforce data, return structured JSON for FE visualization
2. **Financial Data Pull** — Proxy SEC EDGAR public API to retrieve 10-K financials by company ticker

## Tech Stack

- [Python 3.11+](https://www.python.org/)
- [FastAPI](https://fastapi.tiangolo.com/) — REST API framework
- [pandas](https://pandas.pydata.org/) — Excel parsing and data aggregation
- [openpyxl](https://openpyxl.readthedocs.io/) — Excel file support for pandas
- [httpx](https://www.python-httpx.org/) — async HTTP client for SEC EDGAR API
- [uvicorn](https://www.uvicorn.org/) — ASGI server

## Team

| Role | Name |
|------|------|
| PM | Jose Prendergast |
| UX | Lucas Crosbie |
| Tech Lead | Alfonso Dalix |
| QA | Alejandro Lupo |
| Dev Frontend | Joaquin Leimeter |
| **Dev Backend** | **Dehyvis Coronel Lecuna** |

## Getting Started

### Requirements

- Python 3.11+
- pip

### Installation

```bash
git clone https://github.com/alfonsodalixap/AP.Hackathon.BE.git
cd AP.Hackathon.BE
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Running locally

```bash
uvicorn main:app --reload --port 8000
```

API available at: `http://localhost:8000`
Interactive docs at: `http://localhost:8000/docs`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/roster/analyze` | Upload Excel, returns workforce JSON |
| GET | `/api/financials/{ticker}` | 10-K financials from SEC EDGAR |

## Project Structure

```
AP.Hackathon.BE/
├── main.py              ← FastAPI app + all routes
├── requirements.txt     ← Python dependencies
├── .env.example         ← Environment variable template
└── README.md
```

## CORS

Configured to allow requests from `http://localhost:5173` (Vite dev server).
Update `ALLOWED_ORIGINS` in `main.py` if the FE port differs.

## Contributing

1. Branch from `main`
2. Name branches: `feature/<short-description>` or `fix/<short-description>`
3. Open a PR with what changed and why
