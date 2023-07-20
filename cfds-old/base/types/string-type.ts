import { ValueType } from './index.ts';
import { CoreType } from '../../../base/core-types/index.ts';
import { PrimitiveTypeOperations } from './primitive-type.ts';

export class StringTypeOperations extends PrimitiveTypeOperations<string> {
  constructor(readonly isRef: boolean) {
    super(CoreType.String, isRef ? ValueType.REF : ValueType.STRING);
  }

  fillRefs(refs: Set<string>, value: string): void {
    if (this.isRef) {
      refs.add(value);
    }
  }
}
