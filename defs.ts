export function versionNumberGetMajor(ver: VersionNumber): number {
  return Math.floor(ver / 10000);
}

export function versionNumberGetMinor(ver: VersionNumber): number {
  return Math.floor((ver % 10000) / 100);
}

export function versionNumberGetPatch(ver: VersionNumber): number {
  return ver % 100;
}

export function versionNumberGetBuild(ver: VersionNumber): number {
  return parseInt(String(ver).split('.')[1] || '0');
}

export function versionNumberSetBuild(
  ver: VersionNumber,
  build = 0
): VersionNumber {
  const exp = Math.max(1, Math.ceil(Math.log10(build)));
  return (ver | 0) + build / Math.pow(10, exp);
}

export function versionNumberDeleteBuild(ver: VersionNumber): number {
  return parseInt(String(ver).split('.')[0] || '0');
}

export function versionNumberCreate(
  major: number,
  minor: number,
  patch: number,
  build?: number
): number {
  let res = major * 10000 + minor * 100 + patch;
  if (typeof build === 'number' && build > 0) {
    res = versionNumberSetBuild(res, build);
  }
  return res;
}

export function versionNumberToString(ver: VersionNumber): string {
  return [
    versionNumberGetMajor(ver),
    versionNumberGetMinor(ver),
    versionNumberGetPatch(ver),
    versionNumberGetBuild(ver),
  ].join('.');
}

export function versionNumberFromString(str: string): VersionNumber {
  const comps = str.split('.');
  return versionNumberCreate(
    parseInt(comps[0]) || 0,
    parseInt(comps[1]) || 0,
    parseInt(comps[2]) || 0,
    parseInt(comps[3]) || 0
  );
}

export enum VersionNumber {
  Unknown = 0,
  V3_0_0 = versionNumberCreate(3, 0, 0),
  Current = V3_0_0,
}
