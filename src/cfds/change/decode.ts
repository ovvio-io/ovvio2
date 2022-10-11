import { Change, ChangeType, EncodedChange } from '.';
import { Decoder } from '../encoding';
import { FieldChange } from './field-change';
import { RichTextChange } from './richtext-change';
import { RichText2Change } from './richtext2-change';

export function decodeChange<EC extends EncodedChange = EncodedChange>(
  decoder: Decoder<keyof EC & string>
): Change<EC> {
  const type = decoder.get('changeType') as ChangeType;
  switch (type) {
    case 'fd':
      return new FieldChange({ decoder });
    case 'rt':
      return new RichTextChange({ decoder });
    case 'rt-2':
      return new RichText2Change({ decoder });
  }
}
