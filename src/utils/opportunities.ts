import type { RosterData, FinancialData, Opportunity } from '../types';
import { fmt } from './format';

function topFn(rd: RosterData) {
  const [name, count] = Object.entries(rd.by_function).sort((a, b) => b[1] - a[1])[0] || [];
  return name ? { name, count, pct: Math.round((count / rd.total_headcount) * 100) } : null;
}

function topFnSpend(rd: RosterData) {
  const [name, cost] = Object.entries(rd.cost_by_function).sort((a, b) => b[1] - a[1])[0] || [];
  return name ? { name, cost, pct: Math.round((cost / rd.total_labor_spend) * 100) } : null;
}

export function computeOpportunities(rd: RosterData, fd: FinancialData): Opportunity[] {
  const opps: Opportunity[] = [];
  const rev = fd.total_revenue;
  const labor = rd.total_labor_spend;
  const hc = rd.total_headcount;
  const fn = topFn(rd);
  const avgCost = rd.avg_cost_per_employee;
  const revPerEmp = rev && hc ? Math.round(rev / hc) : null;

  if (rd.senior_ratio > 20) {
    const seniorSpend = (rd.cost_concentration / 100) * labor;
    const saving = Math.round(seniorSpend * 0.15);
    opps.push({
      title: `Senior layer rationalization (${rd.senior_ratio}% VP+ of workforce)`,
      detail: `A ${rd.senior_ratio}% VP/Director ratio is above typical benchmarks (10–15% for most companies). A 15% reduction in senior headcount could free up significant spend without touching delivery capacity.`,
      impact: `Est. savings: ${fmt(saving)} / year`,
    });
  }

  if (fn && fn.pct > 35) {
    const excess = fn.count - Math.round(hc * 0.25);
    const saving = excess * avgCost;
    opps.push({
      title: `${fn.name} function concentration (${fn.pct}% of headcount)`,
      detail: `${fn.name} dominates the org at ${fn.pct}% of staff — well above the typical 20–25% ceiling for a single function. Benchmarking against peers could reveal whether this reflects strategic over-investment or structural bloat.`,
      impact: excess > 0 ? `Rightsizing to 25% = ~${excess} roles, ${fmt(saving)} in potential savings` : null,
    });
  }

  if (rd.cost_concentration > 60) {
    const topQCost = (rd.cost_concentration / 100) * labor;
    opps.push({
      title: `Top-quartile compensation review (${rd.cost_concentration}% of spend in top 25% of earners)`,
      detail: `The top 25% of earners account for ${rd.cost_concentration}% of total labor spend — a compressed pay pyramid where a small number of senior roles drive outsized cost. Review compensation benchmarks against industry and probe in management interviews.`,
      impact: `Top-quartile envelope: ${fmt(topQCost)}`,
    });
  }

  const usCost = rd.cost_by_country?.['United States'] || rd.cost_by_country?.['US'] || 0;
  const usHc   = rd.by_country?.['United States'] || rd.by_country?.['US'] || 0;
  if (rd.num_countries > 1 && usCost > labor * 0.6 && usHc > 0) {
    opps.push({
      title: `Geographic labor arbitrage (${Math.round((usCost / labor) * 100)}% of spend in US)`,
      detail: `US-based talent is significantly more expensive than equivalent roles in the existing international locations. Shifting 15–20% of US roles to lower-cost geographies where the company already operates could materially reduce the cost base.`,
      impact: `20% shift could yield ~${fmt(Math.round(usCost * 0.2))} in annual savings`,
    });
  }

  const sga = fd.expense_breakdown?.selling_general_admin;
  if (sga && rev && sga / rev > 0.15) {
    const sgaPct = Math.round((sga / rev) * 100);
    const gap = sga - Math.round(rev * 0.1);
    opps.push({
      title: `SG&A efficiency gap (${sgaPct}% of revenue vs. ~10% benchmark)`,
      detail: `SG&A at ${sgaPct}% of revenue exceeds the ~10% benchmark for companies at this scale. Cross-referencing the roster's overhead functions (HR, Finance, Legal) against this spend line can identify whether the inefficiency is headcount-driven or vendor/infrastructure cost.`,
      impact: `Closing to 10% benchmark: ${fmt(gap)} in potential reduction`,
    });
  }

  const rdExp = fd.expense_breakdown?.research_and_development;
  if (rdExp && rev && rdExp / rev > 0.08 && revPerEmp && revPerEmp > 300000) {
    opps.push({
      title: `R&D productivity assessment (${Math.round((rdExp / rev) * 100)}% of revenue)`,
      detail: `At ${fmt(rdExp)} in R&D spend and ${fmt(revPerEmp)} revenue per employee, the question is whether R&D investment is translating to product differentiation and pricing power. Benchmarking output metrics against this spend level is a key diligence workstream.`,
      impact: null,
    });
  }

  if (revPerEmp && revPerEmp < 100000) {
    opps.push({
      title: `Revenue per employee gap vs. peers (${fmt(revPerEmp)} per head)`,
      detail: `At ${fmt(revPerEmp)} revenue per employee, this workforce is significantly less productive than industry averages ($150K–$300K+). Automation, process re-engineering, or headcount right-sizing are likely levers to close the gap.`,
      impact: rev ? `Closing to $200K/head implies a path to ${Math.round(rev / 200000).toLocaleString()} optimal headcount vs. current ${hc.toLocaleString()}` : null,
    });
  }

  if (opps.length === 0) {
    opps.push({
      title: 'Functional headcount benchmarking',
      detail: `With the current dataset, compare ${fn?.name || 'top function'} headcount ratios against direct peers to identify structural inefficiencies.`,
      impact: null,
    });
  }

  return opps;
}

export { topFn, topFnSpend };
