export type {
  CoreOptions,
  Clonable,
  Comparable,
  CoreArray,
  CoreClassObject,
  CoreDictionary,
  CoreObject,
  CoreSet,
  CoreValue,
  Encodable,
  Encoder,
  Equatable,
  ReadonlyCoreArray,
  ReadonlyCoreObject,
  CoreValueCloneOpts,
  ConcreteCoreValue,
  CoreKey,
} from './base';

export { CoreType } from './base';

export { getCoreType, isReadonlyCoreObject, getCoreTypeOrUndef } from './utils';

export { coreValueClone } from './clone';

export { coreValueCompare } from './comparable';

export { coreValueEquals } from './equals';
