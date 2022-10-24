import { fromTimestamp } from '@ovvio/cfds/lib/base/orderstamp';
import { Vertex } from '@ovvio/cfds/lib/client/graph/vertex';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import {
  Note,
  Tag,
  User,
  Workspace,
} from '@ovvio/cfds/lib/client/graph/vertices';
import { isTag, useQuery } from 'core/cfds/react/query';
import { usePartialVertices } from 'core/cfds/react/vertex';
import { useEffect, useMemo, useReducer } from 'react';

export interface SharedTag {
  displayName: string;
  key: string;
  managers: {
    [workspaceKey: string]: VertexManager<Tag>;
  };
}

export interface SharedChildTag extends SharedTag {
  selected: boolean;
  sortStamp: string;
}

export enum ParentTagState {
  None = 'none',
  Some = 'some',
  All = 'all',
}

export interface SharedParentTag extends SharedTag {
  status: ParentTagState;
  childTags: {
    [crossWorkspaceKey: string]: SharedChildTag;
  };
}

export interface MergedTagsTree {
  readonly [key: string]: Readonly<SharedParentTag>;
}

export interface FiltersState {
  assignees: readonly {
    user: VertexManager<User>;
    selected: boolean;
  }[];
  tags: MergedTagsTree;
}

function mergeParentState(
  a: ParentTagState,
  b: ParentTagState
): ParentTagState {
  if (a === ParentTagState.All && b === ParentTagState.All) {
    return ParentTagState.All;
  }
  if (a === ParentTagState.None && b === ParentTagState.None) {
    return ParentTagState.None;
  }
  return ParentTagState.Some;
}

function mergeTags(
  parentTags: VertexManager<Tag>[],
  previousState: MergedTagsTree = {}
): MergedTagsTree {
  const result = {};
  for (const tag of parentTags) {
    const proxy = tag.getVertexProxy();
    const key = crossWorkspaceTagKey(proxy);
    const prevTag = previousState[key];
    if (!result[key]) {
      result[key] = {
        displayName: proxy.name,
        key,
        managers: {},
        childTags: {},
      };
    }

    const sharedTag = result[key];
    sharedTag.managers[proxy.workspaceKey] = tag;
    let total = 0;
    let selectedCount = 0;
    for (const child of proxy.childTags) {
      const childKey = crossWorkspaceTagKey(child);
      if (!sharedTag.childTags[childKey]) {
        const selected = !!prevTag?.childTags[childKey]?.selected;
        sharedTag.childTags[childKey] = {
          key: childKey,
          displayName: child.name,
          selected,
          managers: {},
        };
        total++;
        if (selected) {
          selectedCount++;
        }
      }
      const sharedChild = sharedTag.childTags[childKey];
      sharedChild.managers[child.workspaceKey] =
        child.manager as VertexManager<Tag>;
      const sortStamp = child.sortStamp || fromTimestamp(child.creationDate);
      if (!sharedChild.sortStamp || sharedChild.sortStamp < sortStamp) {
        sharedChild.sortStamp = sortStamp;
      }
    }
    const currentStatus =
      total === selectedCount
        ? ParentTagState.All
        : !selectedCount
        ? ParentTagState.None
        : ParentTagState.Some;

    const prevStatus = sharedTag.status || currentStatus;
    sharedTag.status = mergeParentState(prevStatus, currentStatus);
    // Object.values(sharedTag.childTags).forEach(Object.freeze);
  }
  // Object.values(result).forEach(Object.freeze);
  return Object.freeze(result);
}

const EmptyState: FiltersState = {
  assignees: [],
  tags: {},
};

export interface FiltersStateController {
  readonly isLoading: boolean;
  readonly tags: MergedTagsTree;
  readonly isEmpty: boolean;
  readonly activeTags: readonly SharedChildTag[];
  readonly assignees: readonly {
    user: VertexManager<User>;
    selected: boolean;
  }[];
  readonly activeAssignees: readonly VertexManager<User>[];
  toggleTag(tag: SharedTag | Tag): void;
  toggleAssignee(user: VertexManager<User>): void;
  readonly activeFilters: string[];
  setActiveFilters(filters: string[]): void;
}

const DELIMITER = '::';

export function crossWorkspaceTagKey(tag: Tag) {
  const key = tag.name.toLowerCase().trim();
  if (tag.parentTag) {
    return `${crossWorkspaceTagKey(tag.parentTag)}${DELIMITER}${key}`;
  }

  return key;
}

type FilterAction =
  | {
      type: 'toggleTag';
      payload: Tag | SharedTag;
    }
  | {
      type: 'toggleAssignee';
      payload: VertexManager<User>;
    }
  | {
      type: 'setTags';
      payload: VertexManager<Tag>[];
    }
  | {
      type: 'setAssignees';
      payload: VertexManager<User>[];
    }
  | {
      type: 'setActive';
      payload: {
        assignees: string[];
        tags: string[];
      };
    };

function tagsStateReducer(
  state: FiltersState,
  action: FilterAction
): FiltersState {
  switch (action.type) {
    case 'setTags': {
      return {
        ...state,
        tags: mergeTags(action.payload, state.tags),
      };
    }
    case 'toggleAssignee': {
      const { payload } = action;

      return {
        ...state,
        assignees: state.assignees.map(x =>
          x.user.key === payload.key
            ? {
                selected: !x.selected,
                user: payload,
              }
            : x
        ),
      };
    }
    case 'toggleTag': {
      const key =
        action.payload instanceof Tag
          ? crossWorkspaceTagKey(action.payload)
          : action.payload.key;
      const [parentKey, childKey] = key.split(DELIMITER);
      const parent = state.tags[parentKey];

      if (!parent) {
        return state;
      }
      let tagState = state.tags;
      if (!childKey) {
        const children = Object.entries(parent.childTags);
        const allSelected = children.every(([_, x]) => x.selected);

        tagState = {
          ...tagState,
          [key]: {
            ...parent,
            status: allSelected ? ParentTagState.None : ParentTagState.All,
            childTags: Object.fromEntries(
              children.map(([key, val]) => [
                key,
                {
                  ...val,
                  selected: !allSelected,
                },
              ])
            ),
          },
        };
      } else {
        const child = parent.childTags[key];
        if (!child) {
          return state;
        }
        const childTags: { [key: string]: SharedChildTag } = {
          ...parent.childTags,
          [key]: {
            ...child,
            selected: !child.selected,
          },
        };
        const childTagsArray = Object.values(childTags);
        const selectedCount = childTagsArray.filter(x => x.selected).length;

        tagState = {
          ...tagState,
          [parentKey]: {
            ...parent,
            status:
              selectedCount === childTagsArray.length
                ? ParentTagState.All
                : selectedCount
                ? ParentTagState.Some
                : ParentTagState.None,
            childTags,
          },
        };
      }
      return {
        ...state,
        tags: tagState,
      };
    }
    case 'setAssignees': {
      const { payload } = action;
      const selectedIds = new Set(
        state.assignees.filter(x => x.selected).map(x => x.user.key)
      );
      return {
        ...state,
        assignees: payload.map(user => ({
          user,
          selected: selectedIds.has(user.key),
        })),
      };
    }
    case 'setActive': {
      const { assignees, tags } = action.payload;
      const tagsState = Object.entries(state.tags).reduce(
        (prev, [key, parent]) => {
          let allSelected = true;
          let someSelected = false;
          const children = {};
          for (const [childKey, child] of Object.entries(parent.childTags)) {
            const selected = tags.includes(childKey);
            someSelected = someSelected || selected;
            allSelected = allSelected && selected;
            children[childKey] = {
              ...child,
              selected,
            };
          }
          prev[key] = {
            ...parent,
            childTags: children,
            status: allSelected
              ? ParentTagState.All
              : someSelected
              ? ParentTagState.Some
              : ParentTagState.None,
          };
          return prev;
        },
        {}
      );
      return {
        ...state,
        tags: tagsState,
        assignees: state.assignees.map(x => ({
          ...x,
          selected: assignees.includes(x.user.key),
        })),
      };
    }
  }
}

export interface FiltersProviderProps {
  selectedWorkspaces: VertexManager<Workspace>[];
}

function mapActiveTags(tagsTree: MergedTagsTree) {
  const r = [];
  for (const tag of Object.values(tagsTree)) {
    for (const child of Object.values(tag.childTags)) {
      if (child.selected) {
        r.push(child);
      }
    }
  }

  return r;
}

export function useFiltersController(
  selectedWorkspaces: VertexManager<Workspace>[]
) {
  const [state, dispatch] = useReducer(tagsStateReducer, EmptyState);
  const ws = usePartialVertices(selectedWorkspaces, ['users']);
  const query = useQuery<Vertex, Tag>(
    v =>
      isTag(v) &&
      selectedWorkspaces.some(x => x.key === v.workspaceKey) &&
      !v.parentTag,
    [selectedWorkspaces],
    {
      name: 'filters',
    }
    // {
    //   listenOn: ['name', 'workspace', 'parentTag'],
    //   sort: sortTag,
    // }
  );

  useEffect(() => {
    const results: Record<string, VertexManager<User>> = {};
    for (const w of ws) {
      for (const u of w.users) {
        results[u.key] = u.manager as VertexManager<User>;
      }
    }

    dispatch({ type: 'setAssignees', payload: Object.values(results) });
  }, [ws]);

  useEffect(() => {
    if (query.loading) {
      return;
    }

    dispatch({ type: 'setTags', payload: query.results });
  }, [query]);

  const controller = useMemo<FiltersStateController>(() => {
    const activeTags = mapActiveTags(state.tags);
    const activeAssignees = state.assignees
      .filter(x => x.selected)
      .map(x => x.user);

    return {
      isLoading: query.loading,
      tags: state.tags,
      activeTags,
      assignees: state.assignees,
      activeAssignees,
      isEmpty: !activeTags.length && !activeAssignees.length,
      toggleTag(tag: Tag | SharedTag) {
        dispatch({
          type: 'toggleTag',
          payload: tag,
        });
      },
      toggleAssignee(user: VertexManager<User>) {
        dispatch({
          type: 'toggleAssignee',
          payload: user,
        });
      },
      activeFilters: activeAssignees
        .map(x => `u/${x.key}`)
        .concat(activeTags.map(x => x.key)),
      setActiveFilters(filters: string[]) {
        dispatch({
          type: 'setActive',
          payload: {
            assignees: filters
              .filter(x => x.startsWith('u/'))
              .map(x => x.substring(2)),
            tags: filters.filter(x => !x.startsWith('u/')),
          },
        });
      },
    };
  }, [state, query.loading]);

  return controller;
}

export function isCardInFilter(
  filter: FiltersStateController,
  card: Note
): boolean {
  if (filter.isEmpty) {
    return true;
  }
  const ws = card.workspace;

  const wsAssignees = filter.activeAssignees.filter(u =>
    Array.from(ws.users).some(x => x.key === u.key)
  );
  if (
    wsAssignees.length &&
    !Array.from(card.assignees).some(x =>
      wsAssignees.some(y => y.key === x.key)
    )
  ) {
    return false;
  }
  for (const parentTag of Object.values(filter.tags)) {
    if (
      parentTag.status === ParentTagState.None ||
      !parentTag.managers[ws.key]
    ) {
      continue;
    }

    const wsChildTags = Object.values(parentTag.childTags)
      .filter(x => x.selected && !!x.managers[ws.key])
      .map(x => x.managers[ws.key]);
    if (!wsChildTags.length) {
      continue;
    }
    const parent = parentTag.managers[ws.key].getVertexProxy();
    const cardTag = card.tags.get(parent);
    if (!cardTag) {
      return false;
    }
    if (!wsChildTags.some(x => x.getVertexProxy() === cardTag)) {
      return false;
    }
  }
  return true;
}
