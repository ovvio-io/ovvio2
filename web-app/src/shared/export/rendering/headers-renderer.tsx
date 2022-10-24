import React from 'react';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { styleguide } from '@ovvio/styles/lib';
import { NodeRenderer, RenderProps } from './types';

const styles = makeStyles(
  theme => ({
    h1: {
      fontSize: 30,
      fontWeight: 'bold',
      marginBottom: styleguide.gridbase * 2,
    },
    h2: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: styleguide.gridbase,
    },
  }),
  'pdf'
);

export default class HeadersRenderer implements NodeRenderer {
  css() {
    return styles.getCss();
  }

  renderNode({ node, children, attributes }: RenderProps, next: () => any) {
    if (node.tagName === 'h1') {
      return (
        <div className={cn(styles.h1)} {...attributes}>
          {children}
        </div>
      );
    }
    if (node.tagName === 'h2') {
      return (
        <div className={cn(styles.h2)} {...attributes}>
          {children}
        </div>
      );
    }

    return next();
  }
}
