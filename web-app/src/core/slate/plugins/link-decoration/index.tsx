import { Text } from 'slate';
import { isMention } from '../../mentions';
import { DecorateHandler, RenderLeafHandler } from '..';
import { isLinkLeafProps, LinkLeaf } from './link-leaf';

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

const EMPTY = [];

export function createLinkDecoration(): DecorateHandler & RenderLeafHandler {
  return {
    decorate([node, path]) {
      if (!Text.isText(node) || isMention(node)) {
        return EMPTY;
      }

      const urls = getUrlRanges(node.text);
      return urls.map(data => ({
        link: data.url,
        anchor: { path, offset: data.start },
        focus: { path, offset: data.end },
      }));
    },
    renderLeaf(props) {
      if (isLinkLeafProps(props)) {
        return <LinkLeaf {...props} />;
      }
    },
  };
}
