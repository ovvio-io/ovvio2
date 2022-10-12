import { deserializeDate } from '../../../base/date.ts';
import { ValueType, ValueTypeOptions } from './index.ts';
import { CoreType } from '../../core-types/index.ts';
import { DecodedValue } from '../../encoding/index.ts';
import { PrimitiveTypeOperations } from './primitive-type.ts';

export class DateTypeOperations extends PrimitiveTypeOperations<Date> {
  constructor() {
    super(CoreType.Date, ValueType.DATE);
  }

  deserialize(value: DecodedValue, options?: ValueTypeOptions) {
    const date = super.deserialize(value, options);
    if (typeof date === 'number') {
      return deserializeDate(date);
    }
    return date;
  }
}
