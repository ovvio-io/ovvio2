import { assert } from '../../base/error.ts';
import {
  ConstructorDecoderConfig,
  isDecoderConfig,
} from '../../base/core-types/encoding/index.ts';
import {
  CoreValue,
  Encodable,
  Encoder,
  Equatable,
  ReadonlyCoreObject,
} from '../../base/core-types/index.ts';

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
      assert(config.decoder.get('changeType') === this.getType());
    }
  }

  abstract getType(): ChangeType;

  serialize(encoder: Encoder<keyof EC, CoreValue>, _options?: unknown): void {
    encoder.set('changeType', this.getType());
  }

  abstract isEqual(other: Change<EC>): boolean;
}
