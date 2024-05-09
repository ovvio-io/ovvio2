import React from 'react';
import { renderToString } from 'react-dom/server';
import { UsageStats, emptyUsageStats, usageStatsJoin } from './usgae.tsx';

interface UsageStatsTableProps {
  orgId: string;
  stats: UsageStats;
}

function UsageStatsTable({ stats, orgId }: UsageStatsTableProps) {
  return (
    <div>
      <h3>{orgId}</h3>
      <table width="600" style={{ border: '1px solid black' }}>
        <tr>
          <th id={`${orgId}_title`} align="center">
            Time Frame
          </th>
          <th id={`${orgId}_numUsers`} align="center">
            Unique Users
          </th>
          <th id={`${orgId}_uniqueDomains`} align="center">
            Unique Email Domains
          </th>
        </tr>
        <tr>
          <td headers={`${orgId}_title`} align="center">
            Last 24 Hours
          </td>
          <td headers={`${orgId}_numUsers`} align="center">
            {stats.dau.toLocaleString()}
          </td>
          <td headers={`${orgId}_uniqueDomains`} align="center">
            {stats.dauEmails.join(', ')}
          </td>
        </tr>
        <tr>
          <td headers={`${orgId}_title`} align="center">
            Last 7 Days
          </td>
          <td headers={`${orgId}_numUsers`} align="center">
            {stats.wau.toLocaleString()}
          </td>
          <td headers={`${orgId}_uniqueDomains`} align="center">
            {stats.wauEmails.join(', ')}
          </td>
        </tr>
        <tr>
          <td headers={`${orgId}_title`} align="center">
            Last 30 Days
          </td>
          <td headers={`${orgId}_numUsers`} align="center">
            {stats.mau.toLocaleString()}
          </td>
          <td headers={`${orgId}_uniqueDomains`} align="center">
            {stats.mauEmails.join(', ')}
          </td>
        </tr>
      </table>
    </div>
  );
}

interface AnalyticsReportProps {
  report: Map<string, UsageStats>;
}

export function AnalyticsReport({ report }: AnalyticsReportProps) {
  const result = [];
  let aggregate = emptyUsageStats();
  for (const orgId of Array.from(report.keys()).sort()) {
    const stats = report.get(orgId)!;
    result.push(<UsageStatsTable orgId={orgId} stats={stats} />);
    aggregate = usageStatsJoin(aggregate, stats);
  }
  return (
    <div>
      <UsageStatsTable orgId="Total" stats={aggregate} />
      {result}
    </div>
  );
}

export function reportToHTML(report: Map<string, UsageStats>): string {
  return renderToString(<AnalyticsReport report={report} />);
}
