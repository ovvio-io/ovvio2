import { Query } from '../../../../../cfds/client/graph/query.ts';
import { Note, User } from '../../../../../cfds/client/graph/vertices/index.ts';
import { Workspace } from '../../../../../cfds/client/graph/vertices/workspace.ts';
import React, { useState } from 'react';
import { MenuItem } from '../../../../../styles/components/menu.tsx';
import {
  ToastProvider,
  useToastController,
} from '../../../../../styles/components/toast/index.tsx';
import { displayMessageToast } from './TimeTracking.tsx';

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

// function convertToCSV(data: TimeTrackingEntry[]): string {
//   const headers = [
//     'Workspace name',
//     'Employee name',
//     'Note name',
//     'Task name',
//     'Hours reported',
//     'Date reported',
//   ];
//   const rows = data.map((entry) => [
//     entry.workspaceName,
//     entry.employeeName,
//     entry.noteName != undefined ? entry.noteName : '',
//     entry.taskName,
//     entry.hoursReported !== undefined ? entry.hoursReported.toString() : '0',
//     entry.dateReported.toISOString(),
//   ]);

//   const csvContent = [headers, ...rows].map((e) => e.join(',')).join('\n');
//   return csvContent;
// }
function convertToCSV(data: TimeTrackingEntry[]): string {
  const headers = [
    'Workspace name',
    'Employee name',
    'Note name',
    'Task name',
    'Hours reported',
    'Date reported',
  ];

  const escapeCSV = (text: string): string => {
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const rows = data.map((entry) => [
    escapeCSV(entry.workspaceName),
    escapeCSV(entry.employeeName),
    escapeCSV(entry.noteName != undefined ? entry.noteName : ''),
    escapeCSV(entry.taskName != undefined ? entry.taskName : ''),
    entry.hoursReported !== undefined ? entry.hoursReported.toFixed(2) : '0.00',
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

function downloadCSV(
  fileName: string,
  csvContent: string,
  callback: () => void
): void {
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
  setTimeout(callback, 3000);
}

const ExportButton: React.FC<ExportButtonProps> = ({ workspaces }) => {
  const [loading, setLoading] = useState(false); //if we will want a loader icon in the future.
  const { displayToast } = useToastController();

  const handleExport = (period: 'current' | 'last') => {
    setLoading(true);
    setTimeout(() => {
      try {
        const csvData = exportTimeTrackingDataToCSVBlocking(workspaces, period);
        const fileName = `time-tracking-${period}-month.csv`;
        downloadCSV(fileName, csvData, () => {
          const periodText = period === 'current' ? 'this' : 'last';
          displayMessageToast(
            displayToast,
            `Your timesheet for ${periodText} month has been successfully exported to CSV for ${workspaces.size} workspaces and downloaded to your computer.`,
            'success'
          );
          setLoading(false);
        });
      } catch (error) {
        displayMessageToast(
          displayToast,
          `Error exporting data: ${error.message}`,
          'failure'
        );
        setLoading(false);
      }
    }, 500);
  };

  return (
    <div>
      <MenuItem onClick={() => handleExport('current')}>This month </MenuItem>
      <MenuItem onClick={() => handleExport('last')}>Last Month</MenuItem>
    </div>
  );
};

export default ExportButton;
