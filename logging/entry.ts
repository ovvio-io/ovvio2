import { CoreObject } from '../base/core-types/base.ts';
import { ReadonlyJSONObject } from '../base/interfaces.ts';

export type Severity =
  | 'EMERGENCY'
  | 'ALERT'
  | 'CRITICAL'
  | 'ERROR'
  | 'WARNING'
  | 'NOTICE'
  | 'METRIC'
  | 'EVENT'
  | 'INFO'
  | 'DEBUG'
  | 'DEFAULT';

export const SeverityCodes: { [key in Severity]: number } = {
  EMERGENCY: 800,
  ALERT: 700,
  CRITICAL: 600,
  ERROR: 500,
  WARNING: 400,
  NOTICE: 300,
  METRIC: 250,
  EVENT: 225,
  INFO: 200,
  DEBUG: 100,
  DEFAULT: 0,
};

export function SeverityCodeFromSeverity(s: Severity): number {
  return SeverityCodes[s];
}

export function SeverityFromCode(code: number): Severity {
  switch (code) {
    case SeverityCodes.EMERGENCY:
      return 'EMERGENCY';

    case SeverityCodes.ALERT:
      return 'ALERT';

    case SeverityCodes.CRITICAL:
      return 'CRITICAL';

    case SeverityCodes.ERROR:
      return 'ERROR';

    case SeverityCodes.WARNING:
      return 'WARNING';

    case SeverityCodes.NOTICE:
      return 'NOTICE';

    case SeverityCodes.INFO:
      return 'INFO';

    case SeverityCodes.METRIC:
      return 'METRIC';

    case SeverityCodes.EVENT:
      return 'EVENT';

    case SeverityCodes.DEBUG:
      return 'DEBUG';

    case SeverityCodes.DEFAULT:
    default:
      return 'DEFAULT';
  }
}

export interface BaseLogEntry extends CoreObject {
  severity: Severity;
  message?: string;
}

export interface TechnicalLogData extends CoreObject {
  severityCode: number;
  timestamp: Date; // ISO 8601 string
  logId: string;

  t_denoVersion: string;
  t_v8Version: string;
  t_tsVersion: string;
  // Hostname
  t_hostname: string;
  // OS Process ID
  t_pid: number;
  // OS Build information
  t_osBuild: ReadonlyJSONObject;
  // The main module that was executed, if available
  t_mainUrl: string;
  // Path to executable (deno/packaged)
  t_execPath: string;
}

export interface GenericLogEntry extends BaseLogEntry {
  severity: 'INFO' | 'DEBUG' | 'DEFAULT';
  message: string;
}

export type NormalizedLogEntry<T extends BaseLogEntry = BaseLogEntry> = T &
  TechnicalLogData;

export function normalizeLogEntry<T extends BaseLogEntry = BaseLogEntry>(
  e: T
): NormalizedLogEntry<T> {
  const res: NormalizedLogEntry<T> = e as unknown as NormalizedLogEntry<T>;
  res.severityCode = SeverityCodes[e.severity];
  res.timestamp = new Date();
  res.logId = uniqueId();
  if (typeof Deno !== 'undefined') {
    try {
      res.t_denoVersion = Deno.version.deno;
      res.t_v8Version = Deno.version.v8;
      res.t_tsVersion = Deno.version.typescript;
      res.t_hostname = Deno.hostname();
      res.t_pid = Deno.pid;
      res.t_osBuild = Deno.build;
      res.t_mainUrl = Deno.mainModule;
      res.t_execPath = Deno.execPath();
    } catch (_e: unknown) {
      // Ignore any errors here
    }
  }
  for (const field of Object.keys(res)) {
    if (typeof res[field] === 'undefined') {
      delete res[field];
    }
  }
  return res;
}

function uniqueId(length = 20): string {
  // Alphanumeric characters
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let autoId = '';
  for (let i = 0; i < length; i++) {
    autoId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return autoId;
}
