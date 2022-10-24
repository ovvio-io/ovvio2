import { VertexManager } from './graph/vertex-manager.ts';
import { BaseVertex } from './graph/vertices/base.ts';

export interface ISortable {
  sortStamp: string;
}

export function sortStampCompare(a: ISortable, b: ISortable) {
  const aSort = a.sortStamp as string;
  const bSort = b.sortStamp as string;

  if (aSort > bSort) {
    return -1;
  } else if (aSort < bSort) {
    return 1;
  }
  return 0;
}

export function sortMngStampCompare(
  aMng: VertexManager<BaseVertex>,
  bMng: VertexManager<BaseVertex>
) {
  const a = aMng.getVertexProxy();
  const b = bMng.getVertexProxy();

  return sortStampCompare(a, b);
}
