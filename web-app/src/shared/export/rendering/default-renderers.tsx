import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { Renderer, RenderProps } from './types';

import { isElementNode, isTextNode } from '@ovvio/cfds/lib/richtext/tree';

const styles = makeStyles(
  theme => ({
    underline: {
      textDecoration: 'underline',
    },
    strikethrough: {
      textDecoration: 'line-through',
    },
  }),
  'pdf'
);
class BaseRenderer implements Renderer {
  css() {
    return styles.getCss();
  }

  renderPlainText({ node, children }: RenderProps, next: () => any) {
    if (isTextNode(node)) {
      return node.text;
    }
    if (isElementNode(node)) {
      return `${children}\n`;
    }
    debugger;
    throw new Error(`Unknown node received: ${node.tagname}`);
  }

  renderNode(props: RenderProps, next: () => any) {
    const { node } = props;

    if (isTextNode(node)) {
      let content = <span>{node.text}</span>;
      const markers: string[] = [];
      if (node.bold === true) {
        markers.push('bold');
      }
      if (node.underline === true) {
        markers.push('underline');
      }
      if (node.strike === true) {
        markers.push('strike');
      }
      if (node.italic === true) {
        markers.push('italic');
      }

      for (var i = markers.length - 1; i >= 0; i--) {
        const mark = markers[i];
        content = this._renderMark(mark, content, props);
      }

      return content;
    }

    if (isElementNode(node)) {
      return <div>{props.children}</div>;
    }
    debugger;
    throw new Error(`Unknown node received: ${node.tagname}`);
  }

  private _renderMark(
    mark: string,
    children: any,
    { attributes }: RenderProps
  ) {
    switch (mark) {
      case 'bold':
        return <b {...attributes}>{children}</b>;
      case 'italic':
        return <em {...attributes}>{children}</em>;
      case 'underline':
        return (
          <span className={cn(styles.underline)} {...attributes}>
            {children}
          </span>
        );
      case 'strike':
        return (
          <span className={cn(styles.strikethrough)} {...attributes}>
            {children}
          </span>
        );
      default:
        return children;
    }
  }
}

const renderers: Renderer[] = [new BaseRenderer()];
export default renderers;
