import React from 'react';
import { Renderer, RenderProps } from './types';

function BulletItem({ children, attributes }) {
  return <div {...attributes}>{children}</div>;
}

export default class ListsRenderer implements Renderer {
  css() {
    return '';
  }
  renderPlainText({ node, children }: RenderProps, next: () => any) {
    if (node.tagName === 'ul') {
      let str = '';
      const spl = (children as string).split('\n');

      for (let i = 0; i < spl.length; i++) {
        if (spl[i].trim() !== '') str += `• ${spl[i]}\n`;
      }
      return str;
    }
    if (node.tagName === 'ol') {
      let str = '';
      const spl = (children as string).split('\n');
      let num = 1;
      for (let i = 0; i < spl.length; i++) {
        if (spl[i].trim() !== '') {
          str += `${num++}. ${spl[i]}\n`;
        }
      }
      return str;
    }
    return next();
  }

  renderNode({ node, children, attributes }: RenderProps, next: () => any) {
    if (node.tagName === 'ul') {
      return <BulletItem children={children} attributes={attributes} />;
    }
    if (node.tagName === 'ol') {
      return <ol>{children}</ol>;
    }
    if (node.tagName === 'li') {
      return <li>{children}</li>;
    }

    return next();
  }
}
