import { useState } from 'react';
import { Button, Input, TabNavigation, Tab, Banner, Spinner } from '@alixpartners/ui-components';
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
      setError(e instanceof Error ? e.message : String(e));
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
  const activeError = error || financials.error;

  return (
    <div>
      <div className="card">
        <div className="card-title">Financial Data — 10-K</div>

        <TabNavigation>
          <Tab label="Auto (SEC EDGAR)" active={mode === 'auto'} onClick={() => setMode('auto')} />
          <Tab label="Enter manually" active={mode === 'manual'} onClick={() => setMode('manual')} />
        </TabNavigation>

        {mode === 'auto' && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
              <div style={{ width: 160 }}>
                <Input
                  type="text"
                  label="Ticker Symbol"
                  value={ticker}
                  onChange={(v) => setTicker(v.toUpperCase())}
                  placeholder="AAPL"
                  disabled={loading}
                />
              </div>
              <Button
                type="primary"
                onClick={fetchFinancials}
                disabled={loading || !ticker.trim()}
              >
                {loading ? <><Spinner size="sm" color="white" /> Fetching…</> : 'Fetch from SEC EDGAR'}
              </Button>
              {financials.loaded && (
                <Button type="secondary" onClick={onReset}>Clear</Button>
              )}
            </div>
            <div style={{ fontSize: 11, color: '#aaa', marginBottom: 8 }}>
              Pulls the latest 10-K filing. May take 10–20s for large companies.
            </div>
            <Button type="tertiary" size="sm" onClick={() => onLoad(DEMO_FINANCIALS)}>
              Use demo financial data instead
            </Button>
          </div>
        )}

        {mode === 'manual' && (
          <div style={{ marginTop: 16 }}>
            <Banner
              type="info"
              size="sm"
              content="Copy values directly from the 10-K filing and paste them here. Commas and $ signs are ignored automatically."
              isFullWidth
            />

            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / 3' }}>
                <Input
                  type="text"
                  label="Company Name"
                  value={manual.company}
                  onChange={(v) => setManual({ ...manual, company: v })}
                  placeholder="e.g. Apple Inc."
                />
              </div>
              <Input
                type="text"
                label="Fiscal Year"
                value={manual.fiscal_year}
                onChange={(v) => setManual({ ...manual, fiscal_year: v })}
                placeholder="e.g. 2024"
              />
              <Input
                type="text"
                label="Total Revenue ($)"
                value={manual.total_revenue}
                onChange={(v) => setManual({ ...manual, total_revenue: v })}
                placeholder="e.g. 391,035,000,000"
                helpText="Paste from document — formatting is stripped"
              />
              <Input
                type="text"
                label="EBITDA ($)"
                value={manual.ebitda}
                onChange={(v) => setManual({ ...manual, ebitda: v })}
                placeholder="e.g. 130,000,000,000"
              />
              <Input
                type="text"
                label="Total Expenses ($)"
                value={manual.total_expenses}
                onChange={(v) => setManual({ ...manual, total_expenses: v })}
                placeholder="e.g. 261,000,000,000"
              />
            </div>

            <div style={{ margin: '16px 0 8px', fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Expense detail (optional)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <Input
                type="text"
                label="Cost of Revenue ($)"
                value={manual.cost_of_revenue}
                onChange={(v) => setManual({ ...manual, cost_of_revenue: v })}
                placeholder="optional"
              />
              <Input
                type="text"
                label="R&D ($)"
                value={manual.rd}
                onChange={(v) => setManual({ ...manual, rd: v })}
                placeholder="optional"
              />
              <Input
                type="text"
                label="SG&A ($)"
                value={manual.sga}
                onChange={(v) => setManual({ ...manual, sga: v })}
                placeholder="optional"
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                type="primary"
                onClick={loadManual}
                disabled={!manual.company || !manual.total_revenue}
              >
                Save &amp; Apply
              </Button>
              {financials.loaded && (
                <Button type="secondary" onClick={onReset}>Clear</Button>
              )}
            </div>
          </div>
        )}
      </div>

      {activeError && (
        <Banner type="error" size="md" content={activeError} isFullWidth />
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
              <div style={{ marginLeft: 'auto' }}>
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
              <div className="metric-sub">Op. Income + D&amp;A</div>
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
                {([
                  ['Cost of Revenue', 'cost_of_revenue'],
                  ['R&D', 'research_and_development'],
                  ['SG&A', 'selling_general_admin'],
                ] as const).map(([label, key]) => {
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
        <Button type="secondary" onClick={onBack} icon="ap-icon-previous" iconPosition="left">
          Roster Analysis
        </Button>
        <Button
          type="primary"
          onClick={onNext}
          disabled={!rosterLoaded || !financials.loaded}
          icon="ap-icon-next"
          iconPosition="right"
        >
          {rosterLoaded && financials.loaded ? 'Integrated Analysis' : 'Load roster first'}
        </Button>
      </div>
    </div>
  );
}
