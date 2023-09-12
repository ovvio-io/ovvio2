import {
  VersionNumber,
  versionNumberDeleteBuild,
  versionNumberGetBuild,
  versionNumberSetBuild,
} from '../defs.ts';

export interface OvvioConfig {
  version: VersionNumber;
  debug: boolean;
}

export function getOvvioConfig(): OvvioConfig {
  let config = (window as any).OvvioConfig as OvvioConfig | undefined;
  if (!config) {
    config = config || {
      version: VersionNumber.Current,
      debug: false,
    };
    (window as any).OvvioConfig = config;
  }
  return config;
}
