export function versionNumberGetMajor(ver: VersionNumber): number {
  return Math.floor(ver / 10000);
}

export function versionNumberGetMinor(ver: VersionNumber): number {
  return Math.floor((ver % 10000) / 100);
}

export function versionNumberGetPatch(ver: VersionNumber): number {
  return ver % 100;
}

export function versionNumberCreate(
  major: number,
  minor: number,
  patch: number
): number {
  return major * 10000 + minor * 100 + patch;
}

export function versionNumberToString(ver: VersionNumber): string {
  return [
    versionNumberGetMajor(ver),
    versionNumberGetMinor(ver),
    versionNumberGetPatch(ver),
  ].join('.');
}

export function versionNumberFromString(str: string): VersionNumber {
  const comps = str.split('.');
  return versionNumberCreate(
    parseInt(comps[0]) || 0,
    parseInt(comps[1]) || 0,
    parseInt(comps[2]) || 0
  );
}

export enum VersionNumber {
  Unknown = 0,
  V3_0_0 = versionNumberCreate(3, 0, 0),
  Current = V3_0_0,
}
