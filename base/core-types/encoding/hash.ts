import { CoreOptions, CoreValue } from '../base.ts';
import {
  ChecksumEncoderOpts,
  Murmur3Checksum,
  Murmur3Opts,
} from './checksum.ts';

const kMurmurEncoder = new Murmur3Checksum({ typeSafe: false });

export function encodableValueHash(
  v: CoreValue,
  options?: CoreOptions | ChecksumEncoderOpts
): string {
  return kMurmurEncoder.checksumForValue(v, options as Murmur3Opts);
}
