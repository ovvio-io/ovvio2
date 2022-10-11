import { Utils } from '@ovvio/base';
import { ValueType } from '.';
import { CoreType } from '../../core-types';
import { PrimitiveTypeOperations } from './primitive-type';

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
