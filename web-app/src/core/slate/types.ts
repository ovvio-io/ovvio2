import { BaseEditor, Element } from 'slate';
import { ReactEditor } from 'slate-react';
import { BulletListElement } from './elements/bullet-list.element';
import { NumberedListElement } from './elements/numbered-list.element';
import { HeaderElement } from './elements/header.element';
import { CardElement, LoadingCardElement } from './elements/card.element';
import { ListItemElement } from './elements/list-item.element';
import { MentionElement, MentionEditor } from './mentions';
import { ElementNode, TextNode } from '@ovvio/cfds/lib/richtext/tree';
import { Header2Element } from './elements/header2.element';
import { CfdsEditor } from './cfds/with-cfds';

export type OvvioEditor = BaseEditor & ReactEditor & CfdsEditor & MentionEditor;

export type NodeKey = string;

export interface ParagraphElement extends ElementNode {
  tagName: 'p';
  children: TextType[];
}

export interface FormattedText extends TextNode {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  link?: string
}

export type ElementNodeType =
  | ParagraphElement
  | HeaderElement
  | Header2Element
  | MentionElement
  | BulletListElement
  | NumberedListElement
  | ListItemElement
  | CardElement
  | LoadingCardElement;

export type TextType = FormattedText | MentionElement;

declare module 'slate' {
  interface CustomTypes {
    Editor: OvvioEditor;
    Element: ElementNodeType;
    Text: TextType;
  }
}

export const ParagraphElement = {
  isParagraph(value: any): value is ParagraphElement {
    return Element.isElement(value) && value.tagName === 'p';
  },
};
