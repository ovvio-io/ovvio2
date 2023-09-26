import { BaseLogEntry, NormalizedLogEntry, Severity } from './entry.ts';

export const kServerMetricNames = [
  'PeerResponseTime',
  'CommitsPersistTime',
  'CommitsPersistCount',
  'DeltaFormatSavings',
  'ServerStarted',
  'HttpStatusCode',
  'IncompatibleProtocolVersion',
] as const;

export const kClientMetricNames = [
  'QueryFired',
  'QueryCancelled',
  'QueryCompleted',
  'FullTextIndexingTime',
] as const;

export const kMetricNames = [...kServerMetricNames, ...kClientMetricNames];

export type ServerMetricName = (typeof kServerMetricNames)[number];
export type ClientMetricName = (typeof kClientMetricNames)[number];
export type MetricName = ServerMetricName | ClientMetricName;
export type MetricUnit = 'Count' | 'Bytes' | 'Milliseconds' | 'Percent';
export type MetricType = 'Count' | 'Gauge' | 'Histogram' | 'Summary';

export interface BaseMetricLogEntry extends BaseLogEntry {
  severity: Severity & ('INFO' | 'DEBUG');
  name: MetricName;
  value: number;
  unit: MetricUnit;
  help?: string; // Help message for users of this metric
}

export type MetricLogWithURL<
  T extends BaseMetricLogEntry = BaseMetricLogEntry
> = T & {
  url?: string;
  urls?: string[];
};

export type MetricLogEntryType<N extends MetricName> =
  N extends 'PeerResponseTime' ? MetricLogWithURL : BaseMetricLogEntry;

export type MetricLogEntry = MetricLogEntryType<`${MetricName}`>;

export function logEntryIsMetric(
  entry: NormalizedLogEntry<BaseLogEntry>
): entry is NormalizedLogEntry<MetricLogEntry> {
  if (entry.severity !== 'INFO' || typeof entry.name !== 'string') {
    return false;
  }
  return (kMetricNames as readonly string[]).includes(entry.name);
}

export function isClientMetric(m: MetricLogEntry): boolean {
  return (kClientMetricNames as readonly string[]).includes(m.name);
}

export function isServerMetric(m: MetricLogEntry): boolean {
  return (kServerMetricNames as readonly string[]).includes(m.name);
}

export function isMetricWithURL(m: MetricLogEntry): m is MetricLogWithURL {
  return (
    typeof m.url === 'string' ||
    (m.urls instanceof Array &&
      m.urls.length > 0 &&
      typeof m.urls[0] === 'string')
  );
}
