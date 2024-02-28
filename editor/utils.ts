import { kSecondMs } from '../base/date.ts';

export const SELECTION_TTL_MS = 10 * kSecondMs;
export function expirationForSelection(): Date {
  const d = new Date();
  d.setTime(d.getTime() + SELECTION_TTL_MS);
  return d;
}
