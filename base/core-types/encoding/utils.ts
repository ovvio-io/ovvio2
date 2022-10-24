import { ConstructorDecoderConfig } from './types.ts';

export function isDecoderConfig<T extends ConstructorDecoderConfig<any>>(
  v: any
): v is T {
  return v !== undefined && v.hasOwnProperty('decoder');
}
