import { BaseEditor } from 'https://esm.sh/slate@0.87.0';
import { ReactEditor } from 'https://esm.sh/slate-react@0.87.1';
import { BulletListElement } from './elements/bullet-list.element.tsx';
import { NumberedListElement } from './elements/numbered-list.element.tsx';
import { HeaderElement } from './elements/header.element.tsx';
import {
  CardElement,
  LoadingCardElement,
} from './elements/card.element/index.tsx';
import { ListItemElement } from './elements/list-item.element.tsx';
import { MentionElement, MentionEditor } from './mentions/index.tsx';
import { ElementNode, TextNode } from '../../../../cfds/richtext/tree.ts';
import { Header2Element } from './elements/header2.element.tsx';
import { CfdsEditor } from './cfds/with-cfds.tsx';

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
  link?: string;
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

declare module 'https://esm.sh/slate@0.87.0' {
  interface CustomTypes {
    Editor: OvvioEditor;
    Element: ElementNodeType;
    Text: TextType;
  }
}
