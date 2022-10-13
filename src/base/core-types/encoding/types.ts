import { ReadonlyJSONValue } from '../../interfaces.ts';

export type ReadonlyDecodedObject = {
  readonly [key: string]: DecodedValue;
};

export type DecodableKey = string;

export type ReadonlyDecodedArray = readonly DecodedValue[];

export type DecodedValue =
  | ReadonlyJSONValue
  | Date
  | Set<DecodedValue>
  | ReadonlyDecodedObject
  | ReadonlyDecodedArray
  | Decoder<DecodableKey, DecodedValue>;

export interface Decoder<
  K extends DecodableKey = DecodableKey,
  V extends DecodedValue = DecodedValue
> {
  get<T extends V>(key: K, defaultValue?: T): T | undefined;
  has(key: K): boolean;
  getDecoder(key: K, offset?: number): Decoder<K, V>;
}

export interface Decodable<
  K extends DecodableKey = DecodableKey,
  V extends DecodedValue = DecodedValue,
  OT = unknown
> {
  deserialize(decoder: Decoder<K, V>, options?: OT): void;
}

export interface ConstructorDecoderConfig<T = object> {
  readonly decoder: Decoder<keyof T & string>;
}
