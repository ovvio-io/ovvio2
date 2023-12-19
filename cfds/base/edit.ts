import {
  DataChanges,
  DecodedDataChange,
  decodedDataChanges,
} from './object.ts';
import { Scheme } from './scheme.ts';
import { JSONValue, ReadonlyJSONObject } from '../../base/interfaces.ts';
import {
  JSONDecoder,
  JSONEncoder,
} from '../../base/core-types/encoding/json.ts';
import {
  ConstructorDecoderConfig,
  Decoder,
  isDecoderConfig,
} from '../../base/core-types/encoding/index.ts';
import {
  Clonable,
  Encodable,
  Encoder,
  Equatable,
} from '../../base/core-types/index.ts';
import { coreValueClone } from '../../base/core-types/clone.ts';

/**
 * A single set of changes that should be applied to a specific record.
 * Two checksums are supplied alongside the changes - source and destination.
 * The source checksum is of the document from which the diff was originally
 * computed. The destination checksum is of the document after the changes have
 * been applied.
 *
 * An optional scheme object is included which, if present, represents a
 * request to update the record's scheme.
 */
export interface EditConfig {
  changes: DataChanges;
  srcChecksum: string;
  dstChecksum: string;
  scheme?: Scheme;
}

export interface EncodedEdit {
  c: DecodedDataChange;
  sc: string;
  dc: string;
  s?: ReadonlyJSONObject;
}

export class Edit implements Encodable, Equatable, Clonable {
  readonly changes: DataChanges;
  readonly srcChecksum: string;
  readonly dstChecksum: string;
  readonly scheme?: Scheme;

  constructor(config: EditConfig | ConstructorDecoderConfig<EncodedEdit>) {
    if (isDecoderConfig(config)) {
      const decoder = config.decoder;

      this.changes = decodedDataChanges(decoder.get<DecodedDataChange>('c')!);
      this.srcChecksum = decoder.get<string>('sc')!;
      this.dstChecksum = decoder.get<string>('dc')!;
      this.scheme = decoder.has('s')
        ? new Scheme({ decoder: decoder.get<Decoder>('s')! })
        : undefined;
    } else {
      this.changes = config.changes;
      this.srcChecksum = config.srcChecksum;
      this.dstChecksum = config.dstChecksum;
      this.scheme = config.scheme;
    }
  }

  get isEmpty(): boolean {
    return this.srcChecksum === this.dstChecksum;
  }

  clone(): Edit {
    return new Edit({
      srcChecksum: this.srcChecksum,
      dstChecksum: this.dstChecksum,
      scheme: this.scheme,
      changes: coreValueClone(this.changes),
    });
  }

  get affectedKeys() {
    return Object.keys(this.changes);
  }

  toJS(): JSONValue {
    const encoder = new JSONEncoder();
    this.serialize(encoder);
    return encoder.getOutput();
  }

  serialize(encoder: Encoder): void {
    encoder.set('sc', this.srcChecksum);
    encoder.set('dc', this.dstChecksum);
    encoder.set('c', this.changes);
    encoder.set('s', this.scheme);
  }

  isEqual(other: Edit): boolean {
    return (
      this.srcChecksum === other.srcChecksum &&
      this.dstChecksum === other.dstChecksum
    );
  }

  static fromJS(obj: ReadonlyJSONObject): Edit {
    const decoder = new JSONDecoder(obj);
    return new this({ decoder });
  }

  static editsContainField(edits: Iterable<Edit>, fieldName: string): boolean {
    for (const e of edits) {
      if (e.changes.hasOwnProperty(fieldName)) {
        return true;
      }
    }
    return false;
  }
}
