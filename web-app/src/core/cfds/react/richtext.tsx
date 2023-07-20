import { useState, useMemo, useRef, useEffect } from 'react';
import { RichText } from '@ovvio/cfds/lib/primitives-old/richtext2';
// import { EVENT_DID_CHANGE } from '@ovvio/cfds/lib/client/record-state';
// import { Value } from 'slate';
// import { useCfdsClient } from './client';
// import { usePartialRecord } from './record';
// import SlateDocumentSerializer, { FieldTypes } from '../richtext/serializer';
// import SlateDocumentBuilder from '../richtext/deserializer';
export enum FieldTypes {
  title = 'TITLE',
  body = 'BODY',
}
// // export { FieldTypes };
// const EMPTY_VALUE = { children: [] }
// // const EMPTY_VALUE = Value.fromJSON({
// //   object: 'value',
// //   document: {
// //     object: 'document',
// //     nodes: [
// //       {
// //         object: 'block',
// //         type: 'line',
// //         nodes: [
// //           {
// //             object: 'text',
// //             leaves: [
// //               {
// //                 object: 'leaf',
// //                 text: '',
// //                 marks: [],
// //               },
// //             ],
// //           },
// //         ],
// //       },
// //     ],
// //   },
// // });

interface CollaborativeValue {
  value: any;
  onChange: (e: any) => void;
  missing: boolean;
  reload: () => void;
}

export type RichtextKeys<T> = {
  [K in keyof T]: T[K] extends RichText ? K : never;
}[keyof T];

// function getFirstSelection(doc) {
//   const iterateNode = (node, path) => {
//     if (node.object === 'text') {
//       const length = node.leaves.reduce((accum, val) => {
//         return val.text.length + accum;
//       }, 0);
//       return {
//         object: 'seletion',
//         isFocused: false,
//         anchor: {
//           object: 'point',
//           path: path,
//           offset: length,
//         },
//         focus: {
//           object: 'point',
//           path: path,
//           offset: length,
//         },
//       };
//     }
//     if (node.nodes && node.nodes.length) {
//       const nodes = node.nodes;
//       for (let i = nodes.length - 1; i >= 0; i--) {
//         const sel = iterateNode(nodes[i], [...path, i]);
//         if (sel) {
//           return sel;
//         }
//       }
//     }
//   };

//   return iterateNode(doc, []);
// }

// function extractSlateValue<T, K extends RichtextKeys<T>>(
//   record: IRecordState<T>,
//   field: K,
//   deserializer: SlateDocumentBuilder
// ): any {
//   if (!record || !deserializer || !field) {
//     return EMPTY_VALUE;
//   }
//   const rt = record.get(field);
//   if (!rt) {
//     return EMPTY_VALUE;
//   }
//   const { doc, decorations } = deserializer.deserialize(rt, true, { record });

//   const val = {}

//   return val;
// }

interface CollaborativeTextOptions {
  persistSelection?: boolean;
  fieldType?: 'BODY' | 'TITLE';
}

// function noop() { }

// // function printTree(doc) {
// //   const iterate = (node, indent) => {
// //     console.log(`${indent}${node.object}-${node.type || 'NONE'}-${node.key}`)
// //     if (!node.nodes) {
// //       return;
// //     }
// //     for (let i = 0; i < node.nodes.length; i++) {
// //       const child = node.nodes[i];
// //       iterate(child, indent + '  ');
// //     }
// //   }
// //   iterate(doc, '');
// // }

// function throttle<T extends Function>(fn: T, ms: number): T {
//   let lastCalled: number;
//   let timeoutId: number;
//   const callFn = (...args) => {
//     lastCalled = Date.now();
//     fn(...args);
//     timeoutId = null;
//   };
//   return (((...args) => {
//     if (timeoutId) {
//       window.clearTimeout(timeoutId);
//       timeoutId = null;
//     }
//     const now = Date.now();
//     const diff = now - lastCalled;

//     if (diff < ms) {
//       // timeoutId = window.setTimeout(() => {
//       //   callFn(...args);
//       //   timeoutId = null;
//       // }, ms - diff)
//     } else {
//       callFn(...args);
//     }
//   }) as unknown) as T;
// }

// export function useCollaborativeText<T, K extends RichtextKeys<T>>(
//   record: IRecordState<T>,
//   field: K,
//   {
//     persistSelection = true,
//     fieldType = FieldTypes.body,
//   }: CollaborativeTextOptions = {}
// ): CollaborativeValue {
//   const pr = usePartialRecord(record, [field]);
//   const cfdsClient = useCfdsClient();
//   const deserializer = useMemo(() => {
//     if (cfdsClient) {
//       return SlateDocumentBuilder.forType(fieldType, (key: string) =>
//         cfdsClient.get<Card>(key)
//       );
//     }
//   }, [cfdsClient, fieldType]);
//   const mounted = useRef(true);
//   useEffect(() => {
//     return () => {
//       mounted.current = false;
//     };
//   }, []);

//   const [value, setValue] = useState<any>(() =>
//     extractSlateValue(record, field, deserializer)
//   );
//   const serializer = useMemo(() => SlateDocumentSerializer.forType(fieldType), [
//     fieldType,
//   ]);
//   const reloadFromRt = () => {
//     const { doc, decorations } = deserializer.deserialize(
//       pr.get(field),
//       true,
//       pr
//     );

//     setValue((oldValue: any) => {
//       if (oldValue) {
//         doc.key = oldValue.document.key;
//       }

//       let newValue = {}
//       // if (oldValue && persistSelection) {
//       //   newValue = newValue.setSelection(oldValue.selection);
//       // }

//       return newValue;
//     });
//   };
//   useEffect(() => {
//     if (!record) {
//       return;
//     }
//     let cancelled = false;
//     const callback = (isLocal, changedKeys, errorChanged) => {
//       // console.log(`Local: ${isLocal}`);
//       if (
//         cancelled ||
//         isLocal ||
//         (changedKeys.length && !changedKeys.includes(field))
//       ) {
//         return;
//       }
//       const { doc, decorations } = deserializer.deserialize(
//         record.get(field),
//         true,
//         record
//       );

//       setValue((oldValue: any) => {
//         if (oldValue) {
//           doc.key = oldValue.document.key;
//         }

//         let newValue = {};

//         return newValue;
//       });
//     };
//     record.on(EVENT_DID_CHANGE, callback);
//     setValue(extractSlateValue(record, field, deserializer));
//     return () => {
//       cancelled = true;
//       record.removeListener(EVENT_DID_CHANGE, callback);
//     };
//   }, [record, field, deserializer, persistSelection]);

//   const onChange = useMemo(() => {
//     // const updateRecord = throttle(change => {
//     //   console.log('CALLED');
//     //   const newRichtext = serializer.serialize(change.value.document);
//     //   record.update(x => x.set(field, newRichtext as any));
//     // }, 1000);
//     return change => {
//       if (!mounted.current) {
//         return;
//       }

//       const newRichtext = serializer.serialize(change.value.document);
//       record.update(x => x.set(field, newRichtext as any));

//       const val = change.value.setProperties({
//         data: { undos: [], redos: [] },
//       });

//       setValue(val);
//     };
//   }, [record, field, serializer]);

//   return {
//     onChange,
//     value,
//     missing: false,
//     reload: reloadFromRt,
//   };
// }
export function useCollaborativeText<T, K extends RichtextKeys<T>>(
  record: T,
  field: K,
  { persistSelection = true, fieldType = 'BODY' }: CollaborativeTextOptions = {}
): CollaborativeValue {
  return null;
}
