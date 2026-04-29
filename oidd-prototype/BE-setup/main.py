from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import httpx
import io
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Outside-In Diligence API", version="0.1.0")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SEC_BASE = os.getenv("SEC_EDGAR_BASE_URL", "https://data.sec.gov")
SEC_SEARCH = os.getenv("SEC_EDGAR_SEARCH_URL", "https://efts.sec.gov")

# SEC requires a User-Agent header with contact info
SEC_HEADERS = {
    "User-Agent": "AlixPartners Hackathon hackathon@alixpartners.com",
    "Accept-Encoding": "gzip, deflate",
}

# Expected Excel columns (case-insensitive match)
ROSTER_COLUMNS = {
    "job title": "job_title",
    "country": "country",
    "job function": "job_function",
    "seniority": "seniority",
    "fully loaded cost": "fully_loaded_cost",
}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/roster/analyze")
async def analyze_roster(file: UploadFile = File(...)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be .xlsx or .xls")

    contents = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse Excel file: {str(e)}")

    # Normalize column names
    df.columns = [c.strip().lower() for c in df.columns]
    col_map = {}
    for raw, normalized in ROSTER_COLUMNS.items():
        match = next((c for c in df.columns if raw in c), None)
        if match:
            col_map[match] = normalized
    df.rename(columns=col_map, inplace=True)

    required = ["job_title", "country", "job_function", "seniority", "fully_loaded_cost"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing columns: {missing}. Found: {list(df.columns)}"
        )

    # Clean cost column
    df["fully_loaded_cost"] = pd.to_numeric(df["fully_loaded_cost"], errors="coerce").fillna(0)

    total = len(df)
    total_spend = int(df["fully_loaded_cost"].sum())

    def counts_and_costs(col):
        counts = df[col].value_counts().to_dict()
        costs = df.groupby(col)["fully_loaded_cost"].sum().astype(int).to_dict()
        return {str(k): v for k, v in counts.items()}, {str(k): v for k, v in costs.items()}

    by_function, cost_by_function = counts_and_costs("job_function")
    by_seniority, cost_by_seniority = counts_and_costs("seniority")
    by_country, cost_by_country = counts_and_costs("country")

    return {
        "total_headcount": total,
        "total_labor_spend": total_spend,
        "avg_cost_per_employee": int(total_spend / total) if total else 0,
        "by_function": by_function,
        "by_seniority": by_seniority,
        "by_country": by_country,
        "cost_by_function": cost_by_function,
        "cost_by_seniority": cost_by_seniority,
        "cost_by_country": cost_by_country,
    }


@app.get("/api/financials/{ticker}")
async def get_financials(ticker: str):
    ticker = ticker.upper().strip()

    async with httpx.AsyncClient(headers=SEC_HEADERS, timeout=15.0) as client:
        # Step 1: resolve ticker → CIK
        try:
            tickers_resp = await client.get(f"{SEC_BASE}/files/company_tickers.json")
            tickers_resp.raise_for_status()
            tickers_data = tickers_resp.json()
        except Exception:
            raise HTTPException(status_code=502, detail="SEC EDGAR unavailable — use manual entry")

        cik = None
        company_name = None
        for entry in tickers_data.values():
            if entry.get("ticker", "").upper() == ticker:
                cik = str(entry["cik_str"]).zfill(10)
                company_name = entry.get("title", ticker)
                break

        if not cik:
            raise HTTPException(status_code=404, detail=f"Ticker '{ticker}' not found in SEC EDGAR")

        # Step 2: get company facts
        try:
            facts_resp = await client.get(f"{SEC_BASE}/api/xbrl/companyfacts/CIK{cik}.json")
            facts_resp.raise_for_status()
            facts = facts_resp.json()
        except Exception:
            raise HTTPException(status_code=502, detail="Could not fetch SEC EDGAR company facts")

    us_gaap = facts.get("facts", {}).get("us-gaap", {})

    def latest_annual(concept_key):
        concept = us_gaap.get(concept_key, {})
        units = concept.get("units", {})
        usd = units.get("USD", [])
        annual = [e for e in usd if e.get("form") == "10-K" and e.get("fp") == "FY"]
        if not annual:
            return None
        annual.sort(key=lambda x: x.get("end", ""), reverse=True)
        return annual[0]

    # Revenue — try multiple common concepts
    revenue_entry = (
        latest_annual("Revenues")
        or latest_annual("RevenueFromContractWithCustomerExcludingAssessedTax")
        or latest_annual("SalesRevenueNet")
    )

    # EBITDA approximation: Operating Income + D&A
    op_income_entry = latest_annual("OperatingIncomeLoss")
    da_entry = latest_annual("DepreciationDepletionAndAmortization") or latest_annual("DepreciationAndAmortization")

    # Expenses
    expenses_entry = (
        latest_annual("OperatingExpenses")
        or latest_annual("CostsAndExpenses")
    )
    cogs_entry = latest_annual("CostOfRevenue") or latest_annual("CostOfGoodsSold")
    rd_entry = latest_annual("ResearchAndDevelopmentExpense")
    sga_entry = latest_annual("SellingGeneralAndAdministrativeExpense")

    def val(entry):
        return int(entry["val"]) if entry else None

    def fiscal_year(entry):
        return entry.get("end", "")[:4] if entry else None

    revenue = val(revenue_entry)
    op_income = val(op_income_entry)
    da = val(da_entry)
    ebitda = (op_income + da) if (op_income is not None and da is not None) else None

    return {
        "company": company_name,
        "ticker": ticker,
        "cik": cik,
        "fiscal_year": fiscal_year(revenue_entry),
        "total_revenue": revenue,
        "ebitda": ebitda,
        "operating_income": op_income,
        "depreciation_amortization": da,
        "total_expenses": val(expenses_entry),
        "expense_breakdown": {
            "cost_of_revenue": val(cogs_entry),
            "research_and_development": val(rd_entry),
            "selling_general_admin": val(sga_entry),
        },
        "source": "SEC EDGAR 10-K",
        "filing_date": revenue_entry.get("filed") if revenue_entry else None,
    }
