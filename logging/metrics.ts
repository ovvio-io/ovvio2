import { BaseLogEntry, NormalizedLogEntry, Severity } from './entry.ts';

export const kServerMetricNames = [
  'PeerResponseTime',
  'CommitsPersistTime',
  'CommitsPersistCount',
  'DeltaFormatSavings',
  'ServerStarted',
  'HttpStatusCode',
  'IncompatibleProtocolVersion',
  'InternalServerError',
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
export type HTTPMethod =
  | 'OPTIONS'
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'TRACE'
  | 'CONNECT'
  | 'PATCH';

export type MetricSeverity = Extract<Severity, 'METRIC' | 'ERROR'>;

export interface BaseMetricLogEntry<T extends MetricSeverity = MetricSeverity>
  extends BaseLogEntry {
  severity: T;
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

export type MetricLogWithHTTP<T extends MetricLogWithURL = MetricLogWithURL> =
  T & {
    method?: HTTPMethod;
  };

export type MetricLogWithError<
  T extends BaseMetricLogEntry = BaseMetricLogEntry
> = T & {
  error?: string;
};

export type MetricLogEntryType<N extends MetricName> =
  N extends 'PeerResponseTime'
    ? MetricLogWithURL
    : N extends 'HttpStatusCode'
    ? MetricLogWithHTTP
    : N extends 'InternalServerError'
    ? Required<MetricLogWithError<BaseMetricLogEntry<'ERROR'>>> &
        MetricLogWithHTTP<BaseMetricLogEntry<'ERROR'>>
    : BaseMetricLogEntry;

export type MetricLogEntry = MetricLogEntryType<`${MetricName}`>;

export function logEntryIsMetric(
  entry: NormalizedLogEntry<BaseLogEntry>
): entry is NormalizedLogEntry<MetricLogEntry> {
  if (
    (entry.severity !== 'METRIC' && entry.severity !== 'ERROR') ||
    typeof entry.name !== 'string'
  ) {
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
