import { deserializeDate } from '@ovvio/base/lib/utils';
import { ValueType, ValueTypeOptions } from '.';
import { CoreType } from '../../core-types';
import { DecodedValue } from '../../encoding';
import { PrimitiveTypeOperations } from './primitive-type';

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
