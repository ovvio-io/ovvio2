import React from 'react';
import { Document } from './doc-state.ts';
import { TreeNode, isElementNode, isTextNode } from './tree.ts';
import { MarkupNode } from './model.ts';
import { makeStyles, cn } from '../../styles/css-objects/index.ts';

const useStyles = makeStyles((theme) => ({
  contentEditable: {
    width: '100%',
    height: '100%',
    whiteSpace: 'pre-wrap',
  },
  emptySpan: {
    display: 'inline-block',
    minHeight: '0.7em',
    minWidth: '1px',
  },
}));

interface RenderContext {
  doc: Document;
  selectionId: string;
  anchorRef: React.RefObject<HTMLElement>;
  focusRef: React.RefObject<HTMLElement>;
}

function renderNode(
  node: MarkupNode,
  ctx: RenderContext,
  styles: ReturnType<typeof useStyles>
) {
  const selection = ctx.doc.ranges && ctx.doc.ranges[ctx.selectionId];
  const ref =
    (selection?.anchor?.node as TreeNode) === node
      ? ctx.anchorRef
      : (selection?.focus?.node as TreeNode) === node
      ? ctx.focusRef
      : undefined;
  if (isTextNode(node)) {
    return (
      <span
        className={cn(node.text.length === 0 && styles.emptySpan)}
        key={ctx.doc.nodeKeys.keyFor(node).id}
        ref={ref}
        data-ovv-key={ctx.doc.nodeKeys.keyFor(node).id}
      >
        {node.text}
      </span>
    );
  }
  let children: JSX.Element[] | undefined;
  if (isElementNode(node)) {
    children = node.children.map((n) =>
      renderNode(n as MarkupNode, ctx, styles)
    );
  }

  switch (node.tagName) {
    case 'h1':
      return (
        <h1
          key={ctx.doc.nodeKeys.keyFor(node).id}
          ref={ref as React.RefObject<HTMLHeadingElement>}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node).id}
        >
          {children}
        </h1>
      );

    case 'h2':
      return (
        <h2
          key={ctx.doc.nodeKeys.keyFor(node).id}
          ref={ref as React.RefObject<HTMLHeadingElement>}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node).id}
        >
          {children}
        </h2>
      );

    default:
      return (
        <p
          key={ctx.doc.nodeKeys.keyFor(node).id}
          ref={ref as React.RefObject<HTMLParagraphElement>}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node).id}
        >
          {children}
        </p>
      );
  }
}

export function renderRichText(ctx: RenderContext) {
  const styles = useStyles();
  const selection = ctx.doc.ranges && ctx.doc.ranges[ctx.selectionId];

  return ctx.doc.root.children.map((node) => {
    return renderNode(node as MarkupNode, ctx, styles);
  });
}
