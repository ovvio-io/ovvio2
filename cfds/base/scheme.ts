import { assert } from '../../base/error.ts';
import { isString, isNoValue } from '../../base/comparisons.ts';
import { JSONValue, ReadonlyJSONObject } from '../../base/interfaces.ts';
import {
  Encodable,
  Encoder,
  coreValueEquals,
} from '../../base/core-types/index.ts';
import {
  ConstructorDecoderConfig,
  isDecoderConfig,
} from '../../base/core-types/encoding/index.ts';
import {
  JSONDecoder,
  JSONEncoder,
} from '../../base/core-types/encoding/json.ts';
import { clone } from './object.ts';
import {
  SchemeDef,
  ISchemeManagerRegister,
  NS_NOTES,
  NS_TAGS,
  NS_USERS,
  NS_WORKSPACE,
  SchemeObject,
  SchemeFields,
  DataType,
  kRecordIdField,
  SchemeNamespace,
} from './scheme-types.ts';
import { runRegister } from './scheme-versions.ts';
import { isRefValueType, ValueType } from './types/index.ts';

export function normalizeFieldDescriptors(descriptors: any) {
  //TODO: changed to export
  const types: SchemeFields = {};
  const requiredFields: string[] = [];
  for (let [k, desc] of Object.entries<any>(descriptors)) {
    if (isString(desc)) {
      desc = {
        type: desc,
      };
    }
    descriptors[k] = desc;
    types[k] = desc.type;
    if (desc.required) {
      requiredFields.push(k);
    }
  }
  return [descriptors, types, requiredFields];
}

export interface SchemeConfig {
  namespace: SchemeNamespace;
  version?: number;
  fieldDescriptors: any;
}

export interface EncodedScheme {
  ns: string;
  version: number;
}

export class Scheme implements Encodable {
  private _namespace!: SchemeNamespace;
  private _version!: number;
  private _fieldDescriptors: any;
  private _fields!: SchemeFields;
  private _requiredFields: string[] | undefined;

  constructor(config: SchemeConfig | ConstructorDecoderConfig<EncodedScheme>) {
    if (isDecoderConfig(config)) {
      const decoder = config.decoder;
      const namespace: string = decoder.get<string>('ns')!;
      const version: number = decoder.get<number>('version')!;

      if (namespace === '' && version === 0) {
        this.copyFrom(Scheme.nullScheme());
        return;
      }

      const scheme = SchemeManager.instance.getScheme(namespace, version);
      if (!scheme) {
        throw new Error(`Unknown scheme ${namespace}/${version}`);
      }
      this.copyFrom(scheme);
    } else {
      this._namespace = config.namespace;
      this._version = config.version || 0;
      [this._fieldDescriptors, this._fields, this._requiredFields] =
        normalizeFieldDescriptors(config.fieldDescriptors);
    }
  }

  get namespace() {
    return this._namespace;
  }

  get version() {
    return this._version;
  }

  get isNull() {
    return Object.keys(this._fieldDescriptors).length === 0;
  }

  get fields() {
    return this._fields;
  }

  fieldNames(): Iterable<string> {
    return Object.keys(this.fields);
  }

  getFields(): SchemeFields {
    return this._fields;
  }

  getRequiredFields(): string[] | undefined {
    return this._requiredFields;
  }

  getVersion() {
    return this._version;
  }

  getNamespace() {
    return this._namespace;
  }

  getFieldType(fieldName: string): ValueType {
    const type: ValueType | undefined = this.getFields()[fieldName];
    assert(
      !isNoValue(type),
      `Unknown field ${this.getNamespace()}/${fieldName}`,
    );
    return type;
  }

  hasField(fieldName: string): boolean {
    const desc = this._fieldDescriptors[fieldName];
    return !isNoValue(desc);
  }

  isRefField(fieldName: string): boolean {
    const type: ValueType | undefined = this.getFields()[fieldName];
    return !isNoValue(type) && isRefValueType(type);
  }

  isRequiredField(fieldName: string): boolean {
    const requiredFields = this.getRequiredFields();
    if (requiredFields === undefined) {
      return false;
    }
    return requiredFields.indexOf(fieldName) >= 0;
  }

  hasInitForField(fieldName: string): boolean {
    const desc = this._fieldDescriptors[fieldName];
    return desc && desc.init;
  }

  initValueForField(fieldName: string, data: DataType) {
    const desc = this._fieldDescriptors[fieldName];
    if (!desc || !desc.init) {
      return undefined;
    }
    return desc.init(data);
  }

  clone(version: number): Scheme {
    return new Scheme({
      namespace: this._namespace,
      version: version || this._version,
      fieldDescriptors: Object.assign({}, this._fieldDescriptors),
    });
  }

  allowsAutoUpgradeFrom(oldScheme: Scheme): boolean {
    if (this.isNull) {
      return false;
    }

    const oldNS = oldScheme.getNamespace();
    assert(!oldNS || this.getNamespace() === oldScheme.getNamespace());

    if (oldScheme.isNull) {
      return true;
    }

    const oldVersion = oldScheme.getVersion();
    if (oldVersion === this.getVersion()) {
      return true;
    }

    if (oldVersion > this.getVersion()) {
      debugger;
      return false;
    }

    if (!SchemeManager.instance.schemeExists(oldNS, oldVersion + 1)) {
      debugger;
      return false;
    }

    if (!SchemeManager.instance.schemeExists(oldNS, this.getVersion())) {
      debugger;
      return false;
    }

    return true;
  }

  upgradeAvailable() {
    const latest = Scheme.getLatestVersion(this._namespace);
    return latest.version > this._version;
  }

  upgradeData(oldScheme: Scheme, oldData: any): any {
    const oldNS = oldScheme.getNamespace();
    assert(!oldNS || this.getNamespace() === oldScheme.getNamespace());

    if (oldScheme.isNull) {
      return oldData;
    }

    const oldVersion = oldScheme.getVersion();
    const newVersion = this.getVersion();

    const newData = clone(oldScheme.getFields(), oldData);

    if (oldVersion === newVersion) {
      return newData;
    }

    let curVersion = oldVersion + 1;

    while (curVersion <= newVersion) {
      if (SchemeManager.instance.schemeExists(this.namespace, curVersion)) {
        const upFunc = SchemeManager.instance.getUpFunc(curVersion);
        if (upFunc) {
          upFunc(this.getNamespace(), newData);
        }
      }
      curVersion++;
    }

    return newData;
  }

  isEqual(otherScheme: Scheme): boolean {
    if (this._version !== otherScheme.getVersion()) {
      return false;
    }

    return coreValueEquals(
      this._fieldDescriptors,
      otherScheme._fieldDescriptors,
    );
  }

  serialize(encoder: Encoder): void {
    encoder.set('ns', this.getNamespace());
    encoder.set('version', this.getVersion());
  }

  private copyFrom(other: Scheme) {
    this._namespace = other._namespace;
    this._fieldDescriptors = other._fieldDescriptors;
    this._requiredFields = other._requiredFields;
    this._version = other._version;
    this._fields = other._fields;
  }

  toJS(): JSONValue {
    const encoder = new JSONEncoder();

    this.serialize(encoder);

    return encoder.getOutput();
  }

  static fromJS(obj: ReadonlyJSONObject): Scheme {
    const decoder = new JSONDecoder(obj);
    return new this({ decoder });
  }

  static nullScheme() {
    return new this({
      namespace: SchemeNamespace.Null,
      version: 0,
      fieldDescriptors: {},
    });
  }

  static workspace(): Scheme {
    const scheme = SchemeManager.instance.getScheme(NS_WORKSPACE);
    if (!scheme) throw new Error('Workspace scheme not found');
    return scheme;
  }

  static note(): Scheme {
    const scheme = SchemeManager.instance.getScheme(NS_NOTES);
    if (!scheme) throw new Error('Note scheme not found');
    return scheme;
  }

  static tag(): Scheme {
    const scheme = SchemeManager.instance.getScheme(NS_TAGS);
    if (!scheme) throw new Error('Tag scheme not found');
    return scheme;
  }

  static user(): Scheme {
    const scheme = SchemeManager.instance.getScheme(NS_USERS);
    if (!scheme) throw new Error('User scheme not found');
    return scheme;
  }

  static view(): Scheme {
    const scheme = SchemeManager.instance.getScheme(SchemeNamespace.VIEWS);
    if (!scheme) throw new Error('View scheme not found');
    return scheme;
  }

  static session(): Scheme {
    const scheme = SchemeManager.instance.getScheme(SchemeNamespace.SESSIONS);
    if (!scheme) throw new Error('Session scheme not found');
    return scheme;
  }

  static event(): Scheme {
    const scheme = SchemeManager.instance.getScheme(SchemeNamespace.EVENTS);
    if (!scheme) throw new Error('Session scheme not found');
    return scheme;
  }

  static getLatestVersion(ns: string) {
    const scheme = SchemeManager.instance.getScheme(ns);
    if (!scheme) throw new Error(`Scheme namespace: ${ns} not found`);
    return scheme;
  }

  static forKey(key: string) {
    const keyLen = key.length;
    let start = 0;
    let end;
    for (start = 0; start < keyLen && key[start] === '/'; ++start) {
      // Skip leading slashes
    }
    for (end = start; end < keyLen && key[end] !== '/'; ++end) {
      // Find the end of the type part
    }
    assert(start <= end || start >= keyLen, 'Unsupported key format');
    const type = key.substring(start, end);
    switch (type) {
      case NS_WORKSPACE:
        return this.workspace();

      case NS_NOTES:
        return this.note();

      case NS_TAGS:
        return this.tag();

      case NS_USERS:
        return this.user();

      case SchemeNamespace.VIEWS:
        return this.view();

      default:
        break;
    }
  }
}

class SchemeVersion {
  private _version: number;
  private _namespaces: Map<string, Scheme>;
  private _upFunc?: (namespace: string, data: any) => void;

  constructor(
    version: number,
    upFunc?: (namespace: string, data: any) => void,
  ) {
    this._version = version;
    this._namespaces = new Map<string, Scheme>();
    this._upFunc = upFunc;
  }

  get version() {
    return this._version;
  }

  get upFunc() {
    return this._upFunc;
  }

  get schemes() {
    return Array.from(this._namespaces.values());
  }

  addDef(def: SchemeDef<any>) {
    const scheme = new Scheme({
      namespace: def.namespace,
      version: this._version,
      fieldDescriptors: def.fieldDescriptors,
    });

    this._namespaces.set(scheme.namespace, scheme);
  }

  addScheme(scheme: Scheme) {
    const newScheme = scheme.clone(this._version);
    this._namespaces.set(newScheme.namespace, newScheme);
  }

  getScheme(namespace: string): Scheme | undefined {
    return this._namespaces.get(namespace);
  }

  schemeExists(namespace: string) {
    return this._namespaces.has(namespace);
  }
}

let managerLoadFunc = (manager: ISchemeManagerRegister) => {
  runRegister(manager);
};

export function overrideManagerRegistration(
  func: (manager: ISchemeManagerRegister) => void,
) {
  managerLoadFunc = func;
}

export class SchemeManager implements ISchemeManagerRegister {
  private static _instance: SchemeManager;

  private _versions: Map<number, SchemeVersion>;
  private _currVersion: number;

  constructor() {
    this._versions = new Map<number, SchemeVersion>();
    this._currVersion = 0;
  }

  static get instance() {
    if (!SchemeManager._instance) {
      const instance = new SchemeManager();
      managerLoadFunc(instance);
      SchemeManager._instance = instance;
    }
    return SchemeManager._instance;
  }

  /**
   * WARNING Use only for Testing!!!
   * @param manager
   */
  static setCustomInstance(manager: SchemeManager) {
    SchemeManager._instance = manager;
  }

  /**
   * Register a new version of schemes
   * @param version
   * @param schemeDefs
   * @param upFunc Function update the records data object
   */

  register(
    version: number,
    schemeDefs: SchemeDef<SchemeObject>[],
    extraNamespaces: string[],
    upFunc?: (namespace: string, data: any) => void,
  ) {
    assert(this._currVersion + 1 === version);
    if (version === 1) {
      assert(isNoValue(upFunc));
      assert(extraNamespaces.length === 0);
    }
    if (version > 1) {
      assert(!isNoValue(upFunc));
    }
    const schVersion = new SchemeVersion(version, upFunc);

    //Copy schemes from prev version
    if (version > 1 && extraNamespaces.length > 0) {
      for (const ns of extraNamespaces) {
        const prevScheme = this.getScheme(ns);
        if (prevScheme) {
          schVersion.addScheme(prevScheme);
        }
      }
    }

    //Override new def
    for (const def of schemeDefs) {
      schVersion.addDef(def);
    }

    this._versions.set(version, schVersion);

    this._currVersion++;
  }

  /**
   * Get Scheme by namespace and version (optional)
   * @param namespace
   * @param version if version is not sent, will return the latest version
   */
  getScheme(namespace: string, version?: number): Scheme | undefined {
    if (version !== undefined) {
      return this._versions.get(version)?.getScheme(namespace);
    }

    for (let v = this._currVersion; v >= 1; v--) {
      const version = this._versions.get(v);
      if (version) {
        const scheme = version.getScheme(namespace);
        if (scheme) {
          return scheme;
        }
      }
    }
  }

  schemeExists(namespace: string, version: number): boolean {
    return this._versions.get(version)?.schemeExists(namespace) || false;
  }

  getUpFunc(version: number) {
    return this._versions.get(version)?.upFunc;
  }
}
