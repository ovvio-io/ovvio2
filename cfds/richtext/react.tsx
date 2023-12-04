import React, { useRef, useImperativeHandle } from 'react';
import { Document } from './doc-state.ts';
import { TreeNode, isElementNode, isTextNode } from './tree.ts';
import { MarkupNode, RefNode } from './model.ts';
import { makeStyles, cn } from '../../styles/css-objects/index.ts';
import {
  WritingDirection,
  resolveWritingDirection,
} from '../../base/string.ts';
import { brandLightTheme as theme } from '../../styles/theme.tsx';
import { styleguide } from '../../styles/styleguide.ts';

const useStyles = makeStyles(() => ({
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
  taskElement: {
    boxSizing: 'border-box',
    borderBottom: '1px solid',
    borderTop: '1px solid',
    borderColor: theme.primary.p2,
    display: 'flex',
  },
  taskCheckbox: {
    marginTop: styleguide.gridbase * 2,
    marginBottom: styleguide.gridbase * 2,
    marginRight: styleguide.gridbase * 2,
  },
}));

export interface RichTextRef {
  readonly anchorNode: HTMLElement | null;
  readonly focusNode: HTMLElement | null;
}

interface RenderContext {
  doc: Document;
  selectionId: string;
  // anchorRef: React.RefObject<HTMLElement>;
  // focusRef: React.RefObject<HTMLElement>;
  baseDirection?: WritingDirection;
}

type TaskElementProps = React.PropsWithChildren<{
  id: string;
  className?: string;
  dir?: WritingDirection;
}>;

const TaskElement = React.forwardRef<HTMLDivElement, TaskElementProps>(
  function TaskElement(
    { children, className, dir, id }: TaskElementProps,
    ref
  ) {
    const styles = useStyles();
    return (
      <div
        className={cn(styles.taskElement, className)}
        ref={ref}
        dir={dir}
        key={`task-container/${id}`}
        data-ovv-key={id}
      >
        <img
          className={cn(styles.taskCheckbox)}
          src="/icons/design-system/checkbox/not-selected.svg"
        />
        {children}
      </div>
    );
  }
);

type EditorNodeProps = React.PropsWithChildren<{
  node: MarkupNode;
  ctx: RenderContext;
}>;

const EditorNode = React.forwardRef<RichTextRef, EditorNodeProps>(
  function EditorNodeImpl({ node, ctx }: EditorNodeProps, exposedRef) {
    const styles = useStyles();
    const selection = ctx.doc.ranges && ctx.doc.ranges[ctx.selectionId];
    const anchorRef = useRef<HTMLElement>(null);
    const focusRef = useRef<HTMLElement>(null);
    const ref =
      (selection?.anchor?.node as TreeNode) === node
        ? anchorRef
        : (selection?.focus?.node as TreeNode) === node
        ? focusRef
        : undefined;

    useImperativeHandle(
      exposedRef,
      () => {
        return {
          get anchorNode() {
            return anchorRef.current;
          },
          get focusNode() {
            return focusRef.current;
          },
        };
      },
      [anchorRef, focusRef]
    );

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
        return (
          <EditorNode
            node={n as MarkupNode}
            ctx={ctx}
            ref={exposedRef}
            key={ctx.doc.nodeKeys.keyFor(node).id}
          />
        );
      });
    }

    switch (node.tagName) {
      case 'h1':
        return (
          <h1
            key={ctx.doc.nodeKeys.keyFor(node).id}
            ref={ref as React.RefObject<HTMLHeadingElement>}
            data-ovv-key={ctx.doc.nodeKeys.keyFor(node).id}
            dir={dir !== ctx.baseDirection ? dir : undefined}
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
            dir={dir !== ctx.baseDirection ? dir : undefined}
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
            dir={dir !== ctx.baseDirection ? dir : undefined}
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
            dir={dir !== ctx.baseDirection ? dir : undefined}
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
            dir={dir !== ctx.baseDirection ? dir : undefined}
          >
            {children}
          </li>
        );

      case 'ref':
        return (
          <TaskElement
            id={ctx.doc.nodeKeys.keyFor(node).id}
            ref={ref as React.RefObject<HTMLParagraphElement>}
            dir={dir !== ctx.baseDirection ? dir : undefined}
          >
            {children}
          </TaskElement>
        );

      case 'p':
      default:
        return (
          <p
            key={ctx.doc.nodeKeys.keyFor(node).id}
            ref={ref as React.RefObject<HTMLParagraphElement>}
            data-ovv-key={ctx.doc.nodeKeys.keyFor(node).id}
            dir={dir !== ctx.baseDirection ? dir : undefined}
          >
            {children}
          </p>
        );
    }
  }
);

export const RichTextRenderer = React.forwardRef<RichTextRef, RenderContext>(
  function RichTextRenderer(ctx: RenderContext, ref) {
    // const styles = useStyles();
    // const selection = ctx.doc.ranges && ctx.doc.ranges[ctx.selectionId];

    return ctx.doc.root.children.map((node) => {
      return (
        <EditorNode
          node={node as MarkupNode}
          ctx={ctx}
          ref={ref}
          key={ctx.doc.nodeKeys.keyFor(node).id}
        />
      );
    });
  }
);
