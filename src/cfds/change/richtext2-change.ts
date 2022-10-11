import { notReached } from '@ovvio/base/lib/utils/error';
import { JSONObject } from '@ovvio/base/lib/utils/interfaces';
import { Change, ChangeType, ChangeValueConfig, EncodedChange } from '.';
import { CoreValue, coreValueEquals, Encoder } from '../core-types';
import { ConstructorDecoderConfig, isDecoderConfig } from '../encoding';
import { RichTextDiff } from '../primitives-old/richtext-diff';

interface EncodedRichText2Change extends EncodedChange {
  diff: JSONObject;
}

export interface RichText2ChangeConfig extends ChangeValueConfig {
  diff: RichTextDiff;
}

export class RichText2Change extends Change<EncodedRichText2Change> {
  isEqual(other: RichText2Change): boolean {
    if (other.getType() !== this.getType()) return false;

    const myDiffObj = this.diff.toJS() as JSONObject;
    const otherObj = other.diff.toJS() as JSONObject;

    return coreValueEquals(myDiffObj, otherObj);
  }

  getType(): ChangeType {
    return 'rt-2';
  }

  readonly diff: RichTextDiff;

  constructor(
    config:
      | RichText2ChangeConfig
      | ConstructorDecoderConfig<EncodedRichText2Change>
  ) {
    super(config);

    if (isDecoderConfig(config)) {
      const decoder = config.decoder;
      this.diff = RichTextDiff.fromJS(decoder.get('diff'));
    } else {
      this.diff = config.diff;
    }
  }

  serialize(
    _encoder: Encoder<keyof EncodedRichText2Change, CoreValue>,
    _options?: unknown
  ): void {
    throw new Error('richtext 2 serialize should not be used');
    // super.serialize(encoder, _options);
    // encoder.set('diff', this.diff.toJS());
  }
}
