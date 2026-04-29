export function fmt(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  const a = Math.abs(val);
  if (a >= 1e12) return '$' + (val / 1e12).toFixed(2) + 'T';
  if (a >= 1e9)  return '$' + (val / 1e9).toFixed(1) + 'B';
  if (a >= 1e6)  return '$' + (val / 1e6).toFixed(1) + 'M';
  if (a >= 1e3)  return '$' + (val / 1e3).toFixed(0) + 'K';
  return '$' + Math.round(val).toLocaleString();
}

export function pct(val: number | null | undefined, total: number | null | undefined): number {
  if (!val || !total) return 0;
  return Math.min(100, Math.round((val / total) * 100));
}

export function laborPctStr(laborSpend: number | null | undefined, revenue: number | null | undefined): string {
  if (!laborSpend || !revenue) return 'N/A';
  const p = (laborSpend / revenue) * 100;
  if (p >= 1) return Math.round(p) + '%';
  if (p >= 0.1) return p.toFixed(1) + '%';
  return p.toFixed(2) + '%';
}

export function ebitdaMarginStr(ebitda: number | null | undefined, revenue: number | null | undefined): string {
  if (ebitda == null || revenue == null || !revenue) return 'N/A';
  return Math.round((ebitda / revenue) * 100) + '%';
}

export function parseMonetary(val: string): number | null {
  const s = String(val).replace(/[^0-9.-]/g, '');
  return s ? parseFloat(s) : null;
}
