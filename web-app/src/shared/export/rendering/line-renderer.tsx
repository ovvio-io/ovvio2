import React from 'react';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { NodeRenderer, RenderProps } from './types';

const styles = makeStyles(
  theme => ({
    line: {
      color: theme.background.text,
      fontSize: 12,
      lineHeight: 1.83,
    },
  }),
  'pdf'
);

export default class LineRenderer implements NodeRenderer {
  css() {
    return styles.getCss();
  }

  renderNode({ node, children, attributes }: RenderProps, next: () => any) {
    if (node.tagName === 'p') {
      return (
        <p className={cn(styles.line)} {...attributes}>
          {children}
        </p>
      );
    }

    return next();
  }
}
