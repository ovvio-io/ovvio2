import { BaseLogEntry } from './entry.ts';

export type MetricName =
  | 'PeerResponseTime'
  | 'CommitsPersistTime'
  | 'CommitsPersistCount'
  | 'DeltaFormatSavings';

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
}
