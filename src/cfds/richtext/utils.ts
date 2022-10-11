import {
  JSONObject,
  ReadonlyJSONObject,
} from '@ovvio/base/lib/utils/interfaces';
import { JSONCyclicalDecoder, JSONCyclicalEncoder } from '../encoding/json';
import { dfs, isTextNode, RichText, TextNode } from './tree';

export function findFirstTextNode(rt: RichText): TextNode | undefined {
  for (const [node] of dfs(rt.root)) {
    if (isTextNode(node)) {
      return node;
    }
  }
}

export function richTextToJS(rt: RichText): JSONObject {
  const jsEncoder = new JSONCyclicalEncoder();
  jsEncoder.set('rt', rt);

  const out = jsEncoder.getOutput() as ReadonlyJSONObject;
  const rtJS = out['rt'] as JSONObject;
  return rtJS;
}

export function jsToRichtext(rtJS: JSONObject): RichText {
  const jsDecoder = new JSONCyclicalDecoder({ rt: rtJS });

  const out = jsDecoder.get('rt') as RichText;
  return out;
}
