# Outside-In Diligence Tool — Opening Prompt for Claude Code

Use this prompt to kick off your Claude Code session. It gives Claude the full context it needs to build the tool correctly from the first message — no back-and-forth needed.

---

## Opening Prompt

Paste this into Claude Code as your first message:

---

```
You are building a web tool called Outside-In Diligence Tool for AlixPartners practitioners.

## What this tool does

Practitioners doing M&A or competitive due diligence often can't access client data directly. They need to build a baseline picture of a target company using only public sources. This tool brings together two public data sources into one coherent view.

## The two data sources

**1. LinkedIn Roster Export (Excel file)**
An Excel file extracted from LinkedIn with one row per employee. The relevant columns are:
- Job Title
- Country
- Job Function
- Seniority
- Fully Loaded Cost (annualized salary + employer taxes, in dollars)

The column names may vary slightly in the real file (e.g. "Seniority Level" instead of "Seniority") — handle this with fuzzy, case-insensitive matching.

**2. 10-K Financial Filing**
Annual financial reports filed by public companies with the SEC. The data lives at:
- Ticker → CIK: https://data.sec.gov/files/company_tickers.json
- Company facts: https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json

Key metrics to extract from the latest 10-K (FY, form type = "10-K", fp = "FY"):
- Total Revenue (try: Revenues, RevenueFromContractWithCustomerExcludingAssessedTax, SalesRevenueNet)
- EBITDA = OperatingIncomeLoss + DepreciationDepletionAndAmortization
- Total Expenses (try: OperatingExpenses, CostsAndExpenses)
- Expense breakdown: CostOfRevenue, ResearchAndDevelopmentExpense, SellingGeneralAndAdministrativeExpense

**Important:** The SEC EDGAR fetch can fail or be slow. The tool must support a manual entry fallback where practitioners can paste or type the key financial figures directly from the 10-K PDF.

## The three screens

### Screen 1 — Roster Analysis
- Upload zone for the Excel file (drag and drop supported)
- After upload, show:
  - KPI strip: Total Headcount, Total Labor Spend, Avg Cost/Employee, # of Functions
  - Horizontal bar chart: Headcount by Function (sorted descending)
  - Horizontal bar chart: Seniority Distribution (sorted by seniority hierarchy: VP/Director → Manager → Senior → Analyst → Associate)
  - Horizontal bar chart: Labor Spend by Function
  - Table: Geographic breakdown — Country, Headcount, % of Total, Labor Spend (top 10)

### Screen 2 — Financial Data
Two modes (toggle between them):

**Auto mode:** Enter a ticker symbol → fetch from SEC EDGAR → display company name, fiscal year, Revenue, EBITDA, Operating Income, D&A, expense breakdown (CoGS, R&D, SG&A as % of revenue).

**Manual mode:** If SEC EDGAR fails or the company is private, practitioners paste values directly from the 10-K:
- Company Name
- Fiscal Year
- Total Revenue ($) — paste with commas/dollar signs, strip them automatically
- EBITDA ($)
- Total Expenses ($)
- Optional: Cost of Revenue, R&D, SG&A

### Screen 3 — Integrated Analysis
Only accessible when both datasets are loaded. Shows:
- Revenue per Employee
- Labor Spend as % of Revenue
- EBITDA Margin
- Seniority Pyramid (horizontal bar chart, sorted by hierarchy, opacity increases toward junior levels)
- Labor Spend by Seniority (horizontal bar chart)
- Key Insights grid: Top Function by Headcount, Top Function by Spend, Largest Seniority Band, Geographic Footprint

## Stack

**Backend:** Python + FastAPI
- POST /api/roster/analyze — receives Excel file, returns JSON with all aggregations
- GET /api/financials/{ticker} — proxies SEC EDGAR, returns structured financial data
- GET /api/health — healthcheck
- CORS: allow localhost:5173 and localhost:5174

**Frontend:** React 19 + TypeScript + Vite
- @tanstack/react-query for data fetching
- recharts for all charts
- xlsx for client-side Excel parsing (as fallback or pre-processing)
- @alixpartners/ui-components for AP design system

## Design

Use the AlixPartners design system:
- Primary green: #498E2B
- Active green: #5CB335
- Dark nav background: #333333
- Nav border bottom: 3px solid #498E2B
- Card background: white, border-radius: 8px
- Page background: #f7f7f7
- Font: Segoe UI, Arial

## Success criteria

The tool is done when:
1. A practitioner can upload the real Excel file → see correct headcount and spend breakdowns
2. A practitioner can search AAPL → see correct FY revenue from SEC EDGAR
3. If SEC EDGAR fails, they can manually enter the numbers and the Integrated screen still works
4. The Integrated screen shows meaningful cross-analysis when both datasets are loaded

Start by building the FastAPI backend. Create main.py, requirements.txt, .env.example, and README.md. Then scaffold the React frontend with the 3-tab structure and connect it to the backend.
```

---

## Refinement prompts (use as you iterate)

### After first version — push for UX quality
```
The seniority chart should sort by org hierarchy, not alphabetically or by count. The correct order from top to bottom is: Executive / C-level → VP → Director → Senior Manager → Manager → Senior → Analyst → Associate → Entry Level → Intern. Apply this sorting everywhere seniority appears.
```

### If SEC EDGAR is slow
```
The SEC EDGAR company facts JSON for large companies can be 10–50MB. Add a clear loading state with a message like "Fetching 10-K data from SEC EDGAR — this can take up to 20 seconds for large companies." Also add a timeout of 30 seconds with a graceful error message that suggests switching to manual entry.
```

### For the manual entry paste behavior
```
In the manual entry form, when a user pastes a value like "$391,035,000,000" or "391,035" (thousands), the field should strip all non-numeric characters except the decimal point before saving. Show a preview of the parsed value below the field so the user can verify.
```

### For number formatting
```
All monetary values should be formatted as follows:
- >= $1T → $1.2T
- >= $1B → $1.4B  
- >= $1M → $142M
- >= $1K → $142K
- < $1K → $142
Never show raw numbers like $391035000000. Apply this everywhere in the UI.
```

### For the integrated screen
```
The Revenue per Employee metric and Labor as % of Revenue are the most important insights. Make these visually prominent — larger font, distinct card style. Add a one-line interpretation below each: e.g. "High vs. industry average" or "Labor-intensive ratio."
```

### End-of-day notes prompt
```
Summarize what we built today, what worked well in our prompting approach, what we had to redo, and what the most effective prompts were. Format this as a short retrospective I can paste into our team Coda page.
```

---

## Key technical notes for developers

**Excel column matching (BE):**
The BE uses fuzzy case-insensitive matching. If a column name *contains* the keyword, it matches:
- "job function" matches "Job Function (LinkedIn)", "Function", "Department"
- "fully loaded" matches "Fully Loaded Compensation", "Fully Loaded Cost (Annual)"

**SEC EDGAR concepts by priority:**
```
Revenue:    Revenues → RevenueFromContractWithCustomerExcludingAssessedTax → SalesRevenueNet
EBITDA:     OperatingIncomeLoss + DepreciationDepletionAndAmortization (approximation)
Expenses:   OperatingExpenses → CostsAndExpenses
CoGS:       CostOfRevenue → CostOfGoodsSold
R&D:        ResearchAndDevelopmentExpense
SG&A:       SellingGeneralAndAdministrativeExpense
```

**API response shape — POST /api/roster/analyze:**
```json
{
  "total_headcount": 500,
  "total_labor_spend": 52500000,
  "avg_cost_per_employee": 105000,
  "by_function": { "Engineering": 180, "Sales": 95, ... },
  "by_seniority": { "Manager": 100, "Senior": 145, ... },
  "by_country": { "United States": 230, "India": 120, ... },
  "cost_by_function": { "Engineering": 21000000, ... },
  "cost_by_seniority": { "Manager": 14000000, ... },
  "cost_by_country": { "United States": 29900000, ... }
}
```

**API response shape — GET /api/financials/{ticker}:**
```json
{
  "company": "Apple Inc.",
  "ticker": "AAPL",
  "fiscal_year": "2024",
  "total_revenue": 391035000000,
  "ebitda": 130000000000,
  "operating_income": 123216000000,
  "depreciation_amortization": 11445000000,
  "total_expenses": 267984000000,
  "expense_breakdown": {
    "cost_of_revenue": 210352000000,
    "research_and_development": 31370000000,
    "selling_general_admin": 26097000000
  },
  "source": "SEC EDGAR 10-K",
  "filing_date": "2024-11-01"
}
```

---

*Team 2 — Outside-In Due Diligence — April 30, 2026*
