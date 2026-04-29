import { useState } from 'react';
import type { FinancialData, ManualFinancials } from '../types';
import { fmt, pct, parseMonetary } from '../utils/format';
import { fetchFromEDGAR, DEMO_FINANCIALS } from '../utils/financials';

interface Props {
  financials: { loaded: boolean; data: FinancialData | null; error: string | null };
  onLoad: (data: FinancialData) => void;
  onReset: () => void;
  onBack: () => void;
  onNext: () => void;
  rosterLoaded: boolean;
}

export default function Step2Financials({ financials, onLoad, onReset, onBack, onNext, rosterLoaded }: Props) {
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [ticker, setTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState<ManualFinancials>({
    company: '', fiscal_year: '', total_revenue: '', ebitda: '',
    total_expenses: '', cost_of_revenue: '', rd: '', sga: '',
  });

  async function fetchFinancials() {
    if (!ticker.trim()) return;
    setLoading(true); setError(null);
    try {
      const data = await fetchFromEDGAR(ticker);
      onLoad(data);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }

  function loadManual() {
    onLoad({
      company: manual.company || 'Company',
      ticker: '—',
      cik: null,
      fiscal_year: manual.fiscal_year || '—',
      total_revenue: parseMonetary(manual.total_revenue),
      ebitda: parseMonetary(manual.ebitda),
      operating_income: null,
      depreciation_amortization: null,
      total_expenses: parseMonetary(manual.total_expenses),
      expense_breakdown: {
        cost_of_revenue: parseMonetary(manual.cost_of_revenue),
        research_and_development: parseMonetary(manual.rd),
        selling_general_admin: parseMonetary(manual.sga),
      },
      source: 'Manual Entry',
      filing_date: null,
    });
  }

  const d = financials.data;

  return (
    <div>
      <div className="card">
        <div className="card-title">Financial Data — 10-K</div>

        <div className="mode-toggle">
          <button className={`mode-btn ${mode === 'auto' ? 'active' : ''}`} onClick={() => setMode('auto')}>Auto (SEC EDGAR)</button>
          <button className={`mode-btn ${mode === 'manual' ? 'active' : ''}`} onClick={() => setMode('manual')}>Enter manually</button>
        </div>

        {mode === 'auto' && (
          <div>
            <div className="input-group">
              <input
                className="form-control"
                type="text"
                placeholder="AAPL"
                style={{ width: 130 }}
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && fetchFinancials()}
                disabled={loading}
              />
              <button className="btn" onClick={fetchFinancials} disabled={loading || !ticker.trim()}>
                {loading && <span className="spinner" />}
                {loading ? 'Fetching…' : 'Fetch from SEC EDGAR'}
              </button>
              {financials.loaded && <button className="btn btn-outline" onClick={onReset}>Clear</button>}
            </div>
            <div style={{ fontSize: 11, color: '#aaa' }}>Pulls the latest 10-K filing. May take 10–20s for large companies.</div>
            <p style={{ marginTop: 8, marginBottom: 0 }}>
              <button className="btn-link" onClick={() => onLoad(DEMO_FINANCIALS)}>Use demo financial data instead</button>
            </p>
          </div>
        )}

        {mode === 'manual' && (
          <div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 12, background: '#f9f9f9', padding: '8px 10px', borderRadius: 4, borderLeft: '3px solid #dee2e6' }}>
              Copy values directly from the 10-K filing and paste them here. Commas and $ signs are ignored automatically.
            </div>
            <div className="manual-grid" style={{ marginBottom: 12 }}>
              <div className="form-group" style={{ gridColumn: '1/3' }}>
                <label className="form-label">Company Name</label>
                <input className="form-input" type="text" placeholder="e.g. Apple Inc." value={manual.company} onChange={(e) => setManual({ ...manual, company: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Fiscal Year</label>
                <input className="form-input" type="text" placeholder="e.g. 2024" value={manual.fiscal_year} onChange={(e) => setManual({ ...manual, fiscal_year: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Total Revenue ($)</label>
                <input className="form-input" type="text" placeholder="e.g. 391,035,000,000" value={manual.total_revenue} onChange={(e) => setManual({ ...manual, total_revenue: e.target.value })} />
                <span className="form-hint">Paste from document — formatting is stripped</span>
              </div>
              <div className="form-group">
                <label className="form-label">EBITDA ($)</label>
                <input className="form-input" type="text" placeholder="e.g. 130,000,000,000" value={manual.ebitda} onChange={(e) => setManual({ ...manual, ebitda: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Total Expenses ($)</label>
                <input className="form-input" type="text" placeholder="e.g. 261,000,000,000" value={manual.total_expenses} onChange={(e) => setManual({ ...manual, total_expenses: e.target.value })} />
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Expense detail (optional)</div>
            <div className="manual-grid" style={{ marginBottom: 14 }}>
              <div className="form-group">
                <label className="form-label">Cost of Revenue ($)</label>
                <input className="form-input" type="text" placeholder="optional" value={manual.cost_of_revenue} onChange={(e) => setManual({ ...manual, cost_of_revenue: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">R&amp;D ($)</label>
                <input className="form-input" type="text" placeholder="optional" value={manual.rd} onChange={(e) => setManual({ ...manual, rd: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">SG&amp;A ($)</label>
                <input className="form-input" type="text" placeholder="optional" value={manual.sga} onChange={(e) => setManual({ ...manual, sga: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={loadManual} disabled={!manual.company || !manual.total_revenue}>Save &amp; Apply</button>
              {financials.loaded && <button className="btn btn-outline" onClick={onReset}>Clear</button>}
            </div>
          </div>
        )}
      </div>

      {(error || financials.error) && (
        <div className="alert alert-danger">{error || financials.error}</div>
      )}

      {d && (
        <>
          <div className="card">
            <div className="company-header">
              <div>
                <div className="company-ticker">{d.ticker}</div>
                <div className="company-name">{d.company}</div>
              </div>
              <div style={{ fontSize: 13, color: '#555', borderLeft: '2px solid #eee', paddingLeft: 14 }}>
                FY <strong>{d.fiscal_year || '—'}</strong>
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>Filed: {d.filing_date || 'N/A'}</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="source-pill">{d.source || 'SEC EDGAR 10-K'}</span>
              </div>
            </div>
          </div>

          <div className="metrics">
            <div className="metric">
              <div className="metric-label">Total Revenue</div>
              <div className="metric-value">{fmt(d.total_revenue)}</div>
              <div className="metric-sub">annual</div>
            </div>
            <div className="metric">
              <div className="metric-label">EBITDA (est.)</div>
              <div className="metric-value">{fmt(d.ebitda)}</div>
              <div className="metric-sub">Op. Income + D&A</div>
            </div>
            <div className="metric">
              <div className="metric-label">Operating Income</div>
              <div className="metric-value">{fmt(d.operating_income)}</div>
            </div>
            <div className="metric">
              <div className="metric-label">D&amp;A</div>
              <div className="metric-value">{fmt(d.depreciation_amortization)}</div>
            </div>
          </div>

          {d.expense_breakdown && (
            <div className="card">
              <div className="card-title">Expense Breakdown (% of Revenue)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
                {([['Cost of Revenue', 'cost_of_revenue'], ['R&D', 'research_and_development'], ['SG&A', 'selling_general_admin']] as const).map(([label, key]) => {
                  const val = d.expense_breakdown[key];
                  return (
                    <div key={key}>
                      <div className="insight-label">{label}</div>
                      <div className="insight-value">{fmt(val)}</div>
                      <div className="progress-bar" style={{ width: '100%', marginTop: 6 }}>
                        <div className="progress-fill" style={{ width: `${pct(val, d.total_revenue)}%` }} />
                      </div>
                      <div className="insight-sub">{pct(val, d.total_revenue)}% of revenue</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <div className="step-nav">
        <button className="btn btn-outline" onClick={onBack}>← Roster Analysis</button>
        <button className="btn" onClick={onNext} disabled={!rosterLoaded || !financials.loaded}>
          {rosterLoaded && financials.loaded ? 'Integrated Analysis →' : 'Load roster first'}
        </button>
      </div>
    </div>
  );
}
