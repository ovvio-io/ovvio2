import React from 'react';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { NodeRenderer, RenderProps } from './types';

const styles = makeStyles(
  theme => ({
    title: {
      fontSize: 20,
    },
  }),
  'pdf'
);

export default class TitleRenderer implements NodeRenderer {
  css() {
    return styles.getCss();
  }

  renderNode({ node, children }: RenderProps, next: () => any) {
    if (node.tagName === 'p') {
      return <div className={cn(styles.title)}>{children}</div>;
    }

    return next();
  }
}
