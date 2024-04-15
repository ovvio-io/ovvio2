import { useMemo, useEffect } from 'react';
import { CoreValue } from '../../../../../base/core-types/base.ts';
import { coreValueCompare } from '../../../../../base/core-types/comparable.ts';
import {
  startOfToday,
  numberOfDaysInCurrentMonth,
  kDayMs,
  numberOfWorkDaysLeftInWeek,
} from '../../../../../base/date.ts';
import * as SetUtils from '../../../../../base/set.ts';
import {
  GroupBy,
  DateFilter,
  SortBy,
  decodeTagId,
} from '../../../../../cfds/base/scheme-types.ts';
import { GraphManager } from '../../../../../cfds/client/graph/graph-manager.ts';
import {
  GroupByFunction,
  GroupIdComparator,
  UnionQuery,
  QueryOptions,
} from '../../../../../cfds/client/graph/query.ts';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import { VertexSource } from '../../../../../cfds/client/graph/vertex-source.ts';
import {
  VertexId,
  VertexIdGetKey,
  Vertex,
} from '../../../../../cfds/client/graph/vertex.ts';
import {
  Note,
  NoteType,
  NOTE_SORT_BY,
} from '../../../../../cfds/client/graph/vertices/note.ts';
import { User } from '../../../../../cfds/client/graph/vertices/user.ts';
import { View } from '../../../../../cfds/client/graph/vertices/view.ts';
import { Workspace } from '../../../../../cfds/client/graph/vertices/workspace.ts';
import { useGraphManager, usePartialView } from './graph.tsx';

export const kDueDateColumns = [
  'Overdue',
  'Today',
  'ThreeDays',
  'RestOfWeek',
  'TwoWeeks',
  'ThreeWeeks',
  'Month',
  'Rest',
  'NoDueDate',
] as const;
export type DueDateColumn = (typeof kDueDateColumns)[number];

function groupByDueDate(note: Note): DueDateColumn {
  const dueDate = note.dueDate;
  if (typeof dueDate === 'undefined') {
    return 'NoDueDate';
  }
  const startOfTodayMs = startOfToday().getTime();
  const numDaysInMonth = numberOfDaysInCurrentMonth();
  const dt = dueDate.getTime() - startOfTodayMs;
  if (dt < 0) {
    return 'Overdue';
  }
  if (dt < kDayMs) {
    return 'Today';
  }
  if (dt < 3 * kDayMs) {
    return 'ThreeDays';
  }
  if (dt < 7 * kDayMs) {
    return 'RestOfWeek';
  }
  if (dt < 14 * kDayMs) {
    return 'TwoWeeks';
  }
  if (dt < 21 * kDayMs) {
    return 'ThreeWeeks';
  }
  if (dt < numDaysInMonth * kDayMs) {
    return 'Month';
  }
  return 'Rest';
}

function rootNoteForNote(n: Note): Note | undefined {
  let result: Note | undefined = n;
  while (result.parentNote) {
    result = result.parentNote;
  }
  return result.type === NoteType.Note ? result : undefined;
}

function groupByRootTitle(note: Note): string | undefined {
  const root = rootNoteForNote(note);
  return root ? root.titlePlaintext : undefined;
}

function groupByTeam(note: Note): (string | null)[] | undefined {
  const result: (string | null)[] = [];
  for (const u of note.assignees) {
    for (const t of u.teams) {
      if (!result.includes(t)) {
        result.push(t);
      }
    }
  }
  result.sort();
  if (!result.length) {
    result.push(null);
  }
  return result;
}

export const GROUP_BY: Record<
  GroupBy,
  GroupByFunction<Note, CoreValue> | undefined
> = {
  workspace: ((note) => note.workspace.manager) as GroupByFunction<
    Note,
    VertexManager<Workspace>
  >,
  assignee: ((note) =>
    Array.from(note.assignees).map((u) => u.manager)) as GroupByFunction<
    Note,
    VertexManager<User>
  >,
  dueDate: groupByDueDate,
  note: groupByRootTitle,
  tag: undefined,
  team: groupByTeam,
};

const GROUP_COMPARATOR: Record<
  GroupBy,
  GroupIdComparator<CoreValue> | undefined
> = {
  workspace: undefined,
  assignee: undefined,
  dueDate: (g1, g2) =>
    kDueDateColumns.indexOf(g1 as DueDateColumn) -
    kDueDateColumns.indexOf(g2 as DueDateColumn),
  note: undefined,
  tag: undefined,
  team: undefined,
};

const gGroupByTagFunctions: {
  [key: string]: GroupByFunction<Note, string | null>;
} = {};

function groupByForTag(
  parentName: string,
): GroupByFunction<Note, string | null> {
  let result = gGroupByTagFunctions[parentName];
  if (!result) {
    result = (note: Note) => {
      const tags = note.tags;
      if (!tags) {
        return null;
      }
      for (const [parent, child] of tags) {
        if (parent.name === parentName) {
          return child.name;
        }
      }
      return null;
    };
    gGroupByTagFunctions[parentName] = result;
  }
  return result;
}

const kDatePredicates: Record<DateFilter, (n: Note) => boolean> = {
  week: (n: Note) => {
    if (!n.dueDate) {
      return false;
    }
    const startOfTodayMs = startOfToday().getTime();
    const dueMs = n.dueDate.getTime();
    if (!n.isChecked && dueMs < startOfTodayMs) {
      return true;
    }
    return (
      dueMs >= startOfTodayMs &&
      dueMs < startOfTodayMs + numberOfWorkDaysLeftInWeek() * kDayMs
    );
  },
  month: (n: Note) => {
    if (!n.dueDate) {
      return false;
    }
    const startOfTodayMs = startOfToday().getTime();
    const dueMs = n.dueDate.getTime();
    if (!n.isChecked && dueMs < startOfTodayMs) {
      return true;
    }
    return (
      dueMs >= startOfTodayMs &&
      dueMs < startOfTodayMs + numberOfDaysInCurrentMonth() * kDayMs
    );
  },
};

export function createUnionWorkspacesSource(
  graph: GraphManager,
  selectedWorkspaces: VertexId<Workspace>[],
  sortBy: SortBy,
  name: string,
): UnionQuery<Vertex, Note, string> {
  return new UnionQuery(
    selectedWorkspaces.sort(coreValueCompare).map((id) => {
      return {
        query: graph.sharedQueriesManager.noteQuery(sortBy),
        groupId: VertexIdGetKey(id),
      };
    }),
    'NotesUnion/' + name,
  );
}

export type FilteredNotes<GT extends CoreValue = CoreValue> = readonly [
  pinned?: QueryOptions<Note, Note, GT>,
  unpinned?: QueryOptions<Note, Note, GT>,
];

export function useFilteredNotes<GT extends CoreValue>(
  name: string,
): FilteredNotes<GT> {
  const graph = useGraphManager();
  const view = usePartialView(
    'selectedWorkspaces',
    'noteType',
    'showPinned',
    'showChecked',
    'sortBy',
    'groupBy',
    'pivot',
    'selectedAssignees',
    'selectedTagIds',
    'viewType',
    'dateFilter',
  );
  const unpinnedSource = useMemo(
    () =>
      createUnionWorkspacesSource(
        graph,
        Array.from(view.selectedWorkspaces),
        view.sortBy,
        name,
      ),
    [
      graph,
      Array.from(view.selectedWorkspaces)
        .map((w) => w.key)
        .sort()
        .join('-'),
      view.sortBy,
      name,
    ],
  );
  // const unpinnedSource = useSharedQuery('notDeleted');
  const result: FilteredNotes<GT> = useMemo(() => {
    let res: FilteredNotes<GT>;
    // const showPinned = view.viewType === 'board' ? 'all' : view.showPinned;
    const showPinned = view.showPinned;
    switch (showPinned) {
      case 'pinned':
        res = [
          buildQueryOptions(
            view.manager,
            unpinnedSource,
            true,
            name + '-Pinned',
          ),
          undefined,
        ];
        break;

      case 'all':
        res = [
          buildQueryOptions(
            view.manager,
            unpinnedSource,
            undefined,
            name + '-All',
          ),
          undefined,
        ];
        break;
      case 'pinned-unpinned':
      default:
        res = [
          buildQueryOptions(
            view.manager,
            unpinnedSource,
            true,
            name + '-Pinned',
          ),
          buildQueryOptions(
            view.manager,
            unpinnedSource,
            false,
            name + '-Unpinned',
          ),
        ];
        break;
    }
    return res;
  }, [view, unpinnedSource, name]);
  return result;
}

function buildQueryOptions<GT extends CoreValue>(
  viewMgr: VertexManager<View>,
  src: VertexSource,
  pinned: boolean | undefined,
  name: string,
): QueryOptions<Note, Note, GT> {
  const view = viewMgr.getVertexProxy();
  const groupBy =
    view.groupBy === 'tag'
      ? groupByForTag(view.pivot || '')
      : GROUP_BY[view.groupBy];
  const selectedAssignees = view.selectedAssignees;
  const tagNames = new Map<string, string[]>();
  const selectedWorkspaces = view.selectedWorkspaces;

  for (const tagId of view.selectedTagIds) {
    const [parent, child] = decodeTagId(tagId);
    const arr = tagNames.get(parent!);
    if (arr) {
      if (!arr.includes(child!)) {
        arr.push(child!);
      }
    } else {
      tagNames.set(parent!, [child!]);
    }
  }

  return {
    source: src as UnionQuery<any, Note>,
    predicate: (x: Note) => {
      const view = viewMgr.getVertexProxy();
      return (
        !x.isLocal &&
        x.type === view.noteType &&
        x.parentType !== NoteType.Task &&
        selectedWorkspaces.has(x.workspace) &&
        (typeof pinned === 'undefined' || x.isPinned === pinned) &&
        (view.showChecked === 'checked-unchecked' ||
          x.isChecked === (view.showChecked === 'checked')) &&
        (selectedAssignees.size === 0 ||
          SetUtils.intersects(selectedAssignees, x.assignees)) &&
        (tagNames.size === 0 || noteMatchesTags(x, tagNames)) &&
        (!view.dateFilter || kDatePredicates[view.dateFilter](x))
      );
    },
    sortBy: NOTE_SORT_BY[view.sortBy || SortBy.Default],
    name,
    groupBy: groupBy as GroupByFunction<Note, GT>,
    groupComparator: GROUP_COMPARATOR[view.groupBy],
    contentSensitive: true,
    contentFields: [
      'isLocal',
      'type',
      'parentType',
      'isPinned',
      'isChecked',
      'assignees',
      'tags',
      'childCards',
      'title',
      'dueDate',
    ],
  };
}

function noteMatchesTags(
  note: Note,
  selectedTags: Map<string, string[]>,
): boolean {
  const noteTags = note.tags;
  for (const [parentName, childNames] of selectedTags) {
    let found = false;
    for (const [parent, child] of noteTags) {
      if (parent.name === parentName && childNames.includes(child.name)) {
        found = true;
        break;
      }
    }
    if (!found) {
      return false;
    }
  }
  return true;
}
