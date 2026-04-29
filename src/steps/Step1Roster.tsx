import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button, DragAndDrop, TabNavigation, Tab, Tag, type UploadFile } from '@alixpartners/ui-components';
import type { RosterData, AIState, PasteState } from '../types';
import { processRoster, DEMO_ROSTER } from '../utils/roster';
import { fmt } from '../utils/format';
import { sortBySeniority } from '../utils/seniority';
import { buildRosterNarrative, buildRosterAnswer } from '../utils/narrative';
import HBarChart from '../components/HBarChart';
import AICard from '../components/AICard';

const ROSTER_QUESTIONS = [
  'What does the seniority distribution tell us?',
  'Is the labor spend concentrated or well-distributed?',
  'Where is the geographic risk?',
  'What function is most central to the business model?',
  'Are there signs this org is a restructuring target?',
];

interface Props {
  roster: { loaded: boolean; data: RosterData | null; fileName: string | null };
  ai: AIState;
  onLoad: (data: RosterData, fileName: string) => void;
  onReset: () => void;
  onAI: (ai: Partial<AIState>) => void;
  onNext: () => void;
}

export default function Step1Roster({ roster, ai, onLoad, onReset, onAI, onNext }: Props) {
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [paste, setPaste] = useState<PasteState>({ raw: null, headers: null, preview: null });
  const pasteRef = useRef<HTMLDivElement>(null);

  function parseExcel(file: File) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) { alert('Please upload an Excel file.'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target!.result as ArrayBuffer, { type: 'array' });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      try {
        onLoad(processRoster(rows), file.name);
      } catch (err) {
        alert(String(err));
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleDragAndDropUpload(files: UploadFile[]) {
    const f = files[0]?.file;
    if (f) parseExcel(f);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (!text.trim()) return;
    const lines = text.trim().split('\n').map((r) => r.split('\t').map((c) => c.trim()));
    if (lines.length < 2) return;
    const headers = lines[0];
    const rows = lines.slice(1).filter((r) => r.some((c) => c));
    const data = rows.map((row) => {
      const o: Record<string, string> = {};
      headers.forEach((h, i) => { o[h] = row[i] || ''; });
      return o;
    });
    setPaste({ raw: data, headers, preview: data.slice(0, 4) });
  }

  function pasteColStatus() {
    const headers = (paste.headers || []).map((h) => h.toLowerCase());
    return [
      { label: 'Job Function', kws: ['function', 'department', 'dept'] },
      { label: 'Seniority',    kws: ['seniority', 'level', 'grade'] },
      { label: 'Country',      kws: ['country', 'location', 'region'] },
      { label: 'Fully Loaded Cost', kws: ['flc', 'fully loaded', 'cost', 'salary', 'compensation', 'spend'] },
    ].map((r) => ({ label: r.label, found: headers.some((h) => r.kws.some((kw) => h.includes(kw))) }));
  }

  function confirmPaste() {
    if (!paste.raw) return;
    try {
      onLoad(processRoster(paste.raw), `Pasted data — ${paste.raw.length} rows`);
    } catch (err) {
      alert(String(err));
    }
  }

  function generateNarrative() {
    onAI({ loading: true, chat: [] });
    setTimeout(() => {
      onAI({ text: buildRosterNarrative(roster.data!), loading: false });
    }, 700);
  }

  function askQuestion(q: string) {
    const answer = buildRosterAnswer(roster.data!, q);
    onAI({ chat: [...ai.chat, { role: 'user', text: q }, { role: 'assistant', text: answer }] });
  }

  if (!roster.loaded) {
    return (
      <div>
        <TabNavigation>
          <Tab label="Upload File" active={mode === 'upload'} onClick={() => setMode('upload')} />
          <Tab label="Paste from Spreadsheet" active={mode === 'paste'} onClick={() => setMode('paste')} />
        </TabNavigation>

        {mode === 'upload' && (
          <div style={{ marginTop: 16 }}>
            <DragAndDrop
              label="LinkedIn Roster Export"
              fileExtensionsAllowed={['.xlsx', '.xls']}
              type="single"
              onUpload={handleDragAndDropUpload}
              texts={{
                drag: 'Drop your Excel file here or',
                browse: 'browse',
                constraints: () => 'Supports .xlsx and .xls files · Columns: Job Function · Seniority · Country · Fully Loaded Cost',
              }}
            />
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <Button type="tertiary" size="sm" onClick={() => onLoad(DEMO_ROSTER, 'demo-roster.xlsx (synthetic)')}>
                Use demo data instead
              </Button>
            </div>
          </div>
        )}

        {mode === 'paste' && (
          <div style={{ marginTop: 16 }}>
            {!paste.raw ? (
              <div>
                <div
                  ref={pasteRef}
                  className="paste-zone"
                  tabIndex={0}
                  onPaste={handlePaste}
                  onClick={() => pasteRef.current?.focus()}
                >
                  <div style={{ padding: '52px 24px', textAlign: 'center', pointerEvents: 'none' }}>
                    <div style={{ fontSize: 38, marginBottom: 12 }}></div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#333', marginBottom: 6 }}>Click here, then paste your data</div>
                    <div style={{ fontSize: 12, color: '#888' }}>Select the rows in your Excel file (including the header row), copy with Ctrl+C, then press Ctrl+V here</div>
                    <div style={{ fontSize: 11, color: '#bbb', marginTop: 10 }}>Expected columns: Job Function · Seniority · Country · Fully Loaded Cost</div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <Button type="tertiary" size="sm" onClick={() => onLoad(DEMO_ROSTER, 'demo-roster.xlsx (synthetic)')}>
                    Use demo data instead
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="paste-preview-header">
                  <div><strong>{paste.raw.length}</strong> rows detected &nbsp;·&nbsp; <span>{paste.headers?.length}</span> columns</div>
                  <Button type="tertiary" size="sm" onClick={() => setPaste({ raw: null, headers: null, preview: null })}>
                    ↩ Paste again
                  </Button>
                </div>

                <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {pasteColStatus().map((col) => (
                    <Tag
                      key={col.label}
                      type={col.found ? 'success' : 'error'}
                      size="sm"
                      structure="solid"
                      label={(col.found ? '✓ ' : '✗ ') + col.label}
                      noIcon
                    />
                  ))}
                </div>

                <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
                  <table className="data-table">
                    <thead>
                      <tr>{paste.headers?.map((h) => <th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {paste.preview?.map((row, i) => (
                        <tr key={i}>{paste.headers?.map((h) => <td key={h}>{row[h]}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                  {(paste.raw?.length || 0) > 4 && (
                    <div style={{ padding: '8px 12px', fontSize: 11, color: '#aaa', borderTop: '1px solid #f0f0f0' }}>
                      Showing 4 of {paste.raw?.length} rows
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Button type="primary" onClick={confirmPaste} disabled={!pasteColStatus().every((c) => c.found)}>
                    Analyze this data →
                  </Button>
                  {!pasteColStatus().every((c) => c.found) && (
                    <span style={{ fontSize: 12, color: '#b91c1c' }}>Missing required columns — check your data</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const d = roster.data!;
  const fnData = Object.entries(d.by_function).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  const snData = sortBySeniority(Object.entries(d.by_seniority)).map(([name, value]) => ({ name, value }));
  const costFnData = Object.entries(d.cost_by_function).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));

  const countryRows = Object.entries(d.by_country)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([country, count]) => ({ country, count, pct: Math.round((count / d.total_headcount) * 100), cost: d.cost_by_country[country] || 0 }));

  return (
    <div>
      <div className="file-bar">
        <span><strong>{roster.fileName}</strong> &nbsp;·&nbsp; {d.total_headcount.toLocaleString()} employees</span>
        <Button type="secondary" size="sm" onClick={onReset} icon="ap-icon-upload">
          New file
        </Button>
      </div>

      {/* KPIs Row 1 */}
      <div className="metrics">
        <div className="metric">
          <div className="metric-label">Total Headcount</div>
          <div className="metric-value">{d.total_headcount.toLocaleString()}</div>
          <div className="metric-sub">employees</div>
        </div>
        <div className="metric">
          <div className="metric-label">Total Labor Spend</div>
          <div className="metric-value">{fmt(d.total_labor_spend)}</div>
          <div className="metric-sub">fully loaded annual</div>
        </div>
        <div className="metric">
          <div className="metric-label">Avg Cost / Employee</div>
          <div className="metric-value">{fmt(d.avg_cost_per_employee)}</div>
          <div className="metric-sub">per year</div>
        </div>
        <div className={`metric ${d.median_cost < d.avg_cost_per_employee * 0.7 ? 'accent' : ''}`}>
          <div className="metric-label">Median Cost / Employee</div>
          <div className="metric-value">{fmt(d.median_cost)}</div>
          <div className="metric-sub">{d.median_cost < d.avg_cost_per_employee * 0.7 ? '⚠ exec pay skew' : 'vs avg'}</div>
        </div>
      </div>

      {/* KPIs Row 2 */}
      <div className="metrics" style={{ marginTop: -4 }}>
        <div className="metric">
          <div className="metric-label">Functions</div>
          <div className="metric-value">{Object.keys(d.by_function).length}</div>
          <div className="metric-sub">unique departments</div>
        </div>
        <div className="metric">
          <div className="metric-label">Countries</div>
          <div className="metric-value">{d.num_countries}</div>
          <div className="metric-sub">geographic footprint</div>
        </div>
        <div className={`metric ${d.senior_ratio > 25 ? 'accent' : ''}`}>
          <div className="metric-label">Senior Ratio</div>
          <div className="metric-value">{d.senior_ratio}%</div>
          <div className="metric-sub">{d.senior_count} VP / Director level</div>
        </div>
        <div className={`metric ${d.cost_concentration > 60 ? 'accent' : ''}`}>
          <div className="metric-label">Cost Concentration</div>
          <div className="metric-value">{d.cost_concentration}%</div>
          <div className="metric-sub">top 25% earners' share of spend</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-title">Headcount by Function</div>
          <HBarChart data={fnData} color="multi" />
        </div>
        <div className="card">
          <div className="card-title">Seniority Distribution</div>
          <HBarChart data={snData} color="multi" />
        </div>
      </div>

      <div className="card">
        <div className="card-title">Labor Spend by Function</div>
        <HBarChart data={costFnData} color="#498E2B" formatValue={fmt} />
      </div>

      {/* Country table */}
      <div className="card">
        <div className="card-title">Geographic Breakdown (Top 10)</div>
        <table className="data-table">
          <thead>
            <tr><th>Country</th><th>Headcount</th><th>% Total</th><th>Labor Spend</th><th /></tr>
          </thead>
          <tbody>
            {countryRows.map((row) => (
              <tr key={row.country}>
                <td>{row.country}</td>
                <td>{row.count.toLocaleString()}</td>
                <td>{row.pct}%</td>
                <td>{fmt(row.cost)}</td>
                <td>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${row.pct}%` }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AICard state={ai} questions={ROSTER_QUESTIONS} onGenerate={generateNarrative} onQuestion={askQuestion} />

      <div className="step-nav">
        <span />
        <Button type="primary" onClick={onNext} icon="ap-icon-next" iconPosition="right">
          Continue: Financial Data
        </Button>
      </div>
    </div>
  );
}
