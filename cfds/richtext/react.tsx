import React, { useEffect, useImperativeHandle, useRef } from 'react';
import * as ArrayUtils from '../../base/array.ts';
import { Document } from './doc-state.ts';
import {
  ElementNode,
  isElementNode,
  isTextNode,
  pathToNode,
  TextNode,
  TreeNode,
} from './tree.ts';
import { isRefNode, MarkupElement, MarkupNode, RefNode } from './model.ts';
import { cn, makeStyles } from '../../styles/css-objects/index.ts';
import {
  resolveWritingDirection,
  WritingDirection,
} from '../../base/string.ts';
import { brandLightTheme as theme } from '../../styles/theme.tsx';
import { styleguide } from '../../styles/styleguide.ts';
import { CoreValue } from '../../base/core-types/base.ts';
import { writingDirectionAtNode } from './doc-state.ts';
import { CheckBox } from '../../components/task.tsx';
import { usePartialVertex } from '../../web-app/src/core/cfds/react/vertex.ts';
import { VertexManager } from '../client/graph/vertex-manager.ts';
import { Note } from '../client/graph/vertices/note.ts';
import { useGraphManager } from '../../web-app/src/core/cfds/react/graph.tsx';

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
    alignItems: 'flex-start',
    transition:
      `background-color ${styleguide.transition.duration.short}ms ease-out`,
  },
  focusedTask: {
    backgroundColor: theme.primary.p1,
  },
  unfocusedTask: {
    backgroundColor: 'transparent',
    ':hover': {
      backgroundColor: theme.secondary.s1,
    },
  },
  taskCheckbox: {
    marginTop: styleguide.gridbase * 2,
    marginBottom: styleguide.gridbase * 2,
    marginInlineEnd: styleguide.gridbase * 2,
  },
  taskText: {
    overflowWrap: 'break-word',
    color: theme.mono.m10,
    transition:
      `text-decoration-color ${styleguide.transition.duration.short}ms ease-in`,
    textDecorationColor: 'transparent',
    position: 'relative',
    top: '-3px',
  },
  uncheckedTaskText: {
    textDecorationColor: 'transparent',
  },
  checkedTaskText: {
    textDecoration: 'line-through',
    textDecorationColor: theme.mono.m10,
  },
  focusedTaskText: {
    borderBottom: 'solid',
    borderBottomSize: '1px',
    borderBottomColor: theme.primary.p8,
  },
  p: {
    fontWeight: '400',
    fontSize: '13px',
    lineHeight: '18px',
  },
  h1: {
    fontWeight: '600',
    fontSize: '34px',
    lineHeight: '45px',
  },
  h2: {
    fontWeight: '600',
    fontSize: '30px',
    lineHeight: '32px',
  },
  h3: {
    fontWeight: '600',
    fontSize: '18px',
    lineHeight: '24px',
  },
  h4: {
    fontWeight: '400',
    fontSize: '18px',
    lineHeight: '24px',
  },
  h5: {
    fontWeight: '400',
    fontSize: '16px',
    lineHeight: '22px',
  },
  h6: {
    fontWeight: '400',
    fontSize: '14px',
    lineHeight: '21px',
  },
}));

export interface RichTextRef {
  anchorNode: HTMLElement | null;
  focusNode: HTMLElement | null;
}

export interface RenderContext {
  doc: Document;
  selectionId: string;
  editorId: string;
  baseDirection?: WritingDirection;
}

type TaskElementProps = React.PropsWithChildren<{
  id: string;
  task: VertexManager<Note>;
  className?: string;
  dir?: WritingDirection;
  focused?: boolean;
}>;

const TaskElement = React.forwardRef<HTMLDivElement, TaskElementProps>(
  function TaskElement(
    { children, className, dir, id, task, focused }: TaskElementProps,
    ref,
  ) {
    const styles = useStyles();
    const partialTask = usePartialVertex(task, ['isChecked']);
    return (
      <div
        className={cn(
          styles.taskElement,
          className,
          focused ? styles.focusedTask : styles.unfocusedTask,
        )}
        ref={ref}
        dir={dir}
        key={id}
        id={id}
        data-ovv-key={id}
      >
        <CheckBox
          className={cn(styles.taskCheckbox)}
          value={partialTask.isChecked}
          onChange={(value) => partialTask.isChecked = value}
        />
        {children}
      </div>
    );
  },
);

interface EditorSpanProps {
  node: TextNode;
  ctx: RenderContext;
  focused?: boolean;
}

function EditorSpan({ node, ctx, focused }: EditorSpanProps) {
  const styles = useStyles();
  const graph = useGraphManager();
  const htmlId = domIdFromNodeKey(ctx, node);
  const path = pathToNode<MarkupElement>(ctx.doc.root, node)!;
  const taskElement = path?.find((element) => isRefNode(element)) as
    | RefNode
    | undefined;
  const partialTask = usePartialVertex<Note>(taskElement?.ref, ['isChecked']);
  const classNames: (string | undefined | boolean | null)[] = [
    node.text.length === 0 && styles.emptySpan,
  ];
  switch (path[path.length - 1]!.tagName) {
    case 'h1':
      classNames.push(styles.h1);
      break;

    case 'h2':
      classNames.push(styles.h2);
      break;

    case 'h3':
      classNames.push(styles.h3);
      break;

    case 'h4':
      classNames.push(styles.h4);
      break;

    case 'h5':
      classNames.push(styles.h5);
      break;

    case 'h6':
      classNames.push(styles.h6);
      break;

    case 'ref':
    case 'p':
    default:
      classNames.push(styles.p);
      break;
  }

  if (partialTask) {
    ArrayUtils.append(classNames, [
      styles.taskText,
      partialTask?.isChecked === true
        ? styles.checkedTaskText
        : styles.uncheckedTaskText,
      focused && styles.focusedTaskText,
    ]);
  }
  return (
    <span
      className={cn(...classNames)}
      key={ctx.doc.nodeKeys.keyFor(node).id}
      id={htmlId}
      data-ovv-key={ctx.doc.nodeKeys.keyFor(node).id}
    >
      {node.text}
    </span>
  );
}

type EditorNodeProps = React.PropsWithChildren<{
  node: MarkupNode;
  ctx: RenderContext;
}>;

export function domIdFromNodeKey(ctx: RenderContext, node: CoreValue): string {
  return `${ctx.editorId}/${ctx.doc.nodeKeys.keyFor(node).id}`;
}

export function EditorNode({ node, ctx }: EditorNodeProps) {
  const styles = useStyles();
  const graph = useGraphManager();
  const htmlId = domIdFromNodeKey(ctx, node);

  if (isTextNode(node)) {
    const selection = ctx.doc.ranges && ctx.doc.ranges[ctx.selectionId];
    const focused = selection &&
      (selection.anchor.node === node || selection.focus.node === node);
    return <EditorSpan node={node} ctx={ctx} focused={focused} />;
  }

  let children: JSX.Element[] | undefined;
  const dir = writingDirectionAtNode(ctx.doc, node, ctx.baseDirection);
  if (isElementNode(node)) {
    children = node.children.map((n) => {
      return (
        <EditorNode
          node={n as MarkupNode}
          ctx={ctx}
          key={ctx.doc.nodeKeys.keyFor(node).id}
        />
      );
    });
  }

  const focusNode = ctx.doc.ranges &&
    ctx.doc.ranges[ctx.selectionId].focus.node;
  const focusPath = focusNode && pathToNode(ctx.doc.root, focusNode);
  const elementInFocusPath = focusPath?.includes(node) === true;

  switch (node.tagName) {
    case 'h1':
      return (
        <h1
          key={ctx.doc.nodeKeys.keyFor(node).id}
          id={htmlId}
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
          id={htmlId}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node).id}
          dir={dir !== ctx.baseDirection ? dir : undefined}
        >
          {children}
        </h2>
      );

    case 'h3':
      return (
        <h3
          key={ctx.doc.nodeKeys.keyFor(node).id}
          id={htmlId}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node).id}
          dir={dir !== ctx.baseDirection ? dir : undefined}
        >
          {children}
        </h3>
      );

    case 'h4':
      return (
        <h4
          key={ctx.doc.nodeKeys.keyFor(node).id}
          id={htmlId}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node).id}
          dir={dir !== ctx.baseDirection ? dir : undefined}
        >
          {children}
        </h4>
      );

    case 'h5':
      return (
        <h5
          key={ctx.doc.nodeKeys.keyFor(node).id}
          id={htmlId}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node).id}
          dir={dir !== ctx.baseDirection ? dir : undefined}
        >
          {children}
        </h5>
      );

    case 'h6':
      return (
        <h6
          key={ctx.doc.nodeKeys.keyFor(node).id}
          id={htmlId}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node).id}
          dir={dir !== ctx.baseDirection ? dir : undefined}
        >
          {children}
        </h6>
      );

    case 'ol':
      return (
        <ol
          key={ctx.doc.nodeKeys.keyFor(node).id}
          id={htmlId}
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
          id={htmlId}
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
          id={htmlId}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node).id}
          dir={dir !== ctx.baseDirection ? dir : undefined}
          style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}
        >
          {children}
        </li>
      );

    case 'ref':
      return (
        <TaskElement
          id={ctx.doc.nodeKeys.keyFor(node).id}
          task={graph.getVertexManager<Note>(node.ref)}
          dir={dir !== ctx.baseDirection ? dir : undefined}
          focused={elementInFocusPath}
        >
          {children}
        </TaskElement>
      );

    case 'p':
    default:
      return (
        <p
          key={ctx.doc.nodeKeys.keyFor(node).id}
          id={htmlId}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node).id}
          dir={dir !== ctx.baseDirection ? dir : undefined}
        >
          {children}
        </p>
      );
  }
}

export interface RichTextRendererProps {
  ctx: RenderContext;
}

export function RichTextRenderer({ ctx }: RichTextRendererProps) {
  // const styles = useStyles();
  // const selection = ctx.doc.ranges && ctx.doc.ranges[ctx.selectionId];

  return ctx.doc.root.children.map((node) => {
    return (
      <EditorNode
        node={node as MarkupNode}
        ctx={ctx}
        key={ctx.doc.nodeKeys.keyFor(node).id}
      />
    );
  });
}
