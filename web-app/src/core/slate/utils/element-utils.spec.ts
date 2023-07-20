import { Element } from "slate";
import { MENTION_NODE_TYPE } from "../mentions";
import { FormattedText } from "../types";
import { createStaticEditor } from "../utils";
import { ElementUtils } from "./element-utils"

describe('ElementUtils', () => {
  describe('isEmptyElement', () => {
    it('returns false for text nodes', () => {
      const text: FormattedText = { text: '' };
      expect(ElementUtils.isEmptyElement(text)).toBe(false);
    });
    it('returns false for an element with single non empty text', () => {
      const el: Element = {
        tagName: 'p',
        children: [{ text: 'Hello' }]
      };
      expect(ElementUtils.isEmptyElement(el)).toBe(false);
    });
    it('returns false for an element with single empty element', () => {
      const el: Element = {
        tagName: 'ul',
        children: [{ tagName: 'li', children: [] }]
      };
      expect(ElementUtils.isEmptyElement(el)).toBe(false);
    });
    it('returns false for an element with multiple children', () => {
      const el: Element = {
        tagName: 'p',
        children: [{ text: '' }, { tagName: MENTION_NODE_TYPE, children: [], pluginId: 'a', isLocal: true }]
      };
      expect(ElementUtils.isEmptyElement(el)).toBe(false);
    });
    it('returns true for an element without children', () => {
      const el: Element = {
        tagName: 'p',
        children: []
      };
      expect(ElementUtils.isEmptyElement(el)).toBe(true);
    });
    it('returns true for an element with single empty text', () => {
      const el: Element = {
        tagName: 'p',
        children: [{ text: '' }]
      };
      expect(ElementUtils.isEmptyElement(el)).toBe(true);
    });
  });
  describe('getClosestNode', () => {
    const editor = createStaticEditor([{
      tagName: 'p',
      children: [{ text: 'bla' }]
    }]);
  });
});