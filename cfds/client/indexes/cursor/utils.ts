import { CoreValue } from '../../../core-types';
import { ICursor } from '../types';
import { AndCursor } from './and';
import { OrCursor } from './or';
import { SubCursor } from './sub';

export function cursorAnd<V extends CoreValue = CoreValue>(
  cursor1: ICursor<V>,
  cursor2: ICursor<V>
) {
  return new AndCursor<V>(cursor1, cursor2);
}

export function cursorOr<V extends CoreValue = CoreValue>(
  cursor1: ICursor<V>,
  cursor2: ICursor<V>
) {
  return new OrCursor<V>(cursor1, cursor2);
}

export function cursorSub<V extends CoreValue = CoreValue>(
  cursor1: ICursor<V>,
  cursor2: ICursor<V>
) {
  return new SubCursor<V>(cursor1, cursor2);
}
