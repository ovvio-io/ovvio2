import { Tuple4, tuple4Make } from './tuple.ts';

export type VersionNumber = Tuple4;

// 21/1/2024
export const V3_0_0: VersionNumber = tuple4Make([3, 0, 0, 0]);
// 25/1/2024
export const V3_0_1: VersionNumber = tuple4Make([3, 0, 1, 0]);
// 1/2/2024
export const V3_0_2: VersionNumber = tuple4Make([3, 0, 2, 0]);
// 8/2/2024
export const V3_1_0: VersionNumber = tuple4Make([3, 1, 0, 0]);
// 11/2/2024
export const V3_1_1: VersionNumber = tuple4Make([3, 1, 1, 0]);
// 14/2/2024
export const V3_1_2: VersionNumber = tuple4Make([3, 1, 2, 0]);
// 15/2/2024
export const V3_1_3: VersionNumber = tuple4Make([3, 1, 3, 0]);
// 19/2/2024
export const V3_1_4: VersionNumber = tuple4Make([3, 1, 4, 0]);
// 26/2/2024
export const V3_2_0: VersionNumber = tuple4Make([3, 2, 0, 0]);
export const V3_3_0: VersionNumber = tuple4Make([3, 3, 0, 0]);

export const VCurrent = V3_3_0;
