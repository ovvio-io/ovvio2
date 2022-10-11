import { Utils } from '@ovvio/base';
import { ConstructorDecoderConfig, isDecoderConfig } from '../encoding';
import {
  CoreValue,
  Encodable,
  Encoder,
  Equatable,
  ReadonlyCoreObject,
} from '../core-types';

export type ChangeType = 'fd' | 'rt' | 'rt-2';

export interface EncodedChange extends ReadonlyCoreObject {
  readonly changeType: ChangeType;
}

export interface ChangeValueConfig {}

export abstract class Change<EC extends EncodedChange>
  implements Encodable<keyof EC, CoreValue>, Equatable
{
  constructor(config?: ChangeValueConfig | ConstructorDecoderConfig<EC>) {
    if (isDecoderConfig(config)) {
      Utils.assert(config.decoder.get('changeType') === this.getType());
    }
  }

  abstract getType(): ChangeType;

  serialize(encoder: Encoder<keyof EC, CoreValue>, _options?: unknown): void {
    encoder.set('changeType', this.getType());
  }

  abstract isEqual(other: Change<EC>): boolean;
}
