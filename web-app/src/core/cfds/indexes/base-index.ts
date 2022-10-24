import { IndexBuilder } from '@ovvio/cfds/lib/client/indexes/builder';
import { IIndex } from '@ovvio/cfds/lib/client/indexes/types';
import { IVertex } from '@ovvio/cfds/lib/client/graph/types';
import { SchemeNamespace } from '@ovvio/cfds/lib/base/scheme-types';

export interface Index<V extends IVertex = IVertex> {
  readonly name: string;
  readonly namespaces: SchemeNamespace | SchemeNamespace[];
  buildIndex(indexBuilder: IndexBuilder<V>): IIndex<V>;
}
