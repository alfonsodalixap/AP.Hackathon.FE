import type { RosterData, FinancialData } from '../types';
import { fmt } from './format';
import { topFn, topFnSpend } from './opportunities';
import { sortBySeniority } from './seniority';

function topSn(rd: RosterData) {
  const [name, count] = Object.entries(rd.by_seniority).sort((a, b) => b[1] - a[1])[0] || [];
  return name ? { name, count, pct: Math.round((count / rd.total_headcount) * 100) } : null;
}

function topCountry(rd: RosterData) {
  const [name, count] = Object.entries(rd.by_country).sort((a, b) => b[1] - a[1])[0] || [];
  return name ? { name, pct: Math.round((count / rd.total_headcount) * 100) } : null;
}

export function buildRosterNarrative(rd: RosterData): string {
  const fn = topFn(rd);
  const sn = topSn(rd);
  const co = topCountry(rd);

  const model = (() => {
    const f = (fn?.name || '').toLowerCase();
    if (f.includes('engineer') || f.includes('tech') || f.includes('software')) return 'product-driven or technology business';
    if (f.includes('sales') || f.includes('commercial')) return 'commercial or sales-driven organization';
    if (f.includes('oper') || f.includes('ops') || f.includes('delivery')) return 'operations or delivery-intensive model';
    if (f.includes('research') || f.includes('science')) return 'research-intensive organization';
    return 'diversified workforce model';
  })();

  const snLine = rd.senior_ratio > 25
    ? `Senior leadership (VP+) is ${rd.senior_ratio}% of headcount — unusually top-heavy, which may inflate the cost baseline or reflect a holding company structure.`
    : rd.senior_ratio < 10
    ? `At ${rd.senior_ratio}% VP+, the org is relatively flat — consistent with an execution-focused delivery model.`
    : `Senior leadership at ${rd.senior_ratio}% of headcount sits within a normal range.`;

  const costLine = rd.cost_concentration > 65
    ? `Cost is highly concentrated: top-quartile earners account for ${rd.cost_concentration}% of total spend — senior and executive compensation dominates the cost envelope.`
    : rd.cost_concentration < 45
    ? `Compensation is well-distributed (top quartile = ${rd.cost_concentration}% of spend), consistent with a junior or uniform pay structure.`
    : `Cost spread is moderate (top quartile = ${rd.cost_concentration}% of spend), typical for a professional services workforce.`;

  const gap = rd.avg_cost_per_employee > 0 ? Math.round(((rd.avg_cost_per_employee - rd.median_cost) / rd.avg_cost_per_employee) * 100) : 0;
  const medLine = gap > 20
    ? `The ${gap}% gap between mean (${fmt(rd.avg_cost_per_employee)}) and median (${fmt(rd.median_cost)}) confirms high-earner skew — a handful of senior roles pulls the average up significantly.`
    : `Mean (${fmt(rd.avg_cost_per_employee)}) and median (${fmt(rd.median_cost)}) are closely aligned, suggesting uniform compensation across levels.`;

  const geoLine = rd.num_countries > 5
    ? `The workforce spans ${rd.num_countries} countries with ${co?.name} as the primary hub (${co?.pct}%) — notable geographic dispersion with potential labor arbitrage opportunity.`
    : `Operations are concentrated in ${rd.num_countries} ${rd.num_countries === 1 ? 'country' : 'countries'}, with ${co?.name} at ${co?.pct}% of headcount.`;

  return `This ${rd.total_headcount.toLocaleString()}-person roster is consistent with a ${model}. ${fn?.name} leads at ${fn?.pct}% of headcount, and ${sn?.name} is the largest seniority band (${sn?.pct}% of staff).\n\n${snLine} ${costLine}\n\n${medLine} ${geoLine}`;
}

export function buildIntegratedNarrative(rd: RosterData, fd: FinancialData): string {
  const fn = topFn(rd);
  const fnSpend = topFnSpend(rd);
  const revPerEmp = fd.total_revenue && rd.total_headcount ? Math.round(fd.total_revenue / rd.total_headcount) : null;
  const laborPct = fd.total_revenue ? Math.round((rd.total_labor_spend / fd.total_revenue) * 100) : null;
  const ebitdaPct = fd.ebitda && fd.total_revenue ? Math.round((fd.ebitda / fd.total_revenue) * 100) : null;

  const revLine = !revPerEmp ? '' : revPerEmp > 500000
    ? `Revenue per employee of ${fmt(revPerEmp)} is exceptionally high — characteristic of software, financial services, or asset-light models with strong operating leverage.`
    : revPerEmp > 200000
    ? `Revenue per employee of ${fmt(revPerEmp)} is above average — this workforce generates solid output per head.`
    : revPerEmp > 80000
    ? `Revenue per employee of ${fmt(revPerEmp)} is mid-range — consistent with services, distribution, or mixed-model businesses.`
    : `Revenue per employee of ${fmt(revPerEmp)} is relatively low — common in labor-intensive services or early-stage growth.`;

  const laborLine = laborPct === null ? '' : laborPct < 10
    ? `Labor at ${laborPct}% of revenue is exceptionally lean — headcount is not the primary cost driver. Focus diligence on COGS, capital, or R&D instead.`
    : laborPct < 25
    ? `Labor at ${laborPct}% of revenue is manageable — headcount growth can be absorbed without immediately threatening margins.`
    : laborPct < 50
    ? `Labor at ${laborPct}% of revenue is significant — headcount decisions directly shape profitability, and any workforce action would have material EBITDA impact.`
    : `Labor at ${laborPct}% of revenue is the dominant cost driver — restructuring levers here would have outsized effect.`;

  const ebitdaLine = ebitdaPct === null ? '' : ebitdaPct > 30
    ? `EBITDA margin of ${ebitdaPct}% reflects strong operational leverage — this business can absorb investment without near-term margin risk.`
    : ebitdaPct > 15
    ? `EBITDA margin of ${ebitdaPct}% is solid but leaves room for efficiency improvement.`
    : ebitdaPct > 0
    ? `EBITDA margin of ${ebitdaPct}% is thin — the cost structure warrants scrutiny across all workforce scenarios.`
    : `EBITDA margin is near zero or negative — the business is in investment or turnaround mode.`;

  const oppItems: string[] = [];
  if (rd.senior_ratio > 20) oppItems.push(`senior-layer rationalization (${rd.senior_ratio}% VP+ of headcount)`);
  if (rd.cost_concentration > 60) oppItems.push(`top-quartile compensation review (${rd.cost_concentration}% of spend in top 25%)`);
  if (fn && fnSpend && fn.name !== fnSpend.name) oppItems.push(`rebalancing ${fnSpend.name} (highest spend) vs. ${fn.name} (largest headcount) allocation`);
  if (rd.num_countries > 5) oppItems.push(`geographic footprint consolidation (${rd.num_countries} countries)`);
  if (!oppItems.length) oppItems.push(`headcount rebalancing in ${fn?.name}, which represents ${fn?.pct}% of staff`);

  return `Cross-referencing ${fd.company}'s ${rd.total_headcount.toLocaleString()} employees against FY${fd.fiscal_year} financials:\n\n${revLine} ${laborLine}\n\n${ebitdaLine}\n\nPotential improvement areas worth modeling: ${oppItems.join('; ')}.`;
}

export function buildRosterAnswer(rd: RosterData, q: string): string {
  const lq = q.toLowerCase();
  const fn = topFn(rd);
  const fnSpend = topFnSpend(rd);
  const sn = topSn(rd);
  const co = topCountry(rd);

  if (lq.includes('seniority')) {
    const sorted = sortBySeniority(Object.entries(rd.by_seniority)).slice(0, 3).map(([k, v]) => `${k} (${v})`).join(', ');
    return `Dominant band: ${sn?.name} (${sn?.pct}%). Top three: ${sorted}. ${rd.senior_ratio > 20 ? `High VP+ ratio (${rd.senior_ratio}%) is notable — flag this in your analysis as potentially top-heavy.` : 'Pyramid shape appears balanced.'}`;
  }
  if (lq.includes('concentrat') || lq.includes('distribut')) {
    return `Top-quartile earners hold ${rd.cost_concentration}% of total spend. ${rd.cost_concentration > 65 ? 'Highly concentrated — scrutinize VP+ compensation in diligence interviews.' : rd.cost_concentration < 45 ? 'Well-distributed — compensation is relatively uniform across seniority levels.' : 'Moderate concentration — within normal range for this workforce size.'}`;
  }
  if (lq.includes('geograph') || lq.includes('risk')) {
    return `${co?.name} accounts for ${co?.pct}% of headcount across ${rd.num_countries} ${rd.num_countries === 1 ? 'country' : 'countries'}. ${rd.num_countries > 5 ? 'Geographic dispersion introduces execution complexity but enables labor cost arbitrage.' : 'Concentrated footprint simplifies management but limits labor cost flexibility.'}`;
  }
  if (lq.includes('function') || lq.includes('central') || lq.includes('model')) {
    return `${fn?.name} leads headcount (${fn?.pct}%); ${fnSpend?.name} leads spend (${Math.round(((fnSpend?.cost || 0) / rd.total_labor_spend) * 100)}% of labor). ${fn?.name === fnSpend?.name ? 'Same function dominates both — this is likely the core capability of the business.' : 'Different leaders by headcount vs. spend — the spend-heavy function commands premium talent.'}`;
  }
  if (lq.includes('restructur') || lq.includes('target')) {
    const flags: string[] = [];
    if (rd.senior_ratio > 25) flags.push(`top-heavy structure (${rd.senior_ratio}% VP+)`);
    if (rd.cost_concentration > 65) flags.push(`concentrated cost base (${rd.cost_concentration}% in top quartile)`);
    return flags.length > 0
      ? `Restructuring signals: ${flags.join(', ')}. These are worth probing in management interviews.`
      : `No single obvious restructuring lever. Compare function benchmarks against peer companies to identify outliers.`;
  }
  return `${rd.total_headcount.toLocaleString()} employees, ${fmt(rd.total_labor_spend)} total spend, ${rd.senior_ratio}% senior ratio across ${rd.num_countries} countries.`;
}

export function buildIntegratedAnswer(rd: RosterData, fd: FinancialData, q: string): string {
  const lq = q.toLowerCase();
  const fn = topFn(rd);
  const fnSpend = topFnSpend(rd);
  const revPerEmp = fd.total_revenue && rd.total_headcount ? Math.round(fd.total_revenue / rd.total_headcount) : null;
  const laborPct = fd.total_revenue ? Math.round((rd.total_labor_spend / fd.total_revenue) * 100) : null;
  const ebitdaPct = fd.ebitda && fd.total_revenue ? Math.round((fd.ebitda / fd.total_revenue) * 100) : null;

  if (lq.includes('benchmark') || lq.includes('compare') || lq.includes('revenue per')) {
    const tier = !revPerEmp ? 'N/A'
      : revPerEmp > 500000 ? 'top-quartile — comparable to large-cap software or financial services'
      : revPerEmp > 200000 ? 'above median — typical for professional services or mid-cap tech'
      : revPerEmp > 80000 ? 'mid-range — common in distribution or labor-intensive B2B'
      : 'below average — typical of retail, staffing, or early-stage growth';
    return `${fd.company}'s revenue per employee is ${fmt(revPerEmp)}: ${tier}.`;
  }
  if (lq.includes('labor') || lq.includes('signal')) {
    return `Labor is ${laborPct}% of revenue. ${laborPct !== null && laborPct < 15 ? 'Lean ratio — headcount growth has limited EBITDA drag.' : laborPct !== null && laborPct < 30 ? `Manageable. A 10% headcount increase would reduce EBITDA margin by ~${Math.round((laborPct || 0) * 0.1)} points.` : 'High ratio — any meaningful headcount action (up or down) has direct, material EBITDA implications.'}`;
  }
  if (lq.includes('cost optim') || lq.includes('opportunit')) {
    const levers: string[] = [];
    if (rd.senior_ratio > 20) levers.push(`VP+ rationalization (${rd.senior_ratio}% of headcount)`);
    if (fnSpend) levers.push(`${fnSpend.name} function (${Math.round(((fnSpend.cost || 0) / rd.total_labor_spend) * 100)}% of labor spend)`);
    if (rd.num_countries > 3) levers.push(`geographic consolidation (${rd.num_countries} countries)`);
    return `Top levers: ${levers.join('; ') || 'functional headcount rebalancing'}.`;
  }
  if (lq.includes('ebitda') || lq.includes('margin') || lq.includes('workforce')) {
    return `At ${ebitdaPct}% EBITDA margin, ${fd.company} ${ebitdaPct !== null && ebitdaPct > 25 ? 'has buffer to invest — workforce decisions can be made strategically.' : ebitdaPct !== null && ebitdaPct > 10 ? 'has adequate but limited buffer — workforce actions should be targeted.' : 'is under pressure — workforce cost reduction may be a near-term operational imperative.'}`;
  }
  if (lq.includes('over') || lq.includes('under') || lq.includes('invest')) {
    return `${fn?.name} is ${fn?.pct}% of headcount and ${Math.round(((fnSpend?.cost || 0) / rd.total_labor_spend) * 100)}% of labor spend. Without peer benchmarks it's hard to say definitively — but if ${fn?.name} is the primary revenue driver, this may be appropriate; if it's overhead, it's worth scrutinizing.`;
  }
  return `Revenue per employee: ${fmt(revPerEmp)}. Labor: ${laborPct}% of revenue. EBITDA margin: ${ebitdaPct}%.`;
}
