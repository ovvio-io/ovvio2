import { isRefMarker } from '../../richtext/model';
import { SerializeValueTypeOptions, ValueType, ValueTypeOptions } from '.';
import { Change, EncodedChange } from '../../change';
import { RichTextChange } from '../../change/richtext-change';
import {
  CoreOptions,
  CoreType,
  coreValueClone,
  coreValueEquals,
  Encoder,
} from '../../core-types';
import { DecodedValue } from '../../encoding';
import { diff, patch } from '../../richtext/diff-patch';
import { flattenRichText } from '../../richtext/flat-rep';
import { normalizeRichText } from '../../richtext/normalize';
import {
  initRichText,
  isRichText,
  RichText,
  onlyNoneLocal,
  purgeExpiredPointers,
  isExpiredPointer,
  treeAtomKeyFilterIgnoreText,
  dfs,
} from '../../richtext/tree';
import { CoreTypeOperations } from './core-type';

const kCoreValueOpts: CoreOptions = {
  objectFilterFields: treeAtomKeyFilterIgnoreText,
};

const expiredPointersBuffer = 1000 * 60 * 10; //10 minutes

export class RichText3TypeOperations extends CoreTypeOperations<RichText> {
  constructor() {
    super(CoreType.Object, ValueType.RICHTEXT_V3);
  }
  patch(
    curValue: RichText | undefined,
    changes: Change<EncodedChange>[],
    _options?: ValueTypeOptions
  ) {
    if (curValue === undefined) {
      curValue = initRichText();
    }

    const newValue = patch(curValue, changes as RichTextChange[], true);

    return newValue;
  }

  normalize(val: RichText) {
    return normalizeRichText(val);
  }

  getRefOperation() {
    return undefined;
  }

  validate(value: any): boolean {
    return isRichText(value);
  }

  serialize(
    key: string,
    value: RichText,
    encoder: Encoder,
    options?: SerializeValueTypeOptions
  ): void {
    const local = options?.local === true; //default false

    if (options?.flatRep === true) {
      // For checksum purposes we need to use the flat rep or we won't account
      // for depth changes. Computing the checksum on a DFS run of the tree
      // completely strips out the depth info.

      //const flat = Array.from(flattenRichText(value, local));
      const flat = flattenRichText(value, local, false);

      encoder.set(key, flat, kCoreValueOpts);
    } else {
      const func = local ? undefined : onlyNoneLocal;
      encoder.set(key, value, {
        iterableFilter: func,
      });
    }
  }

  deserialize(value: DecodedValue, options?: ValueTypeOptions) {
    return value as RichText;
  }

  valueAddedDiff(value2: RichText, options?: ValueTypeOptions) {
    const local = options?.local === true; //Default is false

    const empty = initRichText();

    return diff(empty, value2, local);
  }

  valueRemovedDiff(
    value1: RichText,
    options?: ValueTypeOptions
  ): Change<EncodedChange> | Change<EncodedChange>[] | undefined {
    const local = options?.local === true; //Default is false

    const empty = initRichText();

    return diff(value1, empty, local);
  }

  valueChangedDiff(
    value1: RichText,
    value2: RichText,
    options?: ValueTypeOptions
  ) {
    const local = options?.local === true; //Default is false
    return diff(value1, value2, local);
  }

  isEmpty(_value: RichText): boolean {
    return false;
  }

  equals(val1: RichText, val2: RichText, options?: ValueTypeOptions): boolean {
    const local = options?.local === true; //Default is false

    const func = local ? undefined : onlyNoneLocal;
    return coreValueEquals(val1, val2, {
      iterableFilter: func,
    });
  }

  clone(value: RichText) {
    return coreValueClone(value);
  }

  needGC(value: RichText): boolean {
    if (value.pointers) {
      for (const pointer of value.pointers) {
        if (isExpiredPointer(pointer, expiredPointersBuffer)) {
          return true;
        }
      }
    }
    return false;
  }

  gc(value: RichText): RichText | undefined {
    return purgeExpiredPointers(value, expiredPointersBuffer);
  }

  fillRefs(refs: Set<string>, value: RichText): void {
    for (const [node] of dfs(value.root)) {
      if (isRefMarker(node)) {
        refs.add(node.ref);
      }
    }
  }

  rewriteRefs(
    keyMapping: Map<string, string>,
    value: RichText,
    deleteRefs?: Set<string>
  ): RichText {
    for (const [node, _depth, path] of dfs(value.root, true)) {
      if (isRefMarker(node)) {
        if (deleteRefs?.has(node.ref)) {
          const children = path[path.length - 1].children!;
          children.splice(children.indexOf(node), 1);
        } else {
          node.ref = keyMapping.get(node.ref) || node.ref;
        }
      }
    }
    return value;
  }
}
