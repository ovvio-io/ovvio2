import React from 'https://esm.sh/react@18.2.0';
import { BaseRange, Text } from 'https://esm.sh/slate@0.87.0';
import { isMention } from '../../mentions/index.tsx';
import { DecorateHandler, RenderLeafHandler } from '../index.ts';
import { isLinkLeafProps, LinkLeaf } from './link-leaf.tsx';

function getUrlRanges(
  str: string
): { start: number; end: number; url: string }[] {
  const ranges = [];
  let index = 0;
  while (index + 'http://'.length <= str.length) {
    const letters = str.substring(index, index + 'https://'.length);
    if (letters.startsWith('http://') || letters === 'https://') {
      let rangeEnd = str.indexOf(' ', index + letters.length);
      if (rangeEnd === -1) {
        rangeEnd = str.length;
      }
      ranges.push({
        start: index,
        end: rangeEnd,
        url: str.substring(index, rangeEnd),
      });
      index = rangeEnd;
    } else {
      index++;
    }
  }

  return ranges;
}

const EMPTY: BaseRange[] = [];

export function createLinkDecoration(): DecorateHandler & RenderLeafHandler {
  return {
    decorate([node, path]) {
      if (!Text.isText(node) || isMention(node)) {
        return EMPTY;
      }

      const urls = getUrlRanges(node.text);
      return urls.map((data) => ({
        link: data.url,
        anchor: { path, offset: data.start },
        focus: { path, offset: data.end },
      }));
    },
    renderLeaf(props) {
      if (isLinkLeafProps(props)) {
        return <LinkLeaf {...props} />;
      }
      return null;
    },
  };
}
