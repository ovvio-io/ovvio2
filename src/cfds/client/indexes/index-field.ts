import { Utils } from '@ovvio/base';
import { CoreArray, CoreValue, ReadonlyCoreArray } from '../../core-types';
import { MutationPack, mutationPackIter } from '../graph/mutations';
import { isVertex, IVertex } from '../graph/types';
import { isGenerator } from '@ovvio/base/lib/utils/comparisons';
import { ErrorType, typeFromCode } from '../../server/errors';
import { VertexManager } from '../graph/vertex-manager';

export interface IndexKeyOptions<V extends IVertex> {
  onlyReady?: boolean;
  filter?: (v: V) => boolean;
  groupBys?: ((v: V) => CoreValue)[];
  sortBy?: (v: V) => CoreValue;
  invalidateByFields?: (keyof V & string)[];
  invalidateFunc?: (pack: MutationPack, neighbor?: IVertex) => boolean;
}

export interface CompositeField<
  V extends IVertex = IVertex,
  T extends CoreValue = CoreValue
> {
  calcValue(vertex: V): T;
  shouldInvalidate(pack: MutationPack, neighbor?: IVertex): boolean;
}

export class IndexField<V extends IVertex = IVertex>
  implements CompositeField<V, ReadonlyCoreArray[] | undefined>
{
  private _options: IndexKeyOptions<V>;
  private _invalidateByFields?: Set<string>;

  constructor(options: IndexKeyOptions<V>) {
    this._options = options;
    if (options.invalidateByFields) {
      this._invalidateByFields = new Set<string>(options.invalidateByFields);
    }
  }

  calcValue(vertex: V): ReadonlyCoreArray[] | undefined {
    if (this._options.onlyReady === true) {
      if (
        vertex.isLoading ||
        (vertex.errorCode &&
          typeFromCode(vertex.errorCode) === ErrorType.NoAccess) ||
        vertex.isDeleted !== 0
      ) {
        //Vertex is loading or in no access error or deleted
        return;
      }
    }
    if (this._options.filter) {
      if (!this._options.filter(vertex)) {
        return;
      }
    }

    const groupBys =
      this._options.groupBys && this._options.groupBys.map(f => f(vertex));
    const sortBy = this._options.sortBy && this._options.sortBy(vertex);

    return calcKeys(vertex, groupBys, sortBy);
  }

  shouldInvalidate(pack: MutationPack, neighbor?: IVertex): boolean {
    if (!neighbor) {
      if (this._invalidateByFields || this._options.onlyReady === true) {
        for (const [field] of mutationPackIter(pack)) {
          if (this._options.onlyReady === true) {
            if (
              field === 'isLoading' ||
              field === 'errorCode' ||
              field === 'isDeleted'
            ) {
              return true;
            }
          }
          if (this._invalidateByFields && this._invalidateByFields.has(field)) {
            return true;
          }
        }
      }
    }
    if (this._options.invalidateFunc) {
      return this._options.invalidateFunc(pack, neighbor);
    }
    return false;
  }
}

function calcKeys(
  vertex: IVertex,
  groupsBys?: CoreValue[],
  sortBy?: CoreValue
): ReadonlyCoreArray[] {
  const parts = (groupsBys?.length || 0) + 1;
  let groupValues: CoreArray[] | undefined;

  if (groupsBys && groupsBys.length > 0) {
    const groupArrays: CoreArray[] = [];
    let i = 0;
    for (let i = 0; i < groupsBys.length; i++) {
      const val = groupsBys[i];
      if (val instanceof Array && val.length > 0) {
        groupArrays.push(val as CoreArray);
      } else if (val instanceof Set || isGenerator(val)) {
        const arr = Array.from(val);
        if (arr.length > 0) groupArrays.push(arr);
      } else if (val !== undefined && val !== null) {
        groupArrays.push([val as any]);
      }
    }

    groupValues =
      groupArrays.length > 0
        ? Utils.cartesianProduct(...groupArrays)
        : groupArrays;
  }

  const keys: ReadonlyCoreArray[] = new Array(
    groupValues ? groupValues.length : 1
  );
  for (let i = 0; i < keys.length; i++) {
    const key: CoreValue[] = new Array(parts);
    keys[i] = key;
    let j = 0;

    //Set Groups
    if (groupsBys && groupValues) {
      for (let k = 0; k < groupsBys.length; k++) {
        key[j++] = convertKeyValue(groupValues[i][k]);
      }
      // for (const grpVal of groupValues[i]) {
      //   key[j++] = grpVal;
      // }
    }

    //Always: Sort + Key
    key[j] = [convertKeyValue(sortBy), vertex.key];
  }

  return keys;
}

function convertKeyValue(value: CoreValue) {
  if (value instanceof VertexManager) {
    return value.key;
  }
  if (isVertex(value)) {
    return value.key;
  }
  return value;
}
