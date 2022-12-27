import { BaseVertex } from './base.ts';
import { TagValue } from '../../../base/scheme-types.ts';
import { coreValueClone } from '../../../../base/core-types/index.ts';
import { Dictionary } from '../../../../base/collections/dict.ts';

export class Tag extends BaseVertex {
  get name(): string {
    return this.record.get('name', '');
  }

  set name(n: string) {
    this.record.set('name', n);
  }

  get values(): Dictionary<string, TagValue> {
    const ret = this.record.get<Dictionary<string, TagValue>>('values');
    return ret ? coreValueClone(ret) : new Map();
  }

  set values(values: Dictionary<string, TagValue>) {
    this.record.set('values', coreValueClone(values));
  }

  getValue(key: string): TagValue | undefined {
    return coreValueClone(
      this.record.get<Dictionary<string, TagValue>>('values')?.get(key)
    );
  }

  setValue(key: string, value: TagValue): void {
    const map = this.record.get('values', new Map());
    map.set(key, coreValueClone(value));
    this.record.set('values', map);
  }
}

// const kFieldTriggersTag: FieldTriggers<Tag> = {
// };
//
// Vertex.registerFieldTriggers(Tag, kFieldTriggersTag);
