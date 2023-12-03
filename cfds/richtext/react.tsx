import React from 'react';
import { Document } from './doc-state.ts';
import { TreeNode, isElementNode, isTextNode } from './tree.ts';
import { MarkupNode } from './model.ts';
import { makeStyles, cn } from '../../styles/css-objects/index.ts';
import {
  WritingDirection,
  resolveWritingDirection,
} from '../../base/string.ts';

const useStyles = makeStyles((theme) => ({
  contentEditable: {
    width: '100%',
    height: '100%',
    whiteSpace: 'pre-wrap',
  },
  emptySpan: {
    display: 'inline-block',
    minHeight: '1em',
    minWidth: '1px',
  },
}));

interface RenderContext {
  doc: Document;
  selectionId: string;
  anchorRef: React.RefObject<HTMLElement>;
  focusRef: React.RefObject<HTMLElement>;
  baseDirection?: WritingDirection;
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
  let dir: WritingDirection = node.dir || 'auto';
  if (isElementNode(node)) {
    children = node.children.map((n) => {
      if (dir === 'auto' && isTextNode(n)) {
        dir = resolveWritingDirection(n.text);
      }
      return renderNode(n as MarkupNode, ctx, styles) as JSX.Element;
    });
  }

  switch (node.tagName) {
    case 'h1':
      return (
        <h1
          key={ctx.doc.nodeKeys.keyFor(node).id}
          ref={ref as React.RefObject<HTMLHeadingElement>}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node).id}
          dir={dir === 'rtl' ? 'rtl' : undefined}
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
          dir={dir === 'rtl' ? 'rtl' : undefined}
        >
          {children}
        </h2>
      );

    case 'ol':
      return (
        <ol
          key={ctx.doc.nodeKeys.keyFor(node).id}
          ref={ref as React.RefObject<HTMLOListElement>}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node).id}
          start={node.start}
          dir={dir === 'rtl' ? 'rtl' : undefined}
        >
          {children}
        </ol>
      );

    case 'ul':
      return (
        <ul
          key={ctx.doc.nodeKeys.keyFor(node).id}
          ref={ref as React.RefObject<HTMLUListElement>}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node).id}
          dir={dir === 'rtl' ? 'rtl' : undefined}
        >
          {children}
        </ul>
      );

    case 'li':
      return (
        <li
          key={ctx.doc.nodeKeys.keyFor(node).id}
          ref={ref as React.RefObject<HTMLLIElement>}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node).id}
          dir={dir === 'rtl' ? 'rtl' : undefined}
        >
          {children}
        </li>
      );

    default:
      return (
        <p
          key={ctx.doc.nodeKeys.keyFor(node).id}
          ref={ref as React.RefObject<HTMLParagraphElement>}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node).id}
          dir={dir === 'rtl' ? 'rtl' : undefined}
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
