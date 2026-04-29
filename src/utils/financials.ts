import type { FinancialData } from '../types';

interface EdgarEntry {
  form: string;
  fp: string;
  end: string;
  val: number;
  filed?: string;
}

interface EdgarFacts {
  facts?: {
    'us-gaap'?: Record<string, { units?: { USD?: EdgarEntry[] } }>;
  };
}

function latestAnnual(gaap: Record<string, { units?: { USD?: EdgarEntry[] } }>, ...keys: string[]): EdgarEntry | null {
  for (const key of keys) {
    const usd = gaap[key]?.units?.USD || [];
    const annual = usd.filter((e) => e.form === '10-K' && e.fp === 'FY');
    if (annual.length) return annual.sort((a, b) => b.end.localeCompare(a.end))[0];
  }
  return null;
}

export function parseEDGARFacts(facts: EdgarFacts, ticker: string, cik: string, company: string): FinancialData {
  const gaap = facts?.facts?.['us-gaap'] || {};
  const v = (e: EdgarEntry | null): number | null => (e ? e.val : null);

  const rev = latestAnnual(gaap, 'Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet');
  const oi  = latestAnnual(gaap, 'OperatingIncomeLoss');
  const da  = latestAnnual(gaap, 'DepreciationDepletionAndAmortization', 'DepreciationAndAmortization');

  const oiVal = v(oi);
  const daVal = v(da);

  return {
    company,
    ticker,
    cik,
    fiscal_year: rev?.end?.slice(0, 4) || null,
    total_revenue: v(rev),
    ebitda: oiVal !== null && daVal !== null ? oiVal + daVal : null,
    operating_income: oiVal,
    depreciation_amortization: daVal,
    total_expenses: v(latestAnnual(gaap, 'OperatingExpenses', 'CostsAndExpenses')),
    expense_breakdown: {
      cost_of_revenue: v(latestAnnual(gaap, 'CostOfRevenue', 'CostOfGoodsSold')),
      research_and_development: v(latestAnnual(gaap, 'ResearchAndDevelopmentExpense')),
      selling_general_admin: v(latestAnnual(gaap, 'SellingGeneralAndAdministrativeExpense')),
    },
    source: 'SEC EDGAR 10-K',
    filing_date: rev?.filed || null,
  };
}

export async function fetchFromEDGAR(ticker: string): Promise<FinancialData> {
  const tickersResp = await fetch('https://data.sec.gov/files/company_tickers.json');
  if (!tickersResp.ok) throw new Error('SEC EDGAR unavailable. Try again or use manual entry.');

  const tickersData: Record<string, { ticker: string; cik_str: number; title: string }> = await tickersResp.json();

  let cik: string | null = null;
  let name = ticker;
  for (const e of Object.values(tickersData)) {
    if ((e.ticker || '').toUpperCase() === ticker.toUpperCase()) {
      cik = String(e.cik_str).padStart(10, '0');
      name = e.title || ticker;
      break;
    }
  }

  if (!cik) throw new Error(`Ticker '${ticker}' not found. Try a public US company (e.g. AAPL, MSFT).`);

  const factsResp = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`);
  if (!factsResp.ok) throw new Error('Could not load SEC EDGAR company facts.');

  const facts: EdgarFacts = await factsResp.json();
  return parseEDGARFacts(facts, ticker.toUpperCase(), cik, name);
}

export const DEMO_FINANCIALS: FinancialData = {
  company: 'Apple Inc.',
  ticker: 'AAPL',
  cik: '0000320193',
  fiscal_year: '2024',
  total_revenue: 391035000000,
  ebitda: 134661000000,
  operating_income: 123216000000,
  depreciation_amortization: 11445000000,
  total_expenses: 267984000000,
  expense_breakdown: {
    cost_of_revenue: 210352000000,
    research_and_development: 31370000000,
    selling_general_admin: 26097000000,
  },
  source: 'Demo Data (Apple FY2024)',
  filing_date: '2024-11-01',
};
