import { Query } from '../../../../../cfds/client/graph/query.ts';
import { Note, User } from '../../../../../cfds/client/graph/vertices/index.ts';
import { Workspace } from '../../../../../cfds/client/graph/vertices/workspace.ts';
import React, { useState } from 'react';
import { MenuItem } from '../../../../../styles/components/menu.tsx';

interface TimeTrackingEntry {
  workspaceName: string;
  employeeName: string;
  noteName: string;
  taskName: string | undefined;
  hoursReported: number;
  dateReported: Date;
}

function collectTimeTrackingData(
  note: Note,
  workspaceName: string,
  entries: TimeTrackingEntry[],
  startDate: Date,
  endDate: Date
): void {
  note.timeTrack.forEach((track) => {
    if (track.creationDate >= startDate && track.creationDate <= endDate) {
      entries.push({
        workspaceName,
        employeeName: note.graph.getVertex<User>(track.user).name,
        noteName: note.parentNote
          ? note.parentNote.titlePlaintext
          : note.titlePlaintext,
        taskName: note.parentNote ? note.titlePlaintext : '',
        hoursReported: track.minutes / 60,
        dateReported: track.creationDate,
      });
    }
  });

  // note.childCards.forEach((childNote) => {
  //   collectTimeTrackingData(
  //     childNote,
  //     workspaceName,
  //     entries,
  //     startDate,
  //     endDate
  //   );
  // });
}

function fetchTimeTrackingDataForWorkspace(
  workspace: Workspace,
  startDate: Date,
  endDate: Date
): TimeTrackingEntry[] {
  const entries: TimeTrackingEntry[] = [];

  const notesQueryResults = Query.blocking(
    workspace.notesQuery.source,
    (vertex) => {
      const note = vertex as Note;
      return (
        note instanceof Note &&
        note.workspace.key === workspace.key &&
        (note.timeTrack.size > 0 || note.childCards.length > 0)
      );
    }
  );
  notesQueryResults.forEach((noteResult) => {
    const note = noteResult.getVertexProxy() as Note;
    collectTimeTrackingData(note, workspace.name, entries, startDate, endDate);
  });

  return entries;
}

function fetchTimeTrackingData(
  workspaces: Set<Workspace>,
  startDate: Date,
  endDate: Date
): TimeTrackingEntry[] {
  let allEntries: TimeTrackingEntry[] = [];

  workspaces.forEach((workspace) => {
    const entries = fetchTimeTrackingDataForWorkspace(
      workspace,
      startDate,
      endDate
    );
    allEntries = allEntries.concat(entries);
  });

  return allEntries;
}

function convertToCSV(data: TimeTrackingEntry[]): string {
  const headers = [
    'Workspace name',
    'Employee name',
    'Note name',
    'Task name',
    'Hours reported',
    'Date reported',
  ];
  const rows = data.map((entry) => [
    entry.workspaceName,
    entry.employeeName,
    entry.noteName != undefined ? entry.noteName : '',
    entry.taskName,
    entry.hoursReported !== undefined ? entry.hoursReported.toString() : '0',
    entry.dateReported.toISOString(),
  ]);

  const csvContent = [headers, ...rows].map((e) => e.join(',')).join('\n');
  return csvContent;
}

function exportTimeTrackingDataToCSVBlocking(
  workspaces: Set<Workspace>,
  period: 'current' | 'last'
): string {
  const now = new Date();
  const startDate =
    period === 'current'
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endDate = new Date(
    now.getFullYear(),
    now.getMonth() + (period === 'current' ? 1 : 0),
    0
  );
  const data = fetchTimeTrackingData(workspaces, startDate, endDate);
  const csv = convertToCSV(data);

  return csv;
}

interface ExportButtonProps {
  workspaces: Set<Workspace>;
}

function downloadCSV(fileName: string, csvContent: string): void {
  const url = window.URL.createObjectURL(
    new Blob([csvContent], { type: 'text/csv' })
  );
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}

const ExportButton: React.FC<ExportButtonProps> = ({ workspaces }) => {
  const [loading, setLoading] = useState(false); //if we will want a loader icon in the future.

  const handleExport = (period: 'current' | 'last') => {
    setLoading(true);
    try {
      const csvData = exportTimeTrackingDataToCSVBlocking(workspaces, period);
      const fileName = `time-tracking-${period}-month.csv`;
      downloadCSV(fileName, csvData);
    } catch (error) {
      console.error('Error exporting data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <MenuItem onClick={() => handleExport('current')}>This month </MenuItem>
      <MenuItem onClick={() => handleExport('last')}>Last Month</MenuItem>
    </div>
  );
};

export default ExportButton;
