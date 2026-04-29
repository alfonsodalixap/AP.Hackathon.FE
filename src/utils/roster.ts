import type { RosterData } from '../types';

function norm(s: string): string {
  return String(s).trim().toLowerCase();
}

function findCol(headers: string[], ...kws: string[]): string | null {
  for (const kw of kws) {
    const h = headers.find((h) => h.includes(kw));
    if (h) return h;
  }
  return null;
}

export function processRoster(rows: Record<string, unknown>[]): RosterData {
  if (!rows.length) throw new Error('No data found in file.');

  const headers = Object.keys(rows[0]).map(norm);
  const fnCol   = findCol(headers, 'job function', 'function', 'department', 'dept');
  const snCol   = findCol(headers, 'seniority level', 'seniority', 'level', 'grade');
  const ctCol   = findCol(headers, 'country', 'location', 'region');
  const costCol = findCol(headers, 'flc', 'fully loaded', 'fully-loaded', 'cost', 'salary', 'compensation', 'spend');

  const normalized = rows.map((r) => {
    const nr: Record<string, unknown> = {};
    Object.entries(r).forEach(([k, v]) => { nr[norm(k)] = v; });
    return {
      fn:   String(fnCol   ? (nr[fnCol]   ?? 'Unknown') : 'Unknown').trim() || 'Unknown',
      sn:   String(snCol   ? (nr[snCol]   ?? 'Unknown') : 'Unknown').trim() || 'Unknown',
      ct:   String(ctCol   ? (nr[ctCol]   ?? 'Unknown') : 'Unknown').trim() || 'Unknown',
      cost: parseFloat(String(costCol ? (nr[costCol] ?? '0') : '0').replace(/[^0-9.-]/g, '')) || 0,
    };
  });

  const byFn: Record<string, number> = {};
  const bySn: Record<string, number> = {};
  const byCt: Record<string, number> = {};
  const costByFn: Record<string, number> = {};
  const costBySn: Record<string, number> = {};
  const costByCt: Record<string, number> = {};
  let totalSpend = 0;

  for (const { fn, sn, ct, cost } of normalized) {
    byFn[fn] = (byFn[fn] || 0) + 1;
    bySn[sn] = (bySn[sn] || 0) + 1;
    byCt[ct] = (byCt[ct] || 0) + 1;
    costByFn[fn] = (costByFn[fn] || 0) + cost;
    costBySn[sn] = (costBySn[sn] || 0) + cost;
    costByCt[ct] = (costByCt[ct] || 0) + cost;
    totalSpend += cost;
  }

  const total = normalized.length;

  const sortedCosts = normalized.map((r) => r.cost).sort((a, b) => a - b);
  const mid = Math.floor(sortedCosts.length / 2);
  const medianCost =
    sortedCosts.length % 2 === 0
      ? (sortedCosts[mid - 1] + sortedCosts[mid]) / 2
      : sortedCosts[mid];

  const seniorKws = ['vp', 'vice president', 'director', 'executive', 'president', 'c-level', 'ceo', 'cto', 'cfo', 'coo', 'chief'];
  const seniorCount = normalized.filter((r) =>
    seniorKws.some((kw) => r.sn.toLowerCase().includes(kw))
  ).length;
  const seniorRatio = total ? Math.round((seniorCount / total) * 100) : 0;

  const topN = Math.max(1, Math.ceil(total * 0.25));
  const topCostSum = [...sortedCosts].reverse().slice(0, topN).reduce((s, v) => s + v, 0);
  const costConcentration = totalSpend ? Math.round((topCostSum / totalSpend) * 100) : 0;

  return {
    total_headcount: total,
    total_labor_spend: totalSpend,
    avg_cost_per_employee: total ? totalSpend / total : 0,
    median_cost: medianCost,
    num_countries: Object.keys(byCt).length,
    senior_count: seniorCount,
    senior_ratio: seniorRatio,
    cost_concentration: costConcentration,
    by_function: byFn,
    by_seniority: bySn,
    by_country: byCt,
    cost_by_function: costByFn,
    cost_by_seniority: costBySn,
    cost_by_country: costByCt,
  };
}

export const DEMO_ROSTER: RosterData = {
  total_headcount: 500,
  total_labor_spend: 52500000,
  avg_cost_per_employee: 105000,
  median_cost: 82000,
  num_countries: 5,
  senior_count: 105,
  senior_ratio: 21,
  cost_concentration: 58,
  by_function: { Engineering: 180, Sales: 95, Operations: 80, Product: 60, Marketing: 45, Finance: 25, HR: 15 },
  by_seniority: { 'VP / Director': 35, 'Senior Manager': 70, Manager: 100, Senior: 145, Analyst: 100, Associate: 50 },
  by_country: { 'United States': 230, India: 120, 'United Kingdom': 65, Germany: 50, Brazil: 35 },
  cost_by_function: { Engineering: 21000000, Sales: 11400000, Operations: 7600000, Product: 6000000, Marketing: 3600000, Finance: 2100000, HR: 800000 },
  cost_by_seniority: { 'VP / Director': 9100000, 'Senior Manager': 11900000, Manager: 14000000, Senior: 12325000, Analyst: 6000000, Associate: 2500000 },
  cost_by_country: { 'United States': 29900000, India: 8400000, 'United Kingdom': 7475000, Germany: 5250000, Brazil: 1575000 },
};
