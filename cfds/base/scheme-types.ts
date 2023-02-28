import { ConcreteCoreValue, CoreObject } from '../../base/core-types/index.ts';
// import { COWMap } from '../collections/cow-map';

// import { RichText as OldRichText } from '../primitives-old/richtext2';
import { RichText } from '../richtext/tree.ts';
import { Record as RecordObj } from './record.ts';
import { ValueType } from './types/index.ts';
import { Dictionary } from '../../base/collections/dict.ts';

export enum SchemeNamespace {
  WORKSPACE = 'workspaces',
  NOTES = 'notes',
  TAGS = 'tags',
  USERS = 'users',
  USER_SETTINGS = 'user-settings',
  ORGANIZATION = 'organization',
  FILTER = 'filter',
  Null = '',
}

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
export const NS_ORGANIZATION = SchemeNamespace.ORGANIZATION;
export const NS_FILTER = SchemeNamespace.FILTER;

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

export interface DataType extends CoreObject {
  [key: string]: ConcreteCoreValue;
}

export type FieldValue = {
  [TYPE_STR]: string;
  [TYPE_NUMBER]: number;
  [TYPE_DATE]: Date;
  // [TYPE_RICHTEXT]: OldRichText;
  [TYPE_STR_SET]: Set<string>;
  [TYPE_SET]: Set<ConcreteCoreValue>;
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
  namespace: string;
  fieldDescriptors: T;
  repositoryFieldName: string;

  constructor(
    namespace: string,
    fieldDescriptors: T,
    repositoryFieldName?: string
  ) {
    this.namespace = namespace;
    this.fieldDescriptors = fieldDescriptors;
    this.repositoryFieldName = repositoryFieldName || kRecordIdField;
  }

  derive<B extends SchemeObject>(
    namespace: string,
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

export interface AttachmentData extends CoreObject {
  filename: string;
  fileId: string;
  user?: string;
  inProgress?: boolean;
}

export type SchemeFields = { [key: string]: ValueType };

export type NoteStatus = 'ToDo' | 'InProgress' | 'Suspended' | 'Done';

export type FilterSortBy = typeof FilterSortByValues[number];

export const FilterSortByValues = [
  'priority',
  'created',
  'modified',
  'due',
] as const;

export type FilterGroupBy = 'assignee' | 'workspace' | 'tag';

export interface TagValue extends CoreObject {
  value: string;
  sortStamp: string;
}

export enum ViewType {
  List = 'list',
  Board = 'board',
}
