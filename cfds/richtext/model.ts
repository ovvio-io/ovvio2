import { AttachmentData } from '../base/scheme-types.ts';
import {
  CoreValue,
  isReadonlyCoreObject,
} from '../../base/core-types/index.ts';
import { ElementNode, isTextNode, RichTextValue, TextNode } from './tree.ts';

export type MarkupNode = ParagraphNode | Header1Node | Header2Node;
// | UnorderedListNode
// | OrderedListNode
// | ListItemNode
// | TableNode
// | TableRowNode
// | TableCellNode
// | RefNode
// | RefMarker
// | SpanNode
// | ObjectNode
// | HyperlinkNode
// | ImageNode
// | MentionElement;

export interface ParagraphNode extends ElementNode {
  readonly tagName: 'p';
}

export interface Header1Node extends ElementNode {
  readonly tagName: 'h1';
}

export interface Header2Node extends ElementNode {
  readonly tagName: 'h2';
}

export interface UnorderedListNode extends ElementNode {
  readonly tagName: 'ul';
}

export interface OrderedListNode extends ElementNode {
  readonly tagName: 'ol';
}

export interface ListItemNode extends ElementNode {
  readonly tagName: 'li';
}

export interface TableNode extends ElementNode {
  readonly tagName: 'table';
}

export interface TableRowNode extends ElementNode {
  readonly tagName: 'tr';
}

export interface TableCellNode extends ElementNode {
  readonly tagName: 'td';
}

export enum RefType {
  Link = 'link',
  InternalDoc = 'inter-doc',
}

/**
 * A leaf node marker for a reference. It is used in the following cases:
 *
 * - In persistent, decomposed, rich text. This node is what's actually stored
 *   in the body field of a note.
 *
 * - During composition, to represent a reference that's still loading.
 */
export interface RefMarker extends RichTextValue {
  ref: string;
  readonly type: RefType;
  readonly loading?: true;
}

/**
 * A composited reference node as an element. Its children hold a
 * representation of the reference's target.
 */
export interface RefNode extends ElementNode, RefMarker {
  readonly tagName: 'ref';
  ref: string;
  type: RefType;
}

export function isRefNode(atom: CoreValue): atom is RefNode {
  return (
    isReadonlyCoreObject(atom) &&
    atom.tagName === 'ref' &&
    typeof atom.ref === 'string' &&
    typeof atom.type === 'string'
  );
}

export function isRefMarker(atom: CoreValue): atom is RefMarker {
  return (
    isReadonlyCoreObject(atom) &&
    typeof atom.ref === 'string' &&
    typeof atom.type === 'string' &&
    (atom.local === undefined || atom.local === true)
  );
}

export interface SpanNode extends TextNode {
  readonly tagName: 'span';
  bold?: boolean;
  underline?: boolean;
  strike?: boolean;
  italic?: boolean;
}

export function isSpanNode(atom: CoreValue): atom is SpanNode {
  return isTextNode(atom) && atom.tagName === 'span';
}

export interface HyperlinkNode extends TextNode {
  readonly tagName: 'a';
  href: string;
}

export interface ObjectNode extends RichTextValue {
  readonly tagName: 'object';
}

export interface ImageNode extends RichTextValue {
  readonly tagName: 'img';
  src: string;
}

export interface InlineTaskNode extends ElementNode {
  readonly tagName: 'inline-task';
  assignees?: Set<string>;
  attachments?: Set<AttachmentData>;
  tags?: Set<string>;
  dueDate?: Date;
  status?: number;
}

export interface MentionElement extends ElementNode {
  tagName: 'mention';
  pluginId: string;
  isLocal: true;
}
