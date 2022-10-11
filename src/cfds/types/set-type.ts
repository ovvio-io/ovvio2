import { Utils } from '@ovvio/base';
import { ValueType, ValueTypeOptions } from '.';
import { Change, EncodedChange } from '../../change';
import { CoreTypeOperations } from './core-type';
import { FieldChange, FieldOperation } from '../../change/field-change';
import { ConcreteCoreValue, CoreType } from '../../core-types';
import { DecodedValue } from '../../encoding';

export class SetTypeOperations extends CoreTypeOperations<
  Set<ConcreteCoreValue>
> {
  constructor(readonly isRef: boolean, valueType: ValueType) {
    super(CoreType.Set, valueType);
  }

  patch(
    curValue: Set<ConcreteCoreValue> | undefined,
    changes: Change<EncodedChange>[],
    options?: ValueTypeOptions
  ) {
    for (const change of changes) {
      if (change instanceof FieldChange) {
        if (change.operation === FieldOperation.Insert) {
          curValue = this.patchInsert(curValue, change);
        } else if (change.operation === FieldOperation.Delete) {
          curValue = this.patchDelete(curValue, change);
        }
      }
    }
    return curValue;
  }

  private patchInsert(
    curValue: Set<ConcreteCoreValue> | undefined,
    change: FieldChange<Set<ConcreteCoreValue>>
  ) {
    curValue = curValue || new Set<ConcreteCoreValue>();
    return Utils.Set.unionByValue(curValue, change.value);
  }

  private patchDelete(
    curValue: Set<ConcreteCoreValue> | undefined,
    change: FieldChange<Set<ConcreteCoreValue>>
  ) {
    if (curValue === undefined) return curValue;

    const newValue = Utils.Set.subtractByValue(curValue, change.value);
    return newValue.size > 0 ? newValue : undefined;
  }

  fillRefs(refs: Set<string>, value: Set<ConcreteCoreValue>): void {
    if (this.isRef && value && value instanceof Set) {
      for (const val of value) {
        if (typeof val === 'string') {
          refs.add(val);
        }
      }
    }
  }

  rewriteRefs(
    keyMapping: Map<string, string>,
    value: Set<ConcreteCoreValue>,
    deleteRefs?: Set<string>
  ): Set<ConcreteCoreValue> {
    if (!this.isRef) {
      return value;
    }
    const result = new Set<ConcreteCoreValue>();
    for (const v of value) {
      if (!deleteRefs?.has(v as string)) {
        result.add(keyMapping.get(v as string) || v);
      }
    }
    return result;
  }

  valueChangedDiff(
    value1: Set<ConcreteCoreValue>,
    value2: Set<ConcreteCoreValue>,
    options?: ValueTypeOptions
  ) {
    const added = Utils.Set.subtractByValue(value2, value1);
    const removed = Utils.Set.subtractByValue(value1, value2);

    if (added.size === 0 && removed.size === 0) {
      return;
    }

    const changes: Change<EncodedChange>[] = [];

    if (added.size) {
      changes.push(FieldChange.insert(added, this.valueType));
    }

    if (removed.size) {
      changes.push(FieldChange.delete(removed, this.valueType));
    }

    return changes;
  }

  isEmpty(value: Set<ConcreteCoreValue>) {
    return value.size === 0;
  }

  deserialize(value: DecodedValue, options?: ValueTypeOptions) {
    const desValue = super.deserialize(value, options);
    if (desValue instanceof Array) {
      //Backward compatibility from old deserialize that save as array of json
      return Utils.Set.from(desValue, JSON.parse);
    }
    return desValue;
  }
}
