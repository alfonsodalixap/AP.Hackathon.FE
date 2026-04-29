export interface RosterData {
  total_headcount: number;
  total_labor_spend: number;
  avg_cost_per_employee: number;
  median_cost: number;
  num_countries: number;
  senior_count: number;
  senior_ratio: number;
  cost_concentration: number;
  by_function: Record<string, number>;
  by_seniority: Record<string, number>;
  by_country: Record<string, number>;
  cost_by_function: Record<string, number>;
  cost_by_seniority: Record<string, number>;
  cost_by_country: Record<string, number>;
}

export interface ExpenseBreakdown {
  cost_of_revenue: number | null;
  research_and_development: number | null;
  selling_general_admin: number | null;
}

export interface FinancialData {
  company: string;
  ticker: string;
  cik: string | null;
  fiscal_year: string | null;
  total_revenue: number | null;
  ebitda: number | null;
  operating_income: number | null;
  depreciation_amortization: number | null;
  total_expenses: number | null;
  expense_breakdown: ExpenseBreakdown;
  source: string;
  filing_date: string | null;
}

export interface Opportunity {
  title: string;
  detail: string;
  impact: string | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface AIState {
  text: string | null;
  loading: boolean;
  chat: ChatMessage[];
}

export interface PasteState {
  raw: Record<string, string>[] | null;
  headers: string[] | null;
  preview: Record<string, string>[] | null;
}

export interface ManualFinancials {
  company: string;
  fiscal_year: string;
  total_revenue: string;
  ebitda: string;
  total_expenses: string;
  cost_of_revenue: string;
  rd: string;
  sga: string;
}
