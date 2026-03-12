export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getPeriodRange(month: string): { start: Date, end: Date } {
  const [year, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, m, 0, 23, 59, 59));
  return { start, end };
}

export function getDayRange(month: string, day: string): { start: Date, end: Date } {
  const [year, m] = month.split('-').map(Number);
  const d = Number(day);
  const start = new Date(Date.UTC(year, m - 1, d, 0, 0, 0));
  const end = new Date(Date.UTC(year, m - 1, d, 23, 59, 59));
  return { start, end };
}

export function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(year, m - 1, 1);
  return date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase());
}

export type PeriodMode = 'month' | 'quarter' | 'year'

export function getQuarterRange(month: string): { start: Date, end: Date } {
  const [year, m] = month.split('-').map(Number)
  const qStart = Math.floor((m - 1) / 3) * 3
  const start = new Date(Date.UTC(year, qStart, 1, 0, 0, 0))
  const end   = new Date(Date.UTC(year, qStart + 3, 0, 23, 59, 59))
  return { start, end }
}

export function getYearRange(month: string): { start: Date, end: Date } {
  const [year] = month.split('-').map(Number)
  const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0))
  const end   = new Date(Date.UTC(year, 12, 0, 23, 59, 59))
  return { start, end }
}

export function getQuarterLabel(month: string): string {
  const [year, m] = month.split('-').map(Number)
  return `Q${Math.ceil(m / 3)} ${year}`
}

export function getYearLabel(month: string): string {
  return month.split('-')[0]
}

export function getPrevQuarterMonth(month: string): string {
  const [year, m] = month.split('-').map(Number)
  const qStart = Math.floor((m - 1) / 3) * 3 + 1
  const d = new Date(year, qStart - 1 - 3, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function getNextQuarterMonth(month: string): string {
  const [year, m] = month.split('-').map(Number)
  const qStart = Math.floor((m - 1) / 3) * 3 + 1
  const d = new Date(year, qStart - 1 + 3, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function getPrevYearMonth(month: string): string {
  const [year, m] = month.split('-').map(Number)
  return `${year - 1}-${String(m).padStart(2, '0')}`
}

export function getNextYearMonth(month: string): string {
  const [year, m] = month.split('-').map(Number)
  return `${year + 1}-${String(m).padStart(2, '0')}`
}
