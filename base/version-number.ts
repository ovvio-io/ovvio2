import { Tuple4, tuple4Make } from './tuple.ts';

export type VersionNumber = Tuple4;

export const V3_0_0: VersionNumber = tuple4Make([3, 0, 0, 0]);

export const VCurrent = V3_0_0;
