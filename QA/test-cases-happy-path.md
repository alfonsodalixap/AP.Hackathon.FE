# Test Cases — Happy Path
**Outside-In Due Diligence Tool**
**Status:** Draft v3 — updated with real prototype logic
**Last updated:** 2026-04-29
**Author:** Alejandro Lupo (QA)

---

## Test Data Reference — WorkshopRoster.xlsx

| Column | Description |
|---|---|
| Employ ID | Numeric employee identifier |
| Job Title | Free text job title |
| Job Function | Department/function category (e.g. Engineering, Finance, Operations) |
| Seniority | Hierarchical level (e.g. VP, Director, Manager, Staff) |
| Country | Country of employment |
| FLC | Full Labor Cost (annual, USD) |

---

## Flow 1 — Roster Analysis

### TC-001 — Upload a valid Excel file

| Field | Detail |
|---|---|
| **Test file** | `WorkshopRoster.xlsx` |
| **Preconditions** | User has `WorkshopRoster.xlsx` available locally |
| **Steps** | 1. Navigate to the Roster Analysis screen <br> 2. Select Upload mode <br> 3. Drag or select `WorkshopRoster.xlsx` <br> 4. Confirm the upload |
| **Expected result** | File is accepted. System parses the columns, displays the correct total headcount and enables the analysis view. |

---

### TC-002 — Load roster by pasting from clipboard

| Field | Detail |
|---|---|
| **Preconditions** | User has roster data copied to the clipboard from a spreadsheet (TSV format) |
| **Steps** | 1. Navigate to the Roster Analysis screen <br> 2. Select Paste mode <br> 3. Click the paste area <br> 4. Press Ctrl+V |
| **Expected result** | System auto-detects and maps columns. A preview table shows the first 4 rows and the detected row/column count. User can confirm the upload. |

---

### TC-003 — Roster KPIs: headcount and costs

| Field | Detail |
|---|---|
| **Preconditions** | TC-001 or TC-002 passed |
| **Steps** | 1. Observe the KPI row on the Roster Analysis screen |
| **Expected result** | Displayed correctly: **Total Headcount** (total rows in file), **Total Labor Spend** (sum of FLC), **Avg Cost/Employee** (Total Labor Spend / Headcount), **Median Cost/Employee** (median of FLC values). Values are mathematically consistent. |

---

### TC-004 — Roster KPIs: senior ratio and cost concentration

| Field | Detail |
|---|---|
| **Preconditions** | TC-001 or TC-002 passed |
| **Steps** | 1. Observe the second KPI row |
| **Expected result** | Displayed: **No. of Functions** (unique Job Function values), **No. of Countries** (unique Country values), **Senior Ratio** (% headcount with Seniority = VP or Director), **Cost Concentration** (% of total spend from top 25% earners by FLC). Values consistent with file data. |

---

### TC-005 — Headcount breakdown by Job Function

| Field | Detail |
|---|---|
| **Preconditions** | TC-001 or TC-002 passed |
| **Steps** | 1. Locate the Headcount by Function bar chart |
| **Expected result** | Horizontal bar chart sorted descending. One bar per unique Job Function value. Sum of all bars equals total headcount. |

---

### TC-006 — Headcount breakdown by Seniority

| Field | Detail |
|---|---|
| **Preconditions** | TC-001 or TC-002 passed |
| **Steps** | 1. Locate the Seniority Distribution bar chart |
| **Expected result** | Horizontal bar chart ordered by org hierarchy (Executive → VP → Director → Manager → Staff). One bar per level. Sum equals total headcount. |

---

### TC-007 — Labor spend breakdown by function

| Field | Detail |
|---|---|
| **Preconditions** | TC-001 or TC-002 passed |
| **Steps** | 1. Locate the Labor Spend by Function chart |
| **Expected result** | Horizontal bar chart showing total FLC grouped by Job Function. Sum of all bars equals Total Labor Spend KPI. |

---

### TC-008 — Geographic breakdown table

| Field | Detail |
|---|---|
| **Preconditions** | TC-001 or TC-002 passed |
| **Steps** | 1. Locate the geographic breakdown table |
| **Expected result** | Table with columns: Country, Headcount, % of Total, Labor Spend. Shows up to 10 countries. Headcount totals correctly to the overall total. |

---

## Flow 2 — Financial Data

### TC-009 — Retrieve financial data by ticker (SEC EDGAR auto mode)

| Field | Detail |
|---|---|
| **Preconditions** | User has the ticker of a public company that has filed a 10-K (e.g. `AAPL`, `MSFT`) |
| **Steps** | 1. Navigate to the Financial Data screen <br> 2. Select Auto mode <br> 3. Enter the ticker <br> 4. Submit the request |
| **Expected result** | System queries SEC EDGAR and returns: company name, ticker, CIK, fiscal year, Revenue, EBITDA, Operating Income, D&A, Total Expenses and expense breakdown (Cost of Revenue, R&D, SG&A). Filing date and source "SEC EDGAR 10-K" are shown. |

---

### TC-010 — Financial data corresponds to the most recent 10-K

| Field | Detail |
|---|---|
| **Preconditions** | TC-009 passed |
| **Steps** | 1. Observe the fiscal year and filing date shown |
| **Expected result** | Data corresponds to the most recent annual 10-K filing available in SEC EDGAR, not a prior year. |

---

### TC-011 — Manual financial data entry

| Field | Detail |
|---|---|
| **Preconditions** | User has the company's financial data available |
| **Steps** | 1. Select Manual mode <br> 2. Fill in: Company Name, Fiscal Year, Total Revenue, EBITDA, Total Expenses <br> 3. (Optional) Fill in Cost of Revenue, R&D, SG&A <br> 4. Click "Save & Apply" |
| **Expected result** | Data is accepted and displayed on screen. Source is shown as "Manual Entry". System accepts currency-formatted values (with `$` and commas). |

---

## Flow 3 — Integrated Analysis

### TC-012 — Navigation gate without both sources loaded

| Field | Detail |
|---|---|
| **Preconditions** | Only one source is loaded (roster OR financials, not both) |
| **Steps** | 1. Attempt to navigate to the Integrated Analysis screen |
| **Expected result** | Screen shows a lock indicator with a checklist indicating which source is missing. Access is not possible until both sources are loaded. |

---

### TC-013 — Data period mismatch warning modal

| Field | Detail |
|---|---|
| **Preconditions** | Both sources loaded. First time accessing integrated analysis in the session. |
| **Steps** | 1. Navigate to the Integrated Analysis screen |
| **Expected result** | A modal "Check your data periods" is displayed, warning the user to verify both datasets cover comparable timeframes. User can dismiss it and continue. |

---

### TC-014 — KPI: Revenue per Employee

| Field | Detail |
|---|---|
| **Preconditions** | TC-013 passed |
| **Steps** | 1. Locate the Revenue per Employee KPI card |
| **Expected result** | Value displayed equals `Total Revenue (financials) / Total Headcount (roster)`. Result is mathematically correct. |

---

### TC-015 — KPI: Labor Spend as % of Revenue

| Field | Detail |
|---|---|
| **Preconditions** | TC-013 passed |
| **Steps** | 1. Locate the Labor Spend as % of Revenue KPI card |
| **Expected result** | Value equals `Total Labor Spend / Total Revenue * 100`. If result is below 1%, it is shown with decimals (not as "0%"). |

---

### TC-016 — KPI: EBITDA Margin

| Field | Detail |
|---|---|
| **Preconditions** | TC-013 passed |
| **Steps** | 1. Locate the EBITDA Margin KPI card |
| **Expected result** | Value equals `EBITDA / Total Revenue * 100`. Result is mathematically correct. |

---

### TC-017 — Comparison banner — summary of both sources

| Field | Detail |
|---|---|
| **Preconditions** | TC-013 passed |
| **Steps** | 1. Observe the top banner on the Integrated Analysis screen |
| **Expected result** | Banner shows on the left: roster data (file name, headcount, countries); on the right: financial data (company, fiscal year, revenue, EBITDA margin). Export to PPT button is visible and enabled. |

---

### TC-018 — Seniority pyramid in integrated analysis

| Field | Detail |
|---|---|
| **Preconditions** | TC-013 passed |
| **Steps** | 1. Locate the seniority pyramid visualization |
| **Expected result** | Horizontal bar chart ordered by org hierarchy (most senior at top). Distribution is consistent with the loaded roster data. |

---

### TC-019 — Value creation opportunity: senior layer rationalization

| Field | Detail |
|---|---|
| **Preconditions** | TC-013 passed. Roster has VP + Director > 20% of total headcount. |
| **Steps** | 1. Locate the Value Creation Opportunities section |
| **Expected result** | "Senior layer rationalization" opportunity is shown with the current VP/Director percentage and an estimated impact calculated as a 15% reduction of that group multiplied by their average FLC. |

---

### TC-020 — Export analysis to PowerPoint

| Field | Detail |
|---|---|
| **Preconditions** | TC-013 passed |
| **Steps** | 1. Click the "Export to PPT" button in the top banner |
| **Expected result** | A `.pptx` file is generated and downloaded with the integrated analysis slides. File downloads correctly in the browser. |

---

## Open Questions (to confirm with dev team)

| # | Question | Impacts |
|---|---|---|
| 1 | Which Excel columns are mandatory vs optional for parsing? | TC-001, TC-002 |
| 2 | Is FLC used as-is or is there any transformation applied? | TC-003, TC-007 |
| 3 | If SEC EDGAR does not respond within 15 seconds — is there an automatic fallback to manual entry? | TC-009 |
| 4 | Do Value Creation Opportunities apply when financial data is entered manually? | TC-019 |
| 5 | Does the PPT export include roster data or only the integrated analysis? | TC-020 |
