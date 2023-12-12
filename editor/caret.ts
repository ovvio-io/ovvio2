import { WritingDirection, resolveWritingDirection } from '../base/string.ts';
import { Document } from '../cfds/richtext/doc-state.ts';
import {
  pathToNode,
  TextNode,
  isTextNode,
  findLastTextNode,
} from '../cfds/richtext/tree.ts';
import { MarkupElement, MarkupNode } from '../cfds/richtext/model.ts';
