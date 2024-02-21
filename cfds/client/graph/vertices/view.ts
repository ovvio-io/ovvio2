import * as SetUtils from '../../../../base/set.ts';
import {
  DateFilter,
  GroupBy,
  SchemeNamespace,
  SettingsTabId,
  ShowChecked,
  ShowPinned,
  SortBy,
  TabId,
  TagId,
  ViewType,
  WorkspaceGrouping,
  kGroupBy,
} from '../../../base/scheme-types.ts';
import { BaseVertex } from './base.ts';
import { Workspace } from './workspace.ts';
import { User, UserMetadataKey } from './user.ts';
import { FieldTriggers, Vertex } from '../vertex.ts';
import { triggerChildren } from '../propagation-triggers.ts';
import { MutationOrigin, MutationPack } from '../mutations.ts';
import { NoteType } from './note.ts';
import { CoreValue } from '../../../../base/core-types/base.ts';
import { Dictionary } from '../../../../base/collections/dict.ts';

export const kViewPropsGlobal: readonly (keyof View)[] = [
  'workspaceGrouping',
  'selectedWorkspaces',
  'expandedWorkspaceGroups',
  'workspaceBarCollapsed',
  'noteType',
  'selectedTabId',
] as const;

export type ViewPropGlobal = Extract<
  keyof View,
  (typeof kViewPropsGlobal)[number]
>;

export const kViewPropsTab: readonly (keyof View)[] = [
  'selectedAssignees',
  'selectedTagIds',
  'viewType',
  'sortBy',
  'groupBy',
  'pivot',
  'showChecked',
  'showPinned',
  'notesExpandOverride',
  'notesExpandBase',
  'dateFilter',
  'expandedGroupIds',
] as const;

export const kViewPersistentProps: readonly (keyof View)[] = [
  ...kViewPropsGlobal,
  ...kViewPropsTab,
] as const;

export const kViewTransientProps: readonly (keyof View)[] = [
  'showFilters',
] as const;

export const kViewPropsAll: readonly (keyof View)[] = [
  ...kViewPersistentProps,
  ...kViewTransientProps,
] as const;

export type ViewProp = Extract<
  keyof View,
  (typeof kViewPersistentProps)[number]
>;

const kDefaultWorkspaceGrouping: WorkspaceGrouping = 'none';
const kDefaultShowChecked: ShowChecked = 'checked-unchecked';
const kDefaultShowPinned: ShowPinned = 'pinned-unpinned';
const kDefaultNoteType: NoteType = NoteType.Task;
const kDefaultGroupBy: GroupBy = 'dueDate';
const kDefaultViewType: ViewType = 'list';
const kDefaultTabId: TabId = 'tasks';
const kDefaultSettingsTabId: SettingsTabId = 'general-personal';

export class View extends BaseVertex {
  public showFilters: boolean = false;

  get parent(): Vertex | undefined {
    return this.parentView;
  }

  get owner(): User {
    return this.graph.getVertex<User>(this.record.get('owner'));
  }

  get parentView(): View | undefined {
    const key = this.record.get('parentView');
    return key ? this.graph.getVertex<View>(key) : undefined;
  }

  get workspaceGrouping(): WorkspaceGrouping {
    if (this.parentView) {
      return this.parentView.proxy.workspaceGrouping;
    }
    return this.record.get('workspaceGrouping') || kDefaultWorkspaceGrouping;
  }

  set workspaceGrouping(grouping: WorkspaceGrouping) {
    if (this.parentView) {
      this.parentView.proxy.workspaceGrouping = grouping;
      return;
    }
    if (grouping === kDefaultWorkspaceGrouping) {
      this.record.delete('workspaceGrouping');
    } else {
      this.record.set('workspaceGrouping', grouping);
    }
  }

  clearWorkspaceGrouping(): void {
    if (this.parentView) {
      this.parentView.proxy.workspaceGrouping = kDefaultWorkspaceGrouping;
    } else {
      this.workspaceGrouping = kDefaultWorkspaceGrouping;
    }
  }

  parentWorkspaceGroupingDidMutate(
    origin: MutationOrigin,
    oldValue: WorkspaceGrouping | undefined
  ): MutationPack {
    return ['workspaceGrouping', origin, oldValue];
  }

  get selectedTabId(): TabId {
    if (this.parentView) {
      return this.parentView.selectedTabId;
    }
    return this.record.get('selectedTab') || kDefaultTabId;
  }

  set selectedTabId(id: TabId) {
    if (this.parentView) {
      this.parentView.selectedTabId = id;
      return;
    }
    if (id === kDefaultTabId) {
      this.record.delete('selectedTab');
    } else {
      this.record.set('selectedTab', id);
    }
  }

  get selectedSettingsTabId(): SettingsTabId {
    if (this.parentView) {
      return this.parentView.selectedSettingsTabId;
    }
    return this.record.get('selectedSettingsTab') || kDefaultSettingsTabId;
  }

  set selectedSettingsTabId(id: SettingsTabId) {
    if (this.parentView) {
      this.parentView.selectedSettingsTabId = id;
      return;
    }
    if (id === kDefaultSettingsTabId) {
      this.record.delete('selectedSettingsTab');
    } else {
      this.record.set('selectedSettingsTab', id);
    }
  }

  get selectedWorkspaces(): Set<Workspace> {
    if (this.parentView) {
      return this.parentView.proxy.selectedWorkspaces;
    }
    return this.vertSetForField('selectedWorkspaces');
  }

  set selectedWorkspaces(wss: Set<Workspace>) {
    if (this.parentView) {
      this.parentView.proxy.selectedWorkspaces = wss;
      return;
    }
    if (wss.size <= 0) {
      this.record.delete('selectedWorkspaces');
    } else {
      this.record.set(
        'selectedWorkspaces',
        SetUtils.map(wss, (ws) => ws.key)
      );
    }
  }

  clearSelectedWorkspaces(): void {
    if (this.parentView) {
      this.parentView.proxy.selectedWorkspaces.clear();
    } else {
      this.selectedWorkspaces = new Set();
    }
  }

  parentSelectedWorkspacesDidMutate(
    origin: MutationOrigin,
    oldValue: Set<Workspace> | undefined
  ): MutationPack {
    return ['selectedWorkspaces', origin, oldValue];
  }

  // New, added 24.12 .------------------------------------------------------------v

  // get selectedSettingsWorkspaces(): Set<Workspace> {
  //   if (this.parentView) {
  //     return this.parentView.proxy.selectedSettingsWorkspaces;
  //   }
  //   return this.vertSetForField('selectedSettingsWorkspaces');
  // }

  // set selectedSettingsWorkspaces(ws: Set<Workspace>) {
  //   if (this.parentView) {
  //     // If there's a parent view, delegate the operation to the parent view's proxy
  //     this.parentView.proxy.selectedSettingsWorkspaces = ws;
  //     return;
  //   }
  //   // Clear the current selection before setting the new one
  //   if (ws.size > 0) {
  //     const workspace = ws.values().next().value; // Get the first workspace from the set
  //     this.record.set(
  //       'selectedSettingsWorkspaces',
  //       SetUtils.map(new Set([workspace]), (ws) => ws.key)
  //     );
  //   } else {
  //     // If the incoming set is empty, clear the selection
  //     this.record.delete('selectedSettingsWorkspaces');
  //   }
  // }
  // //.------------------------------------------------------------\

  get expandedWorkspaceGroups(): Set<string> {
    if (this.parentView) {
      return this.parentView.proxy.expandedWorkspaceGroups;
    }
    return this.record.get('expandedWorkspaceGroups') || new Set();
  }

  set expandedWorkspaceGroups(s: Set<string>) {
    if (this.parentView) {
      this.parentView.proxy.expandedWorkspaceGroups = s;
      return;
    }
    if (s.size > 0) {
      this.record.set('expandedWorkspaceGroups', s);
    } else {
      this.record.delete('expandedWorkspaceGroups');
    }
  }

  clearExpandedWorkspaceGroups(): void {
    if (this.parentView) {
      this.parentView.proxy.expandedWorkspaceGroups.clear();
    } else {
      this.expandedWorkspaceGroups = new Set();
    }
  }

  parentExpandedWorkspaceGroupsDidMutate(
    origin: MutationOrigin,
    oldValue: Set<string> | undefined
  ): MutationPack {
    return ['expandedWorkspaceGroups', origin, oldValue];
  }

  get workspaceBarCollapsed(): boolean | undefined {
    if (this.parentView) {
      return this.parentView.proxy.workspaceBarCollapsed;
    }
    return this.record.get('workspaceBarCollapsed');
  }

  set workspaceBarCollapsed(flag: boolean | undefined) {
    if (this.parentView) {
      this.parentView.proxy.workspaceBarCollapsed = flag;
      return;
    }
    if (flag) {
      this.record.set('workspaceBarCollapsed', 1);
    } else {
      this.record.delete('workspaceBarCollapsed');
    }
  }

  clearWorkspaceBarCollapsed(): void {
    this.workspaceBarCollapsed = undefined;
  }

  parentWorkspaceBarCollapsedDidMutate(
    origin: MutationOrigin,
    oldValue: boolean | undefined
  ): MutationPack {
    return ['workspaceBarCollapsed', origin, oldValue];
  }

  get noteType(): NoteType {
    if (this.parentView) {
      return this.parentView.proxy.noteType;
    }
    return this.record.get('noteType') || kDefaultNoteType;
  }

  set noteType(type: NoteType) {
    if (this.parentView) {
      this.parentView.proxy.noteType = type;
      return;
    }
    if (type === kDefaultNoteType) {
      this.record.delete('noteType');
    } else {
      this.record.set('noteType', type);
    }
  }

  clearNoteType(): void {
    this.noteType = kDefaultNoteType;
  }

  parentNoteTypeDidMutate(
    origin: MutationOrigin,
    oldValue: NoteType | undefined
  ): MutationPack {
    return ['noteType', origin, oldValue];
  }

  get selectedAssignees(): Set<User> {
    return this.vertSetForField('selectedAssignees');
  }

  set selectedAssignees(s: Set<User>) {
    if (s.size) {
      this.record.set(
        'selectedAssignees',
        SetUtils.map(s, (u) => u.key)
      );
    } else {
      this.record.delete('selectedAssignees');
    }
  }

  get selectedTagIds(): Set<TagId> {
    return this.record.get('selectedTagIds') || new Set();
  }

  set selectedTagIds(ids: Set<TagId>) {
    if (ids.size) {
      this.record.set('selectedTagIds', ids);
    } else {
      this.record.delete('selectedTagIds');
    }
  }

  get showChecked(): ShowChecked {
    return this.record.get('showChecked') || kDefaultShowChecked;
  }

  set showChecked(v: ShowChecked) {
    if (v === kDefaultShowChecked) {
      this.record.delete('showChecked');
    } else {
      this.record.set('showChecked', v);
    }
  }

  clearShowChecked(): void {
    this.showChecked = kDefaultShowChecked;
  }

  defaultSortBy(): SortBy {
    return this.noteType === NoteType.Note
      ? SortBy.TitleAscending
      : SortBy.DueDateAscending;
  }

  get sortBy(): SortBy {
    return this.record.get('sortBy') || this.defaultSortBy();
  }

  set sortBy(s: SortBy) {
    if (s === this.defaultSortBy()) {
      this.record.delete('sortBy');
    } else {
      this.record.set('sortBy', s);
    }
  }

  get showPinned(): ShowPinned {
    return this.record.get('showPinned') || kDefaultShowPinned;
  }

  set showPinned(s: ShowPinned) {
    if (s === kDefaultShowPinned) {
      this.record.delete('showPinned');
    } else {
      this.record.set('showPinned', s);
    }
  }

  // get groupBy(): GroupBy {
  //   return this.record.get('groupBy') || kDefaultGroupBy;
  // }
  // get groupBy(): GroupBy {
  //   const groupByValue = this.record.get('groupBy');
  //   if (groupByValue === 'team') {
  //     const metaDataDictionary: Dictionary<UserMetadataKey, string> =
  //       this.record.get('metadata');
  //     return metaDataDictionary
  //       ? metaDataDictionary.get('team')
  //       : kDefaultGroupBy;
  //   }
  //   return groupByValue || kDefaultGroupBy;
  // }

  get groupBy(): GroupBy {
    const groupByValue = this.record.get('groupBy');
    return groupByValue || kDefaultGroupBy;
  }

  set groupBy(v: GroupBy) {
    if (v === kDefaultGroupBy) {
      this.record.delete('groupBy');
    } else {
      this.record.set('groupBy', v);
    }
  }

  clearGroupBy(): void {
    this.groupBy = kDefaultGroupBy;
  }

  groupByDidMutate(
    origin: boolean,
    oldGroupBy: Set<String> | undefined
  ): MutationPack {
    const oldValue: any = this.expandedGroupIds;
    this.expandedGroupIds.clear();
    return ['expandedGroupIds', origin, oldValue];
  }

  get pivot(): string | undefined {
    return this.record.get('pivot');
  }

  set pivot(s: string | undefined) {
    if (s) {
      this.record.set('pivot', s);
    } else {
      this.record.delete('pivot');
    }
  }

  get viewType(): ViewType {
    return this.record.get('viewType') || kDefaultViewType;
  }

  set viewType(t: ViewType) {
    if (t === kDefaultViewType) {
      this.record.delete('viewType');
    } else {
      this.record.set('viewType', t);
    }
  }

  get notesExpandOverride(): Set<string> {
    return this.record.get('notesExpandOverride') || new Set();
  }

  set notesExpandOverride(s: Set<string>) {
    if (s.size > 0) {
      this.record.set('notesExpandOverride', s);
    } else {
      this.record.delete('notesExpandOverride');
    }
  }

  get expandedGroupIds(): Set<string> {
    return this.record.get('expandedGroupIds') || new Set();
  }

  set expandedGroupIds(s: Set<string>) {
    if (s.size > 0) {
      this.record.set('expandedGroupIds', s);
    } else {
      this.record.delete('expandedGroupIds');
    }
  }

  setNoteExpandOverride(key: string, flag: boolean): void {
    if (flag) {
      this.proxy.notesExpandOverride.add(key);
    } else {
      this.proxy.notesExpandOverride.delete(key);
    }
  }

  get notesExpandBase(): boolean {
    return this.record.get('notesExpandBase') === 1;
  }

  set notesExpandBase(flag: boolean) {
    if (flag) {
      this.record.set('notesExpandBase', 1);
    } else {
      this.record.delete('notesExpandBase');
    }
  }

  get dateFilter(): DateFilter | undefined {
    return this.record.get('dateFilter');
  }

  set dateFilter(filter: DateFilter | undefined) {
    if (typeof filter === 'undefined') {
      this.record.delete('dateFilter');
    } else {
      this.record.set('dateFilter', filter);
    }
  }

  clear(): void {
    for (const fieldName of kViewPropsAll) {
      delete this.proxy[fieldName as keyof this];
    }
  }

  clearFilters(): void {
    this.proxy.selectedAssignees.clear();
    this.proxy.selectedTagIds.clear();
  }

  clearContentsDisplaySettings(): void {
    this.proxy.selectedTabId = kDefaultTabId;
    this.proxy.viewType = kDefaultViewType;
    this.proxy.sortBy = this.defaultSortBy();
    this.proxy.groupBy = kDefaultGroupBy;
    delete this.proxy.pivot;
    this.proxy.showChecked = kDefaultShowChecked;
    this.proxy.showPinned = kDefaultShowPinned;
    this.proxy.showFilters = false;
    this.proxy.notesExpandOverride.clear();
    this.proxy.notesExpandBase = false;
  }

  closeFiltersDrawer(): void {
    this.proxy.showFilters = false;
  }

  deleteFromSet<K extends keyof this & 'selectedAssignees'>(
    fieldName: K,
    selector: (v: User) => boolean
  ): void;

  deleteFromSet<K extends keyof this & 'selectedTagIds'>(
    fieldName: K,
    selector: (v: TagId) => boolean
  ): void;

  deleteFromSet<
    K extends keyof this & ('selectedAssignees' | 'selectedTagIds')
  >(
    fieldName: K,
    selector: ((v: TagId) => boolean) | ((v: User) => boolean)
  ): void {
    const set = this.proxy[fieldName];
    const removed: (string | User)[] = [];
    for (const v of set) {
      if ((selector as (x: typeof v) => boolean)(v)) {
        removed.push(v);
      }
    }
    SetUtils.deleteAll(set, removed);
  }

  update<K extends ViewProp>(
    fields: readonly K[],
    ...views: Pick<View, K>[]
  ): void {
    for (const fieldName of fields) {
      let value: CoreValue;
      for (const v of views) {
        value = (v[fieldName] || value) as CoreValue;
      }
      if (value) {
        (this.proxy as any)[fieldName] = value;
      } else {
        delete this.proxy[fieldName];
      }
    }
  }

  // static resolve<K extends ViewProp>(
  //   fields: K[],
  //   ...views: Pick<View, K>[]
  // ): Pick<View, K> {
  //   const result = {} as Pick<View, K>;
  //   for (const f of fields) {
  //     for (const v of views) {
  //       result[f] = coreValueClone((v[f] || result[f]) as CoreValue) as View[K];
  //     }
  //   }
  //   return result;
  // }
}

export const kFieldTriggersView: FieldTriggers<View> = {
  workspaceGrouping: triggerChildren(
    'parentWorkspaceGroupingDidMutate',
    'workspaceGrouping',
    { namespace: SchemeNamespace.VIEWS, fieldName: 'parentView' }
  ),
  selectedWorkspaces: triggerChildren(
    'parentSelectedWorkspacesDidMutate',
    'selectedWorkspaces',
    { namespace: SchemeNamespace.VIEWS, fieldName: 'parentView' }
  ),
  expandedWorkspaceGroups: triggerChildren(
    'parentExpandedWorkspaceGroupsDidMutate',
    'expandedWorkspaceGroups',
    { namespace: SchemeNamespace.VIEWS, fieldName: 'parentView' }
  ),
  workspaceBarCollapsed: triggerChildren(
    'parentWorkspaceBarCollapsedDidMutate',
    'workspaceBarCollapsed',
    { namespace: SchemeNamespace.VIEWS, fieldName: 'parentView' }
  ),
  noteType: triggerChildren('parentNoteTypeDidMutate', 'noteType'),
};

Vertex.registerFieldTriggers(View, kFieldTriggersView);
