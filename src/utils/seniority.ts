const SENIORITY_ORDER = [
  'executive', 'president', 'c-level', 'c level', 'vp', 'vice president',
  'director', 'senior director', 'principal', 'senior manager', 'manager',
  'senior', 'lead', 'staff', 'analyst', 'associate', 'specialist',
  'coordinator', 'entry', 'junior', 'intern',
];

function seniorityRank(s: string): number {
  const lower = s.toLowerCase();
  const r = SENIORITY_ORDER.findIndex((r) => lower.includes(r));
  return r === -1 ? 99 : r;
}

export function sortBySeniority<T extends [string, unknown]>(entries: T[]): T[] {
  return [...entries].sort((a, b) => seniorityRank(a[0]) - seniorityRank(b[0]));
}
