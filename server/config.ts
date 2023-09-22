import { VCurrent, VersionNumber } from '../base/version-number.ts';

export interface OvvioConfig {
  version: VersionNumber;
  debug: boolean;
  clientData?: unknown;
}

export function getOvvioConfig(): OvvioConfig {
  let config = (window as any).OvvioConfig as OvvioConfig | undefined;
  if (!config) {
    config = config || {
      version: VCurrent,
      debug: false,
    };
    (window as any).OvvioConfig = config;
  }
  return config;
}

export function getClientData<T>(): T | undefined {
  return getOvvioConfig().clientData as T;
}

export function setClientData<T>(data: T | undefined): void {
  getOvvioConfig().clientData = data;
}
