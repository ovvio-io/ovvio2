import * as SetUtils from '@ovvio/base/lib/utils/set';
import {
  GroupByFunction,
  GroupIdComparator,
  Query,
  UnionQuery,
} from '@ovvio/cfds/lib/client/graph/query';
import {
  Vertex,
  VertexId,
  VertexIdGetKey,
} from '@ovvio/cfds/lib/client/graph/vertex';
import { User, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import {
  NOTE_SORT_BY,
  Note,
  NoteType,
} from '@ovvio/cfds/lib/client/graph/vertices/note';
import { CoreValue, coreValueCompare } from '@ovvio/cfds/lib/core-types';
import { useGraphManager, usePartialView } from './graph';
import { useEffect, useMemo } from 'react';
import { GraphManager } from '@ovvio/cfds/lib/client/graph/graph-manager';
import {
  DateFilter,
  GroupBy,
  SortBy,
  decodeTagId,
} from '@ovvio/cfds/lib/base/scheme-types';
import {
  kDayMs,
  kWeekMs,
  numberOfDaysInCurrentMonth,
  numberOfWorkDaysLeftInWeek,
  startOfToday,
} from '@ovvio/base/lib/utils/date';
import { View } from '@ovvio/cfds/lib/client/graph/vertices/view';
import { VertexSource } from '@ovvio/cfds/lib/client/graph/vertex-source';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';

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
export type DueDateColumn = typeof kDueDateColumns[number];

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
  return root ? root.plaintextTitle : undefined;
}

export const GROUP_BY: Record<GroupBy, GroupByFunction<Note, CoreValue>> = {
  workspace: (note => note.workspace.manager) as GroupByFunction<
    Note,
    VertexManager<Workspace>
  >,
  assignee: (note =>
    Array.from(note.assignees).map(u => u.manager)) as GroupByFunction<
    Note,
    VertexManager<User>
  >,
  dueDate: groupByDueDate,
  note: groupByRootTitle,
  tag: undefined,
};

const GROUP_COMPARATOR: Record<GroupBy, GroupIdComparator<CoreValue>> = {
  workspace: undefined,
  assignee: undefined,
  dueDate: (g1, g2) =>
    kDueDateColumns.indexOf(g1 as DueDateColumn) -
    kDueDateColumns.indexOf(g2 as DueDateColumn),
  note: undefined,
  tag: undefined,
};

const gGroupByTagFunctions: {
  [key: string]: GroupByFunction<Note, string | null>;
} = {};

function groupByForTag(
  parentName: string
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
    // TODO: Account for calendar week
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
  name: string
): UnionQuery {
  return new UnionQuery(
    selectedWorkspaces.sort(coreValueCompare).map(id => {
      return {
        query: graph.sharedQueriesManager.noteQuery(sortBy),
        groupId: VertexIdGetKey(id),
      };
    }),
    'NotesUnion/' + name
  );
}

export type FilteredNotes<GT extends CoreValue = CoreValue> = readonly [
  pinned: Query<Vertex, Note, GT>,
  unpinned: Query<Vertex, Note, GT> | undefined
];

export function useFilteredNotes<GT extends CoreValue>(
  name: string
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
    'dateFilter'
  );
  const unpinnedSource = useMemo(
    () =>
      createUnionWorkspacesSource(
        graph,
        Array.from(view.selectedWorkspaces),
        view.sortBy,
        name
      ),
    [graph, view.selectedWorkspaces, view.sortBy, name]
  );
  useEffect(() => {
    return () => {
      unpinnedSource?.close();
    };
  }, [unpinnedSource]);
  // const unpinnedSource = useSharedQuery('notDeleted');
  const result: FilteredNotes<GT> = useMemo(
    () => {
      let res: FilteredNotes<GT>;
      const showPinned = view.viewType === 'board' ? 'all' : view.showPinned;
      switch (showPinned) {
        case 'pinned':
          res = [
            buildQuery(view, unpinnedSource, true, name + '-Pinned'),
            undefined,
          ];
          break;

        case 'all':
          res = [
            buildQuery(view, unpinnedSource, undefined, name + '-Pinned'),
            undefined,
          ];
          break;
        case 'pinned-unpinned':
        default:
          res = [
            buildQuery(view, unpinnedSource, true, name + '-Pinned'),
            buildQuery(view, unpinnedSource, false, name + '-Unpinned'),
          ];
          break;
      }
      return res;
    },
    // WARNING: The list of dependencies must match the fields used internally
    // by buildQuery().
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      view,
      view.groupBy,
      view.noteType,
      view.selectedAssignees,
      view.showChecked,
      view.selectedTagIds,
      view.pivot,
      view.sortBy,
      view.selectedWorkspaces,
      unpinnedSource,
      name,
    ]
  );
  return result;
}

function buildQuery<GT extends CoreValue>(
  view: Pick<
    View,
    | 'groupBy'
    | 'noteType'
    | 'selectedAssignees'
    | 'showChecked'
    | 'selectedTagIds'
    | 'pivot'
    | 'sortBy'
    | 'selectedWorkspaces'
    | 'dateFilter'
  >,
  src: VertexSource,
  pinned: boolean | undefined,
  name: string
): Query<Vertex, Note, GT> {
  const groupBy =
    view.groupBy === 'tag'
      ? groupByForTag(view.pivot || '')
      : GROUP_BY[view.groupBy];
  const selectedAssignees = view.selectedAssignees;
  const tagNames = new Map<string, string[]>();
  const selectedWorkspaces = view.selectedWorkspaces;

  for (const tagId of view.selectedTagIds) {
    const [parent, child] = decodeTagId(tagId);
    const arr = tagNames.get(parent);
    if (arr) {
      if (!arr.includes(child)) {
        arr.push(child);
      }
    } else {
      tagNames.set(parent, [child]);
    }
  }

  return new Query<Vertex, Note, GT>(
    src as UnionQuery<any, Note>,
    (x: Note) =>
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
      (!view.dateFilter || kDatePredicates[view.dateFilter](x)),
    {
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
    }
  );
}

function noteMatchesTags(
  note: Note,
  selectedTags: Map<string, string[]>
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
