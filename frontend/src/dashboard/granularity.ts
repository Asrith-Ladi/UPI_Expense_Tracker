import type { Transaction } from '../types/transaction';

export type Granularity = 'daily' | 'month' | 'year';

const DAY_MS = 1000 * 60 * 60 * 24;
/** ~1 month — enables month view */
export const MONTH_SPAN_DAYS = 30;
/** 2 years — enables yearly aggregation */
export const TWO_YEAR_SPAN_DAYS = 730;

export function dataSpanDays(dates: string[]): number {
  if (dates.length === 0) return 0;
  const ts = dates.map((d) => new Date(d + 'T12:00:00').getTime());
  const min = Math.min(...ts);
  const max = Math.max(...ts);
  return Math.max(0, (max - min) / DAY_MS);
}

/** Which period buttons are available for this date span */
export function enabledGranularities(daysSpan: number): Granularity[] {
  const g: Granularity[] = ['daily'];
  if (daysSpan >= MONTH_SPAN_DAYS) g.push('month');
  if (daysSpan >= TWO_YEAR_SPAN_DAYS) g.push('year');
  return g;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export type TimelinePoint = {
  period: string;
  label: string;
  Credit: number;
  Debit: number;
};

export function aggregateTimeline(rows: Transaction[], granularity: Granularity): TimelinePoint[] {
  const acc = new Map<string, { Credit: number; Debit: number; label: string }>();

  for (const row of rows) {
    const date = row.Date || '';
    let period: string;
    let label: string;

    if (granularity === 'daily') {
      period = date;
      label = date;
    } else if (granularity === 'month') {
      period = date.slice(0, 7);
      label = monthLabel(period);
    } else {
      period = date.slice(0, 4);
      label = period;
    }

    if (!acc.has(period)) {
      acc.set(period, { Credit: 0, Debit: 0, label });
    }
    const b = acc.get(period)!;
    b.Credit += row.Credit || 0;
    b.Debit += row.Debit || 0;
    b.label = label;
  }

  return Array.from(acc.entries())
    .map(([period, v]) => ({
      period,
      label: v.label,
      Credit: v.Credit,
      Debit: v.Debit,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}
