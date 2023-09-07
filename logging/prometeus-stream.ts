// import { BaseLogEntry, NormalizedLogEntry } from "./entry.ts";
// import {
//   MetricName,
//   MetricType,
//   logEntryIsMetric,
//   ServerMetricName,
// } from "./metrics.ts";
// import * as promClient from "https://deno.land/x/ts_prometheus@v0.3.0/mod.ts";
// import { kServerMetricNames } from "./metrics.ts";
// import { LogStream } from "./log.ts";

// export const kMetricTypes: Record<ServerMetricName, MetricType> = {
//   PeerResponseTime: "Count",
//   CommitsPersistTime: "Count",
//   CommitsPersistCount: "Count",
//   DeltaFormatSavings: "Histogram",
//   ServerStarted: "Count",
//   HttpStatusCode: "Count",
//   IncompatibleProtocolVersion: "Count",
// };

// export class PrometheusLogStream implements LogStream {
//   private registry = new promClient.Registry();
//   private metrics: Record<MetricName, promClient.Metric>;

//   constructor() {
//     this.metrics = {} as Record<MetricName, promClient.Metric>;
//     const serverMetricNames = kServerMetricNames;

//     for (const metricName of serverMetricNames) {
//       const metricType = kMetricTypes[metricName];
//       switch (metricType) {
//         case "Count":
//           this.metrics[metricName] = promClient.Counter.with({
//             name: `myapp_server_${metricName.toLowerCase()}_seconds`,
//             help: `${metricName} metric in seconds`,
//           });
//           break;
//         case "Gauge":
//           this.metrics[metricName] = promClient.Gauge.with({
//             name: `myapp_server_${metricName.toLowerCase()}_seconds`,
//             help: `${metricName} metric in seconds`,
//           });
//           break;
//         case "Histogram":
//           this.metrics[metricName] = promClient.Histogram.with({
//             name: `myapp_server_${metricName.toLowerCase()}_total`,
//             help: `Total count of ${metricName} metric`,
//             buckets: [],
//           });
//           break;
//         case "Summary":
//           this.metrics[metricName] = promClient.Summary.with({
//             name: `myapp_server_${metricName.toLowerCase()}_savings`,
//             help: `Summary of ${metricName} metric for savings`,
//           });
//           break;
//         default:
//           // Handle unsupported metric types
//           console.error(
//             `Unsupported metric type for ${metricName}: ${metricType}`
//           );
//           break;
//       }
//       this.registry.register(this.metrics[metricName]);
//     }
//   }

//   appendEntry<T extends BaseLogEntry>(e: NormalizedLogEntry<T>): void {
//     if (logEntryIsMetric(e)) {
//       // if (isServerMetric(e)) {
//       const metricName = e.name;
//       const metricType = kMetricTypes[metricName as ServerMetricName];

//       if (this.metrics[metricName]) {
//         switch (metricType) {
//           case "Count":
//             if (e.value !== undefined) {
//               (this.metrics[metricName] as promClient.Counter).inc(e.value);
//             }
//             break;
//           case "Gauge":
//             if (e.value !== undefined) {
//               (this.metrics[metricName] as promClient.Gauge).set(e.value);
//             }
//             break;
//           case "Histogram":
//             if (e.value !== undefined) {
//               (this.metrics[metricName] as promClient.Histogram).observe(
//                 e.value
//               );
//             }
//             break;
//           case "Summary":
//             if (e.value !== undefined) {
//               (this.metrics[metricName] as promClient.Summary).observe(e.value);
//             }
//             break;
//           default:
//             //TODO: check with Ofri
//             // Handle unsupported metric types
//             console.error(
//               `Unsupported metric type for ${metricName}: ${metricType}`
//             );
//             break;
//         }
//       }
//     }
//   }
//   // }
// }
import { BaseLogEntry, NormalizedLogEntry } from "./entry.ts";
import {
  MetricName,
  MetricType,
  logEntryIsMetric,
  ServerMetricName,
} from "./metrics.ts";
import { Collector } from "https://deno.land/x/ts_prometheus@v0.3.0/collector.ts";
import * as promClient from "https://deno.land/x/ts_prometheus@v0.3.0/mod.ts";
import { kServerMetricNames } from "./metrics.ts";
import { LogStream } from "./log.ts";

export const kMetricTypes: Record<ServerMetricName, MetricType> = {
  PeerResponseTime: "Count",
  CommitsPersistTime: "Count",
  CommitsPersistCount: "Count",
  DeltaFormatSavings: "Histogram",
  ServerStarted: "Count",
  HttpStatusCode: "Count",
  IncompatibleProtocolVersion: "Count",
};

export class PrometheusLogStream implements LogStream {
  private registry = new promClient.Registry(); // Initialize your Registry
  private metrics: Record<MetricName, Collector>;

  constructor() {
    this.metrics = {} as Record<MetricName, Collector>;
    const serverMetricNames = kServerMetricNames;

    for (const metricName of serverMetricNames) {
      const metricType = kMetricTypes[metricName];
      switch (metricType) {
        case "Count":
          this.metrics[metricName] = promClient.Counter.with({
            name: `myapp_server_${metricName.toLowerCase()}_seconds`,
            help: `${metricName} metric in seconds`,
          });
          break;
        case "Gauge":
          this.metrics[metricName] = promClient.Gauge.with({
            name: `myapp_server_${metricName.toLowerCase()}_seconds`,
            help: `${metricName} metric in seconds`,
          });
          break;
        case "Histogram":
          this.metrics[metricName] = promClient.Histogram.with({
            name: `myapp_server_${metricName.toLowerCase()}_total`,
            help: `Total count of ${metricName} metric`,
            buckets: [],
          });
          break;
        case "Summary":
          this.metrics[metricName] = promClient.Summary.with({
            name: `myapp_server_${metricName.toLowerCase()}_savings`,
            help: `Summary of ${metricName} metric for savings`,
          });
          break;
        default:
          // Handle unsupported metric types
          console.error(
            `Unsupported metric type for ${metricName}: ${metricType}`
          );
          break;
      }
      const metric = this.metrics[metricName];
      if (metric) {
        this.registry.register(metric);
      }
    }
  }

  appendEntry<T extends BaseLogEntry>(e: NormalizedLogEntry<T>): void {
    if (logEntryIsMetric(e)) {
      const metricName = e.name;
      const metricType = kMetricTypes[metricName as ServerMetricName];

      if (this.metrics[metricName]) {
        switch (metricType) {
          case "Count":
            if (e.value !== undefined) {
              (this.metrics[metricName] as promClient.Counter).inc(e.value);
            }
            break;
          case "Count":
            if (e.value !== undefined) {
              (this.metrics[metricName] as promClient.Counter).inc(e.value);
            }
            break;
          case "Gauge":
            if (e.value !== undefined) {
              (this.metrics[metricName] as promClient.Gauge).set(e.value);
            }
            break;
          case "Histogram":
            if (e.value !== undefined) {
              (this.metrics[metricName] as Histogram).observe(e.value);
            }
            break;
          case "Summary":
            if (e.value !== undefined) {
              (this.metrics[metricName] as Summary).observe(e.value);
            }
            break;
          default:
            // Handle unsupported metric types
            console.error(
              `Unsupported metric type for ${metricName}: ${metricType}`
            );
            break;
        }
      }
    }
  }
}
