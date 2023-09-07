<<<<<<< Updated upstream
import { BaseLogEntry, NormalizedLogEntry } from './entry.ts';
=======
import { NormalizedLogEntry, BaseLogEntry } from "./entry.ts";
>>>>>>> Stashed changes

export const kServerMetricNames = [
  "PeerResponseTime",
  "CommitsPersistTime",
  "CommitsPersistCount",
  "DeltaFormatSavings",
  "ServerStarted",
  "HttpStatusCode",
  "IncompatibleProtocolVersion",
] as const;

export type ServerMetricName = (typeof kServerMetricNames)[number];

export const kClientMetricNames = [
  "QueryFired",
  "QueryCancelled",
  "QueryCompleted",
  "FullTextIndexingTime",
] as const;

<<<<<<< Updated upstream
export const kMetricNames = [...kServerMetricNames, ...kClientMetricNames];

=======
>>>>>>> Stashed changes
export type ClientMetricName = (typeof kClientMetricNames)[number];

export type MetricName = ServerMetricName | ClientMetricName;

export type MetricUnit = "Count" | "Bytes" | "Milliseconds" | "Percent";
export type MetricType = "Count" | "Gauge" | "Histogram" | "Summary";

export const MetricTypes: Record<ServerMetricName, MetricType> = {
  PeerResponseTime: "Count",
  CommitsPersistTime: "Count",
  CommitsPersistCount: "Count",
  DeltaFormatSavings: "Count",
  ServerStarted: "Count",
  HttpStatusCode: "Count",
  IncompatibleProtocolVersion: "Count",
};

export interface MetricLogEntry extends BaseLogEntry {
  severity: "INFO";
  name: MetricName;
  value: number;
  unit: MetricUnit;
  help?: string; // Help message for users of this metric
  url?: string;
  urls?: string[];
  queryName?: string;
  itemCount?: number;
  peerVersion?: number;
  localVersion?: number;
}

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
