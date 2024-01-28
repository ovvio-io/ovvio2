import { Tuple4, tuple4Make } from './tuple.ts';

export type VersionNumber = Tuple4;

// 21/1/2024
export const V3_0_0: VersionNumber = tuple4Make([3, 0, 0, 0]);
// 25/1/2024
export const V3_0_1: VersionNumber = tuple4Make([3, 0, 1, 0]);
// 1/2/2024
export const V3_0_2: VersionNumber = tuple4Make([3, 0, 2, 0]);

export const VCurrent = V3_0_1;
