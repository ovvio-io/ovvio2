// import { IValueTypeOperations, ValueType, ValueTypeOptions } from '.';
// import { Change, EncodedChange } from '../../change';
// import { RichText2Change } from '../../change/richtext2-change';
// import { Encoder } from '../../core-types';
// import { DecodedValue } from '../../encoding';
// import { RichTextDiff } from '../../primitives-old/richtext-diff';
// import {
//   emptyDiff,
//   isTrivialDiff,
//   RichText,
// } from '../../primitives-old/richtext2';

// export class RichText2TypeOperations implements IValueTypeOperations<RichText> {
//   get valueType(): ValueType {
//     return ValueType.RICHTEXT_V2;
//   }
//   patch(
//     curValue: RichText | undefined,
//     changes: Change<EncodedChange>[],
//     options?: ValueTypeOptions
//   ) {
//     if (changes.length > 2) {
//       throw new Error('Legacy RichText type supports patching up to 2 changes');
//     }

//     if (curValue === undefined) {
//       curValue = new RichText();
//     }

//     const diff1 = changes[0]
//       ? (changes[0] as RichText2Change).diff
//       : emptyDiff();
//     const diff2 = changes[1]
//       ? (changes[1] as RichText2Change).diff
//       : emptyDiff();

//     curValue.patch(diff1, diff2);

//     return this.isEmpty(curValue) ? undefined : curValue;
//   }

//   getNormalizeOperation() {
//     return this;
//   }

//   normalize(val: RichText) {
//     val.normalize();
//   }

//   getRefOperation() {
//     return undefined;
//   }

//   validate(value: any): boolean {
//     return value instanceof RichText;
//   }

//   equals(val1: RichText, val2: RichText, options?: ValueTypeOptions): boolean {
//     const local = (options && options.local) || false;
//     return val1.isEqual(val2, local);
//   }

//   clone(value: RichText) {
//     return value.clone();
//   }

//   serialize(
//     key: string,
//     value: RichText,
//     encoder: Encoder,
//     options?: ValueTypeOptions
//   ): void {
//     const local = (options && options.local) || false;

//     const vJS = value.toJS(local);
//     encoder.set(key, vJS);
//   }

//   deserialize(value: DecodedValue, options?: ValueTypeOptions) {
//     if (typeof value === 'string') {
//       value = JSON.parse(value);
//     }
//     return RichText.fromJS(value);
//   }

//   valueAddedDiff(value2: RichText, options?: ValueTypeOptions) {
//     const local = (options && options.local) || false;
//     const diff = new RichText().diff(value2, local);

//     if (!isTrivialDiff(diff)) {
//       return new RichText2Change({ diff });
//     }
//   }

//   valueRemovedDiff(
//     value1: RichText,
//     options?: ValueTypeOptions
//   ): Change<EncodedChange> | Change<EncodedChange>[] | undefined {
//     const local = (options && options.local) || false;
//     const diff = value1.diff(new RichText(), local);

//     if (!isTrivialDiff(diff)) {
//       return new RichText2Change({ diff });
//     }
//   }

//   valueChangedDiff(
//     value1: RichText,
//     value2: RichText,
//     options?: ValueTypeOptions
//   ) {
//     const local = (options && options.local) || false;
//     const diff = value1.diff(value2, local) as RichTextDiff;

//     if (!isTrivialDiff(diff)) {
//       return new RichText2Change({ diff });
//     }
//   }

//   isEmpty(value: RichText): boolean {
//     return value.root.children.length === 0;
//   }

//   needGC(value: RichText): boolean {
//     return false;
//   }

//   gc(value: RichText): RichText | undefined {
//     return undefined;
//   }

//   rewriteRef(oldKey: string, newKey: string, value: RichText): void {}
// }
