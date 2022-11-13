import { BaseLogEntry } from './entry.ts';

export const kServerMetricNames = [
  'PeerResponseTime',
  'CommitsPersistTime',
  'CommitsPersistCount',
  'DeltaFormatSavings',
  'ServerStarted',
  'HttpStatusCode',
] as const;

export type ServerMetricName = typeof kServerMetricNames[number];

export const kClientMetricNames = ['QueryCancelled', 'QueryCompleted'] as const;

export type ClientMetricName = typeof kClientMetricNames[number];

export type MetricName = ServerMetricName | ClientMetricName;

export type MetricUnit = 'Count' | 'Bytes' | 'Milliseconds' | 'Percent';
export type MetricType = 'Count' | 'Gauge' | 'Histogram' | 'Summary';

export interface MetricLogEntry extends BaseLogEntry {
  severity: 'INFO';
  name: MetricName;
  value: number;
  unit: MetricUnit;
  type?: MetricType;
  help?: string; // Help message for users of this metric
  url?: string;
  urls?: string[];
  queryName?: string;
  numberOfResults?: number;
}

export function isClientMetric(m: MetricLogEntry): boolean {
  return (kClientMetricNames as readonly string[]).includes(m.name);
}

export function isServerMetric(m: MetricLogEntry): boolean {
  return (kServerMetricNames as readonly string[]).includes(m.name);
}
