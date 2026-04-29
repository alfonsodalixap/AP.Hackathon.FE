import { useState } from 'react';
import type { RosterData, FinancialData, AIState } from '../types';
import { fmt, laborPctStr, ebitdaMarginStr } from '../utils/format';
import { sortBySeniority } from '../utils/seniority';
import { computeOpportunities, topFn, topFnSpend } from '../utils/opportunities';
import { buildIntegratedNarrative, buildIntegratedAnswer } from '../utils/narrative';
import HBarChart from '../components/HBarChart';
import AICard from '../components/AICard';
import PptxGenJS from 'pptxgenjs';

const INTEGRATED_QUESTIONS = [
  'How does revenue per employee compare to benchmarks?',
  'What does labor as % of revenue signal?',
  'Where is the biggest cost optimization opportunity?',
  'What does EBITDA margin imply for this workforce?',
  'Is this org over- or under-invested in its top function?',
];

interface Props {
  roster: { data: RosterData; fileName: string };
  financials: { data: FinancialData };
  ai: AIState;
  onAI: (ai: Partial<AIState>) => void;
  onBack: () => void;
}

function topSn(rd: RosterData) {
  const [name, count] = Object.entries(rd.by_seniority).sort((a, b) => b[1] - a[1])[0] || [];
  return name ? { name, count, pct: Math.round((count / rd.total_headcount) * 100) } : null;
}

function topCountry(rd: RosterData) {
  const [name, count] = Object.entries(rd.by_country).sort((a, b) => b[1] - a[1])[0] || [];
  return name ? { name, pct: Math.round((count / rd.total_headcount) * 100) } : null;
}

export default function Step3Integrated({ roster, financials, ai, onAI, onBack }: Props) {
  const [pptExporting, setPptExporting] = useState(false);

  const rd = roster.data;
  const fd = financials.data;
  const opps = computeOpportunities(rd, fd);
  const fn = topFn(rd);
  const fnSpend = topFnSpend(rd);
  const sn = topSn(rd);
  const co = topCountry(rd);
  const revPerEmp = fd.total_revenue && rd.total_headcount ? Math.round(fd.total_revenue / rd.total_headcount) : null;
  const laborPct = laborPctStr(rd.total_labor_spend, fd.total_revenue);
  const ebitdaMargin = ebitdaMarginStr(fd.ebitda, fd.total_revenue);

  const snData = sortBySeniority(Object.entries(rd.by_seniority)).map(([name, value]) => ({ name, value }));
  const costSnData = sortBySeniority(Object.entries(rd.cost_by_seniority)).map(([name, value]) => ({ name, value }));

  function generateNarrative() {
    onAI({ loading: true, chat: [] });
    setTimeout(() => {
      onAI({ text: buildIntegratedNarrative(rd, fd), loading: false });
    }, 700);
  }

  function askQuestion(q: string) {
    const answer = buildIntegratedAnswer(rd, fd, q);
    onAI({ chat: [...ai.chat, { role: 'user', text: q }, { role: 'assistant', text: answer }] });
  }

  async function exportToPPT() {
    setPptExporting(true);
    await new Promise((r) => setTimeout(r, 0));

    const laborPctVal = (() => {
      if (!rd.total_labor_spend || !fd.total_revenue) return 'N/A';
      const p = (rd.total_labor_spend / fd.total_revenue) * 100;
      return p >= 1 ? Math.round(p) + '%' : p >= 0.1 ? p.toFixed(1) + '%' : p.toFixed(2) + '%';
    })();
    const ebitdaM = fd.ebitda && fd.total_revenue ? Math.round((fd.ebitda / fd.total_revenue) * 100) + '%' : 'N/A';

    try {
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_WIDE';
      const G = '498E2B', LG = '5CB335', DK = '222222', GR = '6c757d', AM = 'd97706', WH = 'FFFFFF';

      const addSlide = (title: string, sub: string) => {
        const s = pptx.addSlide();
        s.background = { color: 'f7f7f7' };
        s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.07, fill: { color: G } });
        s.addShape(pptx.ShapeType.rect, { x: 0, y: 0.07, w: 13.33, h: 0.52, fill: { color: DK } });
        s.addText('● AlixPartners', { x: 0.3, y: 0.07, w: 4, h: 0.52, color: WH, fontSize: 11, bold: true, valign: 'middle' });
        s.addText('Outside-In Diligence Tool', { x: 4, y: 0.07, w: 9.0, h: 0.52, color: 'aaaaaa', fontSize: 10, valign: 'middle', align: 'right' });
        if (title) s.addText(title, { x: 0.4, y: 0.72, w: 12.5, h: 0.48, color: DK, fontSize: 18, bold: true });
        if (sub) s.addText(sub, { x: 0.4, y: 1.18, w: 12.5, h: 0.3, color: GR, fontSize: 10 });
        s.addShape(pptx.ShapeType.rect, { x: 0, y: 7.28, w: 13.33, h: 0.22, fill: { color: 'e8e8e8' } });
        s.addText('Confidential — AlixPartners · Generated ' + new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), { x: 0.3, y: 7.29, w: 13, h: 0.2, color: GR, fontSize: 8, valign: 'middle' });
        return s;
      };

      // Slide 1 — Cover
      const s1 = pptx.addSlide();
      s1.background = { color: DK };
      s1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.14, h: 7.5, fill: { color: G } });
      s1.addText('● AlixPartners', { x: 0.5, y: 0.55, w: 12, h: 0.5, color: LG, fontSize: 14, bold: true });
      s1.addText('Outside-In\nDiligence Tool', { x: 0.5, y: 1.3, w: 12, h: 2.1, color: WH, fontSize: 44, bold: true });
      s1.addText(fd.company, { x: 0.5, y: 3.55, w: 12, h: 0.65, color: LG, fontSize: 26, bold: true });
      s1.addText('FY' + fd.fiscal_year + ' · ' + rd.total_headcount.toLocaleString() + ' employees analyzed', { x: 0.5, y: 4.3, w: 12, h: 0.4, color: 'aaaaaa', fontSize: 13 });
      s1.addShape(pptx.ShapeType.rect, { x: 0.5, y: 4.95, w: 2.5, h: 0.04, fill: { color: G } });
      s1.addText('Prepared: ' + new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), { x: 0.5, y: 5.15, w: 12, h: 0.3, color: '888888', fontSize: 11 });
      s1.addText('CONFIDENTIAL', { x: 0.5, y: 7.05, w: 12, h: 0.28, color: '666666', fontSize: 9, bold: true, charSpacing: 3 });

      // Slide 2 — Dataset Overview
      const s2 = addSlide('Dataset Overview', rd.total_headcount.toLocaleString() + '-person roster × ' + fd.company + ' FY' + fd.fiscal_year + ' 10-K');
      s2.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.6, w: 5.8, h: 5.0, fill: { color: WH }, line: { color: 'dddddd', width: 1 } });
      s2.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.6, w: 5.8, h: 0.48, fill: { color: G } });
      s2.addText('ROSTER', { x: 0.5, y: 1.6, w: 5.6, h: 0.48, color: WH, fontSize: 11, bold: true, valign: 'middle' });
      ([['Source', roster.fileName || 'Uploaded file'], ['Employees', rd.total_headcount.toLocaleString()], ['Countries', String(rd.num_countries)], ['Total Labor Spend', fmt(rd.total_labor_spend)], ['Avg Cost / Employee', fmt(rd.avg_cost_per_employee)], ['Median Cost', fmt(rd.median_cost)], ['Senior Ratio (VP+)', rd.senior_ratio + '%'], ['Cost Concentration', rd.cost_concentration + '% (top quartile)']] as [string, string][]).forEach(([l, v], i) => {
        s2.addText(l, { x: 0.6, y: 2.2 + i * 0.52, w: 2.8, h: 0.44, color: GR, fontSize: 9.5 });
        s2.addText(v, { x: 3.4, y: 2.2 + i * 0.52, w: 2.6, h: 0.44, color: DK, fontSize: 9.5, bold: true, align: 'right' });
      });
      s2.addText('↔', { x: 6.3, y: 3.9, w: 0.7, h: 0.6, color: 'cccccc', fontSize: 22, align: 'center' });
      s2.addShape(pptx.ShapeType.rect, { x: 7.1, y: 1.6, w: 5.8, h: 5.0, fill: { color: WH }, line: { color: 'dddddd', width: 1 } });
      s2.addShape(pptx.ShapeType.rect, { x: 7.1, y: 1.6, w: 5.8, h: 0.48, fill: { color: DK } });
      s2.addText('FINANCIALS', { x: 7.2, y: 1.6, w: 5.6, h: 0.48, color: WH, fontSize: 11, bold: true, valign: 'middle' });
      ([['Company', fd.company], ['Fiscal Year', 'FY' + fd.fiscal_year], ['Source', fd.source || 'SEC EDGAR 10-K'], ['Total Revenue', fmt(fd.total_revenue)], ['EBITDA', fmt(fd.ebitda)], ['EBITDA Margin', ebitdaM], ['Operating Income', fmt(fd.operating_income)], ['D&A', fmt(fd.depreciation_amortization)]] as [string, string][]).forEach(([l, v], i) => {
        s2.addText(l, { x: 7.3, y: 2.2 + i * 0.52, w: 2.8, h: 0.44, color: GR, fontSize: 9.5 });
        s2.addText(v || 'N/A', { x: 10.1, y: 2.2 + i * 0.52, w: 2.6, h: 0.44, color: DK, fontSize: 9.5, bold: true, align: 'right' });
      });

      // Slide 3 — Integrated KPIs
      const s3 = addSlide('Integrated Key Metrics', fd.company + ' FY' + fd.fiscal_year + ' · ' + rd.total_headcount.toLocaleString() + ' employees');
      ([{ label: 'REVENUE PER EMPLOYEE', val: fmt(revPerEmp), sub: fd.company + ' FY' + fd.fiscal_year, bg: G, tc: WH, sc: 'aaaaaa', ac: LG }, { label: 'LABOR AS % OF REVENUE', val: laborPctVal, sub: fmt(rd.total_labor_spend) + ' labor / ' + fmt(fd.total_revenue) + ' revenue', bg: WH, tc: DK, sc: GR, ac: 'e67e22' }, { label: 'EBITDA MARGIN', val: ebitdaM, sub: fmt(fd.ebitda) + ' / ' + fmt(fd.total_revenue), bg: WH, tc: DK, sc: GR, ac: G }]).forEach((k, i) => {
        const x = 0.4 + i * 4.3;
        s3.addShape(pptx.ShapeType.rect, { x, y: 1.6, w: 4.0, h: 3.8, fill: { color: k.bg }, line: { color: 'dddddd', width: 1 } });
        s3.addShape(pptx.ShapeType.rect, { x, y: 1.6, w: 0.07, h: 3.8, fill: { color: k.ac } });
        s3.addText(k.label, { x: x + 0.2, y: 1.72, w: 3.7, h: 0.48, color: i === 0 ? 'rgba(255,255,255,0.7)' : GR, fontSize: 9, bold: true });
        s3.addText(k.val, { x: x + 0.2, y: 2.3, w: 3.7, h: 1.6, color: k.tc, fontSize: 32, bold: true, valign: 'middle' });
        s3.addText(k.sub, { x: x + 0.2, y: 4.85, w: 3.7, h: 0.42, color: k.sc, fontSize: 8.5 });
      });

      // Slide 4 — Workforce Composition
      const s4 = addSlide('Workforce Composition', rd.total_headcount.toLocaleString() + ' employees · ' + rd.num_countries + ' countries · ' + rd.senior_ratio + '% VP+ level');
      s4.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.58, w: 5.9, h: 5.1, fill: { color: WH }, line: { color: 'dddddd', width: 1 } });
      s4.addText('HEADCOUNT BY FUNCTION', { x: 0.6, y: 1.68, w: 5.5, h: 0.38, color: GR, fontSize: 9, bold: true });
      Object.entries(rd.by_function).sort((a, b) => b[1] - a[1]).slice(0, 7).forEach(([fn2, cnt], i) => {
        const bw = Math.max(0.08, (cnt / rd.total_headcount) * 3.8);
        s4.addText(fn2, { x: 0.6, y: 2.2 + i * 0.56, w: 1.9, h: 0.38, color: DK, fontSize: 9.5 });
        s4.addShape(pptx.ShapeType.rect, { x: 2.6, y: 2.28 + i * 0.56, w: bw, h: 0.2, fill: { color: i === 0 ? G : LG } });
        s4.addText(cnt.toLocaleString() + ' (' + Math.round((cnt / rd.total_headcount) * 100) + '%)', { x: 2.7 + bw, y: 2.2 + i * 0.56, w: 3.4, h: 0.38, color: GR, fontSize: 9 });
      });
      const snSorted = sortBySeniority(Object.entries(rd.by_seniority));
      s4.addShape(pptx.ShapeType.rect, { x: 6.7, y: 1.58, w: 6.2, h: 5.1, fill: { color: WH }, line: { color: 'dddddd', width: 1 } });
      s4.addText('SENIORITY DISTRIBUTION', { x: 6.9, y: 1.68, w: 5.8, h: 0.38, color: GR, fontSize: 9, bold: true });
      snSorted.slice(0, 8).forEach(([sn2, cnt], i) => {
        const bw = Math.max(0.08, (cnt / rd.total_headcount) * 3.8);
        const op = Math.max(20, Math.min(100, 40 + i * 8));
        s4.addText(sn2, { x: 6.9, y: 2.2 + i * 0.54, w: 1.9, h: 0.38, color: DK, fontSize: 9 });
        s4.addShape(pptx.ShapeType.rect, { x: 8.9, y: 2.28 + i * 0.54, w: bw, h: 0.2, fill: { color: G, transparency: 100 - op } });
        s4.addText(cnt.toLocaleString() + ' (' + Math.round((cnt / rd.total_headcount) * 100) + '%)', { x: 9 + bw, y: 2.2 + i * 0.54, w: 3.8, h: 0.38, color: GR, fontSize: 9 });
      });

      // Slide 5 — Value Creation
      const s5 = addSlide('Value Creation Opportunities', 'Data-driven levers identified from roster and financial cross-analysis');
      s5.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.54, w: 12.5, h: 0.05, fill: { color: AM } });
      opps.slice(0, 5).forEach((opp, i) => {
        const y = 1.68 + i * 1.08;
        s5.addShape(pptx.ShapeType.rect, { x: 0.4, y, w: 12.5, h: 0.98, fill: { color: 'fffbf0' }, line: { color: 'fde68a', width: 1 } });
        s5.addShape(pptx.ShapeType.rect, { x: 0.4, y, w: 0.06, h: 0.98, fill: { color: AM } });
        s5.addText(opp.title, { x: 0.6, y: y + 0.06, w: opp.impact ? 8.5 : 11.8, h: 0.34, color: '92400e', fontSize: 10, bold: true });
        if (opp.impact) s5.addText(opp.impact, { x: 9.2, y: y + 0.06, w: 3.5, h: 0.34, color: AM, fontSize: 9, bold: true, align: 'right' });
        s5.addText((opp.detail || '').substring(0, 200) + ((opp.detail || '').length > 200 ? '…' : ''), { x: 0.6, y: y + 0.44, w: 12.1, h: 0.46, color: '78350f', fontSize: 8.5 });
      });

      // Slide 6 — Key Insights
      const s6 = addSlide('Key Insights', 'Summary findings from the integrated workforce + financial analysis');
      ([{ label: 'TOP FUNCTION — HEADCOUNT', val: fn?.name || '—', sub: (fn?.count?.toLocaleString() || '') + ' employees (' + fn?.pct + '%)' }, { label: 'TOP FUNCTION — SPEND', val: fnSpend?.name || '—', sub: fmt(fnSpend?.cost) + ' (' + Math.round(((fnSpend?.cost || 0) / rd.total_labor_spend) * 100) + '% of labor)' }, { label: 'LARGEST SENIORITY BAND', val: sn?.name || '—', sub: (sn?.count?.toLocaleString() || '') + ' employees (' + sn?.pct + '%)' }, { label: 'GEOGRAPHIC FOOTPRINT', val: rd.num_countries + ' countries', sub: 'Largest: ' + (co?.name || '—') + ' (' + co?.pct + '%)' }]).forEach((ins, i) => {
        const x = 0.4 + (i % 2) * 6.5, y = 1.7 + Math.floor(i / 2) * 2.7;
        s6.addShape(pptx.ShapeType.rect, { x, y, w: 6.0, h: 2.4, fill: { color: WH }, line: { color: 'dddddd', width: 1 } });
        s6.addShape(pptx.ShapeType.rect, { x, y, w: 0.06, h: 2.4, fill: { color: G } });
        s6.addText(ins.label, { x: x + 0.2, y: y + 0.14, w: 5.6, h: 0.38, color: GR, fontSize: 9, bold: true });
        s6.addText(ins.val, { x: x + 0.2, y: y + 0.56, w: 5.6, h: 1.1, color: DK, fontSize: 22, bold: true, valign: 'middle' });
        s6.addText(ins.sub, { x: x + 0.2, y: y + 1.9, w: 5.6, h: 0.38, color: GR, fontSize: 9 });
      });

      await pptx.writeFile({ fileName: 'OIDD-' + fd.company.replace(/[^a-z0-9]/gi, '_') + '-FY' + fd.fiscal_year + '.pptx' });
    } finally {
      setPptExporting(false);
    }
  }

  return (
    <div>
      {/* Comparison banner */}
      <div style={{ background: '#fff', borderRadius: 8, padding: '16px 20px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,.08)', display: 'flex', alignItems: 'center', borderLeft: '4px solid #498E2B', gap: 0 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#aaa', marginBottom: 4 }}>Roster</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#212529' }}>{roster.fileName}</div>
          <div style={{ fontSize: 12, color: '#6c757d', marginTop: 2 }}>{rd.total_headcount.toLocaleString()} employees · {rd.num_countries} countries</div>
        </div>
        <div style={{ padding: '0 24px', fontSize: 22, color: '#dee2e6', fontWeight: 300 }}>↔</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#aaa', marginBottom: 4 }}>Financials</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#212529' }}>{fd.company}</div>
          <div style={{ fontSize: 12, color: '#6c757d', marginTop: 2 }}>FY{fd.fiscal_year} · {fd.source}</div>
        </div>
        <div style={{ marginLeft: 'auto', paddingLeft: 24, borderLeft: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#aaa', marginBottom: 4 }}>Revenue</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#498E2B' }}>{fmt(fd.total_revenue)}</div>
            <div style={{ fontSize: 12, color: '#6c757d', marginTop: 2 }}>EBITDA {ebitdaMargin}</div>
          </div>
          <button
            onClick={exportToPPT}
            disabled={pptExporting}
            style={{ background: '#d97706', color: '#fff', border: 'none', borderRadius: 5, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 6px rgba(217,119,6,.35)' }}
          >
            {pptExporting ? <><span className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,.3)' }} /> Building…</> : '📊 Export to PPT'}
          </button>
        </div>
      </div>

      {/* Ratio KPIs */}
      <div className="metrics" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="metric-ratio">
          <div className="metric-label">Revenue per Employee</div>
          <div className="metric-value">{fmt(revPerEmp)}</div>
          <div className="metric-sub" style={{ color: 'rgba(255,255,255,.7)' }}>{fd.company} FY{fd.fiscal_year}</div>
        </div>
        <div className="metric accent">
          <div className="metric-label">Labor as % of Revenue</div>
          <div className="metric-value">{laborPct}</div>
          <div className="metric-sub"><span>{fmt(rd.total_labor_spend)}</span> labor / <span>{fmt(fd.total_revenue)}</span> revenue</div>
        </div>
        <div className="metric">
          <div className="metric-label">EBITDA Margin</div>
          <div className="metric-value">{ebitdaMargin}</div>
          <div className="metric-sub">ebitda / revenue</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-title">Seniority Pyramid</div>
          <HBarChart data={snData} color="#498E2B" opacity />
        </div>
        <div className="card">
          <div className="card-title">Labor Spend by Seniority</div>
          <HBarChart data={costSnData} color="#5CB335" formatValue={fmt} />
        </div>
      </div>

      {/* Key Insights */}
      <div className="card">
        <div className="card-title">Key Insights</div>
        <div className="insights-grid">
          <div>
            <div className="insight-label">Top Function — Headcount</div>
            <div className="insight-value">{fn?.name || '—'}</div>
            <div className="insight-sub">{fn?.count?.toLocaleString()} employees ({fn?.pct}%)</div>
          </div>
          <div>
            <div className="insight-label">Top Function — Spend</div>
            <div className="insight-value">{fnSpend?.name || '—'}</div>
            <div className="insight-sub">{fmt(fnSpend?.cost)} ({fnSpend?.pct}% of labor)</div>
          </div>
          <div>
            <div className="insight-label">Largest Seniority Band</div>
            <div className="insight-value">{sn?.name || '—'}</div>
            <div className="insight-sub">{sn?.count?.toLocaleString()} employees ({sn?.pct}%)</div>
          </div>
          <div>
            <div className="insight-label">Geographic Footprint</div>
            <div className="insight-value">{Object.keys(rd.by_country).length} countries</div>
            <div className="insight-sub">Largest: {co?.name} ({co?.pct}%)</div>
          </div>
        </div>
      </div>

      {/* Opportunities */}
      <div className="card">
        <div className="card-title" style={{ color: '#d97706' }}>⚡ Potential Value Creation Opportunities</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {opps.map((opp) => (
            <div key={opp.title} style={{ display: 'flex', gap: 14, padding: '12px 14px', borderRadius: 6, background: '#fffbf0', border: '1px solid #fde68a' }}>
              <div style={{ flex: '0 0 auto', width: 8, height: 8, borderRadius: '50%', background: '#d97706', marginTop: 5 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>{opp.title}</div>
                <div style={{ fontSize: 12, color: '#78350f', marginTop: 3, lineHeight: 1.5 }}>{opp.detail}</div>
                {opp.impact && (
                  <div style={{ marginTop: 5, fontSize: 11, fontWeight: 700, color: '#d97706', background: '#fef3c7', display: 'inline-block', padding: '2px 8px', borderRadius: 10 }}>
                    {opp.impact}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Narrative */}
      <AICard
        state={ai}
        questions={INTEGRATED_QUESTIONS}
        onGenerate={generateNarrative}
        onQuestion={askQuestion}
      />

      <div className="step-nav">
        <button className="btn btn-outline" onClick={onBack}>← Financial Data</button>
        <span />
      </div>
    </div>
  );
}
