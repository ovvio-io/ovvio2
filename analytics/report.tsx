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
      <h2>{orgId}</h2>
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
      <h4>Contents</h4>
      <div>
        Total Users:{' '}
        <span style={{ fontSize: 'bold' }}>
          {stats.totalUsers.toLocaleString()}
        </span>
      </div>
      <div>
        Total Workspaces:{' '}
        <span style={{ fontSize: 'bold' }}>
          {stats.totalWorkspaces.toLocaleString()}
        </span>
      </div>
      <div>
        Total Tags:{' '}
        <span style={{ fontSize: 'bold' }}>
          {stats.totalTags.toLocaleString()}
        </span>
      </div>
      <div>
        Total Notes:{' '}
        <span style={{ fontSize: 'bold' }}>
          {stats.totalNotes.toLocaleString()}
        </span>
      </div>
      <div>
        Total Tasks:{' '}
        <span style={{ fontSize: 'bold' }}>
          {stats.totalTasks.toLocaleString()}
        </span>
      </div>
      <div>
        Total Events:{' '}
        <span style={{ fontSize: 'bold' }}>
          {stats.totalEvents.toLocaleString()}
        </span>
      </div>
      <h4>Technical data</h4>
      <div>
        Total Repositories:{' '}
        <span style={{ fontSize: 'bold' }}>
          {stats.totalRepos.toLocaleString()}
        </span>
      </div>
      <div>
        Total Keys:{' '}
        <span style={{ fontSize: 'bold' }}>
          {stats.totalKeys.toLocaleString()}
        </span>
      </div>
      <div>
        Total Commits:{' '}
        <span style={{ fontSize: 'bold' }}>
          {stats.totalCommits.toLocaleString()}
        </span>
      </div>
      <div>
        Max Commits / Repo:{' '}
        <span style={{ fontSize: 'bold' }}>
          {stats.maxCommitsPerRepo.toLocaleString()}
        </span>
      </div>
      <div>
        Avg Commits / Repo:{' '}
        <span style={{ fontSize: 'bold' }}>
          {stats.avgCommitsPerRepo.toLocaleString()}
        </span>
      </div>
      <div>
        Commits older than 30 days:{' '}
        <span style={{ fontSize: 'bold' }}>
          {stats.commitsOlderThan30Days.toLocaleString()}
        </span>
      </div>
      <div>
        Full commits:{' '}
        <span style={{ fontSize: 'bold' }}>
          {stats.fullCommitsCount.toLocaleString()} (
          {stats.fullCommitsSize.toLocaleString()} bytes)
        </span>
      </div>
      <div>
        Delta commits:{' '}
        <span style={{ fontSize: 'bold' }}>
          {stats.deltaCommitsCount.toLocaleString()} (
          {stats.deltaCommitsSize.toLocaleString()} bytes)
        </span>
      </div>
      <div>
        Delta Savings:{' '}
        <span style={{ fontSize: 'bold' }}>
          {stats.deltaCommitSavings.toLocaleString()} bytes
        </span>
      </div>
      <div>
        Total Heads:{' '}
        <span style={{ fontSize: 'bold' }}>
          {stats.totalHeadsSize.toLocaleString()} bytes
        </span>
      </div>
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
