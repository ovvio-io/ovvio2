import { JSONObject, ReadonlyJSONObject } from '../base/interfaces.ts';

export type Severity =
  | 'EMERGENCY'
  | 'ALERT'
  | 'CRITICAL'
  | 'ERROR'
  | 'WARNING'
  | 'NOTICE'
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
  INFO: 200,
  DEBUG: 100,
  DEFAULT: 0,
};

export interface TechInfo extends JSONObject {
  // Runtime version
  vm: ReadonlyJSONObject;
  // Hostname
  hostname: string;
  // OS Process ID
  pid: number;
  // OS Build information
  osBuild: ReadonlyJSONObject;
  // The main module that was executed, if available
  mainUrl: string;
  // Path to executable (deno/packaged)
  execPath: string;
}

export interface BaseLogEntry extends JSONObject {
  severity: Severity;
}

export interface GenericLogEntry extends BaseLogEntry {
  severity: 'INFO' | 'DEBUG' | 'DEFAULT';
  message: string;
}

export interface NormalizedLogEntry extends BaseLogEntry {
  techInfo: TechInfo;
  severityCode: number;
  timestamp: number;
}

export function normalizeLogEntry<T extends BaseLogEntry = BaseLogEntry>(
  e: T
): NormalizedLogEntry {
  const res: JSONObject = e;
  const techInfo: TechInfo = {
    vm: Deno.version,
    hostname: Deno.hostname(),
    pid: Deno.pid,
    osBuild: Deno.build,
    mainUrl: Deno.mainModule,
    execPath: Deno.execPath(),
  };
  res.techInfo = techInfo;
  res.severityCode = SeverityCodes[e.severity];
  res.timestamp = Date.now();
  return res as NormalizedLogEntry;
}
