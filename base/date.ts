import { isNumber } from './comparisons.ts';

export const kDayMs = 24 * 60 * 60 * 1000;
export const kWeekMs = 7 * kDayMs;

export function serializeDate(date: Date): number {
  if (date instanceof Date) {
    return date.getTime() / 1000;
  } else if (isNumber(date)) {
    return date;
  }
  throw new Error('Unsupported date value');
}

export function deserializeDate(d: number | string | Date): Date {
  if (typeof d === 'string') {
    d = parseFloat(d);
  }
  if (typeof d === 'number') {
    const r = new Date();
    if (d < 1000000000000) {
      d *= 1000;
    }
    r.setTime(d);
    return r;
  } else if (d instanceof Date) {
    return d;
  }
  throw new Error('Unsupported date value');
}

export function formatTimeDiff(date: Date) {
  const now = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  if (year === now.getFullYear()) {
    if (month === now.getMonth()) {
      const daysDiff = now.getDate() - day;
      if (daysDiff === 0) {
        return 'Today';
      }
      if (daysDiff === 1) {
        return 'Yesterday';
      }
    }
  }

  return date.toLocaleDateString(undefined, {
    dateStyle: 'medium',
  });
}

export function numberOfDaysInCurrentMonth(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function numberOfWorkDaysLeftInWeek(): number {
  return Math.max(0, 6 - new Date().getDay() - 1);
}
