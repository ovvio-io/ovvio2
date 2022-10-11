import { CoreOptions, CoreValue } from '../core-types/base';
import { ChecksumEncoderOpts, Murmur3Checksum } from './checksum';

const kMurmurEncoder = new Murmur3Checksum({ typeSafe: false });

export function encodableValueHash(
  v: CoreValue,
  options?: CoreOptions | ChecksumEncoderOpts
): string {
  return kMurmurEncoder.checksumForValue(v, options);
}
