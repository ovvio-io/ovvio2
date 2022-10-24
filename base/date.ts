import { isNumber } from './comparisons.ts';

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
