import { ConcreteCoreValue, CoreObject } from '../../base/core-types/index.ts';
import { RichText } from '../richtext/tree.ts';
import { ValueType } from './types/index.ts';
import { Dictionary } from '../../base/collections/dict.ts';
import { Record as RecordObj } from './record.ts';

export enum SchemeNamespace {
  WORKSPACE = 'workspaces',
  NOTES = 'notes',
  TAGS = 'tags',
  USERS = 'users',
  USER_SETTINGS = 'user-settings',
  VIEWS = 'views',
  SESSIONS = 'sessions',
  EVENTS = 'events',
  Null = '',
}

export const KEY_SUFFIX_SETTINGS = '_settings';

const namespaces: SchemeNamespace[] = [];
for (const key in SchemeNamespace) {
  namespaces.push(SchemeNamespace[key as keyof typeof SchemeNamespace]);
}

export function getAllSchemeNS() {
  return namespaces;
}

export const NS_WORKSPACE = SchemeNamespace.WORKSPACE;
export const NS_NOTES = SchemeNamespace.NOTES;
export const NS_TAGS = SchemeNamespace.TAGS;
export const NS_USERS = SchemeNamespace.USERS;
export const NS_USER_SETTINGS = SchemeNamespace.USER_SETTINGS;
export const NS_VIEWS = SchemeNamespace.VIEWS;
export const NS_SESSIONS = SchemeNamespace.SESSIONS;
export const NS_EVENTS = SchemeNamespace.EVENTS;

export const TYPE_STR = ValueType.STRING;
export const TYPE_NUMBER = ValueType.NUMBER;
export const TYPE_DATE = ValueType.DATE;
// export const TYPE_RICHTEXT = ValueType.RICHTEXT_V2;
export const TYPE_RICHTEXT_V3 = ValueType.RICHTEXT_V3;
export const TYPE_STR_SET = ValueType.STR_SET;
export const TYPE_SET = ValueType.SET;
export const TYPE_REF = ValueType.REF;
export const TYPE_REF_SET = ValueType.REF_SET;
export const TYPE_MAP = ValueType.MAP;
export const TYPE_REF_MAP = ValueType.REF_MAP;

export type DataType = {
  [key: string]: any;
};

export type FieldValue = {
  [TYPE_STR]: string;
  [TYPE_NUMBER]: number;
  [TYPE_DATE]: Date;
  // [TYPE_RICHTEXT]: OldRichText;
  [TYPE_STR_SET]: Set<string>;
  [TYPE_SET]: Set<any>;
  [TYPE_REF]: string;
  [TYPE_REF_SET]: Set<string>;
  [TYPE_MAP]: Dictionary<string, ConcreteCoreValue>;
  [TYPE_REF_MAP]: Dictionary<string, ConcreteCoreValue>;
  [TYPE_RICHTEXT_V3]: RichText;
};
export type FieldType = keyof FieldValue;

export type ExtendedField<
  T extends FieldType,
  K extends FieldValue[T] = FieldValue[T]
> = {
  type: T;
  default?: (rec: RecordObj) => K;
  required?: boolean;
};
type DefaultExtendedFields =
  | ExtendedField<typeof TYPE_STR>
  | ExtendedField<typeof TYPE_NUMBER>
  | ExtendedField<typeof TYPE_DATE>
  // | ExtendedField<typeof TYPE_RICHTEXT>
  | ExtendedField<typeof TYPE_STR_SET>
  | ExtendedField<typeof TYPE_SET>
  | ExtendedField<typeof TYPE_REF>
  | ExtendedField<typeof TYPE_REF_SET>
  | ExtendedField<typeof TYPE_MAP>
  | ExtendedField<typeof TYPE_REF_MAP>
  | ExtendedField<typeof TYPE_RICHTEXT_V3>;

export type SchemeObject = Record<
  string,
  FieldType | DefaultExtendedFields | ExtendedField<any, any>
>;

type Override<T1, T2> = Omit<T1, keyof T2> & T2;

export const kRecordIdField = '<id>';

export class SchemeDef<T extends SchemeObject> {
  namespace: SchemeNamespace;
  fieldDescriptors: T;
  repositoryFieldName?: string;

  constructor(
    namespace: SchemeNamespace,
    fieldDescriptors: T,
    repositoryFieldName?: string
  ) {
    this.namespace = namespace;
    this.fieldDescriptors = fieldDescriptors;
    this.repositoryFieldName = repositoryFieldName;
  }

  derive<B extends SchemeObject>(
    namespace: SchemeNamespace,
    fields: B,
    removeFields?: (keyof Omit<T, keyof B>)[],
    repositoryFieldName?: keyof B
  ): SchemeDef<Override<T, B>> {
    const newFields = Object.assign(
      Object.assign({}, this.fieldDescriptors),
      fields
    );
    if (removeFields) {
      for (const f of removeFields) {
        delete newFields[f];
      }
    }
    return new SchemeDef(
      namespace || this.namespace,
      newFields,
      (repositoryFieldName || this.repositoryFieldName) as string
    );
  }
}

type ExtendedFieldValue<A extends FieldType, B> = B extends FieldValue[A]
  ? B
  : FieldValue[A];

export type ObjectOf<T extends SchemeObject> = {
  [K in keyof T]: T[K] extends FieldType
    ? FieldValue[T[K]]
    : T[K] extends ExtendedField<infer A, infer B>
    ? ExtendedFieldValue<A, B>
    : never;
};

export type TypeOfScheme<T> = T extends SchemeDef<infer U>
  ? ObjectOf<U>
  : never;

export interface ISchemeManagerRegister {
  register(
    version: number,
    schemeDefs: SchemeDef<any>[],
    extraNamespaces: SchemeNamespace[],
    upFunc?: (namespace: string, data: any) => void
  ): void;
}

export enum InviteStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export interface AttachmentData extends CoreObject {
  filename: string;
  fileId: string;
  user?: string;
  inProgress?: boolean;
}

export type SchemeFields = { [key: string]: ValueType };

export enum NoteStatus {
  Unchecked = 0,
  Checked = 1,
}

// export type WorkspaceGrouping = 'none' | 'assignee' | 'teamLeader';
export type WorkspaceGrouping = 'none' | 'Employee' | 'Team';
export const kShowChecked = [
  'checked-unchecked',
  'unchecked',
  'checked',
] as const;

export type ShowChecked = (typeof kShowChecked)[number];

export const kShowPinned = ['pinned-unpinned', 'pinned', 'all'] as const;

export type ShowPinned = (typeof kShowPinned)[number];

export enum SortBy {
  // Priority = 'priority',
  CreatedAscending = 'created-asc',
  CreatedDescending = 'created-des',
  LastModifiedAscending = 'lastModified-asc',
  LastModifiedDescending = 'lastModified-des',
  DueDateAscending = 'dueDate-asc',
  DueDateDescending = 'dueDate-des',
  TitleAscending = 'title-asc',
  TitleDescending = 'title-des',
  Default = DueDateAscending,
}

export const kGroupBy = [
  'assignee',
  'workspace',
  'dueDate',
  'note',
  'tag',
  'team',
] as const;

export type GroupBy = (typeof kGroupBy)[number];

export const kViewType = ['list', 'board'] as const;

export type ViewType = (typeof kViewType)[number];

export const kTabIds = ['tasks', 'notes', 'overview'] as const;

export const kSettingsTabIds = [
  'general-personal',
  'details',
  'general-organization',
  'members',
  'billing',
  'general-workspaces',
  'tags',
  'roles-details',
] as const;

export const kWsSettingsTabIds = [
  // --------------------------------- NEW 19/12
  'General',
  'Tags',
  'Roles & Details',
] as const;

export type TabId = (typeof kTabIds)[number];

export type SettingsTabId = (typeof kSettingsTabIds)[number];

export function isSettingsTabId(tabId: string): tabId is SettingsTabId {
  return kSettingsTabIds.includes(tabId as any);
}

export const kDateFilters = ['week', 'month'] as const;

export type DateFilter = (typeof kDateFilters)[number];

export type TagId = string;

export function encodeTagId(
  parentName?: string | null,
  childName?: string | null
): TagId {
  return (
    (parentName ? encodeURIComponent(parentName) : 'null') +
    '/' +
    (childName ? encodeURIComponent(childName) : 'null')
  );
}

export function decodeTagId(
  id: string
): [parent: string | null, child: string | null] {
  const comps = id.split('/');
  if (!comps.length) {
    return [null, null];
  }
  return [
    decodeURIComponent(comps[0]),
    comps.length > 1 ? decodeURIComponent(comps[1]) : null,
  ];
}

export const kAllUserPermissions = [
  'view:dashboard',
  'view:settings:org',
  'manage:users',
] as const;
export type UserPermission = (typeof kAllUserPermissions)[number];
