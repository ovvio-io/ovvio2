import {
  kDayMs,
  kWeekMs,
  numberOfDaysLeftInCurrentMonth,
  startOfThisMonth,
  startOfToday,
} from '@ovvio/base/lib/utils/date';
import * as ArrayUtils from '@ovvio/base/lib/utils/array';
import * as SetUtils from '@ovvio/base/lib/utils/set';
import { GraphManager } from '@ovvio/cfds/lib/client/graph/graph-manager';
import {
  Note,
  Role,
  Tag,
  User,
  Workspace,
} from '@ovvio/cfds/lib/client/graph/vertices';
import { NoteType } from '@ovvio/cfds/lib/client/graph/vertices/note';
import { coreValueCompare } from '@ovvio/cfds/lib/core-types';
import { createUnionWorkspacesSource } from 'core/cfds/react/filter';
import { Query } from '@ovvio/cfds/lib/client/graph/query';
import { SortBy } from '@ovvio/cfds/lib/base/scheme-types';

function buildBaseQuery(
  graph: GraphManager,
  selectedWorkspaces: string[]
): Note[] {
  const source = createUnionWorkspacesSource(
    graph,
    selectedWorkspaces,
    SortBy.Default,
    'PreciseDashboard'
  );
  const results = Query.blocking(
    source,
    vert => vert instanceof Note && vert.type === NoteType.Task
  );
  source.close();
  return results.map(mgr => mgr.getVertexProxy<Note>());
}

function countOpenTasksByAssignee(
  notes: Note[],
  due: number,
  users: User[]
): string[][] {
  const map = new Map<User, number>();
  const startOfTodayTs = startOfToday().getTime();
  for (const n of notes) {
    if (
      n.type === NoteType.Task &&
      isOpenTaskWithDue(n, due) &&
      n.dueDate.getTime() >= startOfTodayTs
    ) {
      for (const user of n.assignees) {
        map.set(user, (map.get(user) || 0) + 1);
      }
    }
  }
  const result: string[][] = [];
  result.push(users.map(u => u.name));
  result.push(users.map(u => String(map.get(u) || 0)));
  return result;
}

function countTasksCompleted(notes: Note[], dtMs: number): number {
  const startTs = startOfToday().getTime() - dtMs;
  return ArrayUtils.count(
    notes,
    n =>
      n.type === NoteType.Task && (n.completionDate?.getTime() || 0) > startTs
  );
}

function countTasksPerProject(
  notes: Note[],
  workspaces: Workspace[],
  filter: (n: Note) => boolean
): string[][] {
  const counts = new Map<string, number>();
  for (const n of notes) {
    if (!filter(n)) {
      continue;
    }
    const key = n.workspace.key;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [
    workspaces.map(ws => ws.name),
    workspaces.map(ws => String(counts.get(ws.key) || 0)),
  ];
}

function calcProgressPerProject(
  notes: Note[],
  workspaces: Workspace[]
): string[][] {
  const checkedCounts = new Map<string, number>();
  const totalCounts = new Map<string, number>();
  for (const n of notes) {
    const wsKey = n.workspace.key;
    if (n.isChecked) {
      checkedCounts.set(wsKey, (checkedCounts.get(wsKey) || 0) + 1);
    }
    totalCounts.set(wsKey, (totalCounts.get(wsKey) || 0) + 1);
  }
  return [
    workspaces.map(ws => ws.name),
    workspaces.map(
      ws =>
        String(
          Math.round(
            (100 * (checkedCounts.get(ws.key) || 0)) /
              (totalCounts.get(ws.key) || 1)
          )
        ) + '%'
    ),
  ];
}

function countTasksByAssigneeWorkspace(
  notes: Note[],
  assignees: User[],
  workspaces: Workspace[],
  filter: (n: Note) => boolean
): string[][] {
  const counts: number[][] = workspaces.map(() => []);
  const totalByUser: number[] = assignees.map(() => 0);

  for (const n of notes) {
    if (!filter(n)) {
      continue;
    }
    const ws = n.workspace;
    const wsIdx = workspaces.indexOf(ws);
    for (const u of n.assignees) {
      const uIdx = assignees.indexOf(u);
      const row = counts[wsIdx];
      while (row.length < assignees.length) {
        row.push(0);
      }
      ++row[uIdx];
      ++totalByUser[uIdx];
    }
  }

  const result: string[][] = [assignees.map(u => u.name)];
  // result[0].splice(0, 0, '');
  for (let wsIdx = 0; wsIdx < workspaces.length; ++wsIdx) {
    const row = counts[wsIdx].map(c => String(c));
    row.splice(0, 0, workspaces[wsIdx].name);
    row.push(String(counts[wsIdx].reduce((v1, v2) => v1 + v2, 0)));
    result.push(row);
  }
  const totalRow = totalByUser.map(c => String(c));
  totalRow.splice(0, 0, '');
  result.push(totalRow);
  return result;
}

function countOpenTasksPerWorkspace(notes: Note[]): string[][] {
  const map = new Map<Workspace, number>();
  for (const n of notes) {
    if (n.type === NoteType.Task && isOpenTask(n)) {
      const ws = n.workspace;
      map.set(ws, (map.get(ws) || 0) + 1);
    }
  }
  const result: string[][] = [];
  const sortedWorkspaces = Array.from(map.keys()).sort((ws1, ws2) =>
    coreValueCompare(ws1.name, ws2.name)
  );
  result.push(sortedWorkspaces.map(u => u.name));
  result.push(sortedWorkspaces.map(u => String(map.get(u) || 0)));
  return result;
}

function countTasksByPriority(notes: Note[]): string[][] {
  const map = new Map<Tag, number>();
  for (const n of notes) {
    if (n.type === NoteType.Task && !n.isChecked) {
      for (const [parentTag, childTag] of n.tags) {
        if (
          parentTag.name === 'דחיפות' ||
          parentTag.name.toLowerCase() === 'priority'
        ) {
          map.set(childTag, (map.get(childTag) || 0) + 1);
        }
      }
    }
  }
  const result: string[][] = [];
  const sortedTags = Array.from(map.keys()).sort((tag1, tag2) =>
    coreValueCompare(tag1.sortStamp, tag2.sortStamp)
  );
  result.push(sortedTags.map(t => t.name));
  result.push(sortedTags.map(t => String(map.get(t) || 0)));
  return result;
}

function noteHasStatus(note: Note, childTagName: string): boolean {
  for (const [parent, child] of note.tags) {
    if (parent.name === 'שלב' && child.name === childTagName) {
      return true;
    }
  }
  return false;
}

function isOpenTask(note: Note): boolean {
  if (
    note.type !== NoteType.Task ||
    note.isChecked ||
    // !note.dueDate ||
    noteHasStatus(note, 'לשיוך')
  ) {
    return false;
  }
  return true;
}

function isOpenTaskWithDue(note: Note, dueMs: number): boolean {
  if (!isOpenTask(note)) {
    return false;
  }
  const dueDate = note.dueDate;
  if (!dueDate) {
    return false;
  }
  const startOfTodayMs = startOfToday().getTime();
  return dueDate.getTime() - startOfTodayMs < dueMs;
}

function isTaskInTeamLeaderApproval(note: Note): boolean {
  return isOpenTask(note) && noteHasStatus(note, 'לבדיקת ראש צוות');
}

function isTaskAssignedToTeamLeader(note: Note): boolean {
  const role = note.graph.getVertex<Role>('RoleTeamLeader');
  if (role.isNull) {
    return false;
  }
  return (
    isOpenTask(note) && SetUtils.intersects(note.assignees, role.assignees)
  );
}

function prettifyTable(table: string[][]): string[][] {
  // Escape all values
  for (const row of table) {
    for (let i = 0; i < row.length; ++i) {
      const cell = row[i].replaceAll('"', '""');
      row[i] = `"${cell}"`;
    }
  }
  // Front padding
  table[0].splice(0, 0, '');
  if (table.length === 2) {
    table[1].splice(0, 0, '');
  }
  return table;
}

export function downloadCSV(
  graph: GraphManager,
  selectedWorkspaces: string[]
): void {
  const csv: string[][] = [];
  const notes = buildBaseQuery(graph, selectedWorkspaces);
  const now = new Date();
  const startOfMonthTs = startOfThisMonth().getTime();
  const startOfTodayTs = startOfToday().getTime();
  const workspaces = selectedWorkspaces.map(key =>
    graph.getVertex<Workspace>(key)
  );
  const allAssignees = new Set<User>();
  workspaces.forEach(ws => SetUtils.update(allAssignees, ws.assignees));
  const sortedAssignees = Array.from(allAssignees).sort(coreValueCompare);

  csv.push([
    'Tasks Completed - This week',
    String(countTasksCompleted(notes, kWeekMs)),
  ]);
  csv.push([
    'Tasks Completed - This month',
    String(
      countTasksCompleted(
        notes,
        new Date(now.getFullYear(), now.getMonth(), 1).getTime()
      )
    ),
  ]);
  csv.push([
    'Tasks To-Do - This Week',
    String(
      ArrayUtils.count(
        notes,
        n =>
          isOpenTaskWithDue(n, kWeekMs) && n.dueDate.getTime() >= startOfTodayTs
      )
    ),
  ]);
  csv.push([
    'Tasks To-Do - This Month',
    String(
      ArrayUtils.count(
        notes,
        n =>
          isOpenTaskWithDue(n, numberOfDaysLeftInCurrentMonth() * kDayMs) &&
          n.dueDate.getTime() >= startOfTodayTs
      )
    ),
  ]);
  csv.push([
    'Late Tasks',
    String(ArrayUtils.count(notes, n => isOpenTaskWithDue(n, 0))),
  ]);
  csv.push([
    'Team Leader Approval',
    String(ArrayUtils.count(notes, isTaskInTeamLeaderApproval)),
  ]);
  csv.push([
    'Open Tasks for Team Leader',
    String(ArrayUtils.count(notes, isTaskAssignedToTeamLeader)),
  ]);
  csv.push(['Total Tasks left per project']);
  csv.push(
    ...prettifyTable(countTasksPerProject(notes, workspaces, n => !n.isChecked))
  );
  csv.push(['Progress rate per project']);
  csv.push(...prettifyTable(calcProgressPerProject(notes, workspaces)));
  csv.push(['Tasks To-Do by Team Member - Weekly']);
  csv.push(
    ...prettifyTable(countOpenTasksByAssignee(notes, kWeekMs, sortedAssignees))
  );
  csv.push(['Tasks To-Do by Team Member - Monthly']);
  csv.push(
    ...prettifyTable(
      countOpenTasksByAssignee(
        notes,
        numberOfDaysLeftInCurrentMonth() * kDayMs,
        sortedAssignees
      )
    )
  );
  csv.push(['Tasks To-Do Per Project']);
  csv.push(...prettifyTable(countOpenTasksPerWorkspace(notes)));
  csv.push(['Tasks To-Do by Priority Tag']);
  csv.push(...prettifyTable(countTasksByPriority(notes)));
  csv.push(['Total task left per project']);
  csv.push(
    ...prettifyTable(
      countTasksPerProject(notes, workspaces, n => isOpenTask(n))
    )
  );
  csv.push(['Tasks done this Month']);
  csv.push(
    ...prettifyTable(
      countTasksByAssigneeWorkspace(
        notes,
        sortedAssignees,
        workspaces,
        n =>
          n.type === NoteType.Task &&
          (n.completionDate?.getTime() || 0) >= startOfMonthTs
      )
    )
  );

  const result = csv.map(row => row.join(',')).join('\n');
  downloadText('dashboard.csv', result);
}

function downloadText(filename: string, text: string): void {
  const element = document.createElement('a');
  element.setAttribute(
    'href',
    'data:text/plain;charset=utf-8,' + encodeURIComponent(text)
  );
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
