import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import * as ArrayUtils from '../../base/array.ts';
import { docClone, Document } from './doc-state.ts';
import {
  ElementNode,
  findLastTextNode,
  findNode,
  isElementNode,
  isTextNode,
  pathToNode,
  PointerDirection,
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
import { CoreObject, CoreValue } from '../../base/core-types/base.ts';
import { writingDirectionAtNode } from './doc-state.ts';
import { CheckBox } from '../../components/task.tsx';
import { usePartialVertex } from '../../web-app/src/core/cfds/react/vertex.ts';
import { VertexManager } from '../client/graph/vertex-manager.ts';
import { Note } from '../client/graph/vertices/note.ts';
import { useGraphManager } from '../../web-app/src/core/cfds/react/graph.tsx';
import { uniqueId } from '../../base/common.ts';

const useStyles = makeStyles(() => ({
  contentEditable: {
    width: '100%',
    height: '100%',
    whiteSpace: 'pre-wrap',
  },
  zeroMargins: {
    margin: 0,
  },
  emptySpan: {
    display: 'inline-block',
    minHeight: styleguide.gridbase * 3,
    minWidth: '1px',
  },
  taskElement: {
    boxSizing: 'border-box',
    borderBottom: '1px solid',
    borderTop: '1px solid',
    borderColor: theme.primary.p2,
    display: 'flex',
    alignItems: 'center',
    transition:
      `background-color ${styleguide.transition.duration.short}ms ease-out`,
  },
  taskTextElement: {
    display: 'flex',
    flexDirection: 'column',
    width: `calc(100% - 34px - ${styleguide.gridbase * 3}px)`,
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
    // position: 'relative',
    // top: '-3px',
  },
  uncheckedTaskText: {
    textDecorationColor: 'transparent',
  },
  checkedTaskText: {
    textDecoration: 'line-through',
    textDecorationColor: theme.mono.m10,
  },
  focusedTaskText: {
    // borderBottom: 'solid',
    // borderBottomSize: '1px',
    // borderBottomColor: theme.primary.p8,
  },
  focusedTaskUnderline: {
    backgroundColor: theme.primary.p8,
    width: '100%',
    height: '1px',
    position: 'relative',
    // bottom: styleguide.gridbase / 2,
    transition: `opacity ${styleguide.transition.duration.short}ms ease-out`,
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
  newTaskHint: {
    backgroundColor: theme.mono.m0,
    borderRadius: 2,
    boxShadow: '0px 0px 4px 0px rgba(151, 132, 97, 0.25)',
    position: 'absolute',
    translate: '0px -3px',
    transition: `opacity ${styleguide.transition.duration.short}ms ease-out`,
    width: styleguide.gridbase * 3,
    height: styleguide.gridbase * 3,
    display: 'flex',
    alignItmes: 'center',
    alignContent: 'center',
  },
  paragraphElement: {
    overflow: 'visible',
    display: 'flex',
    alignItems: 'flex-start',
  },
  h1Element: {
    marginTop: 0,
    marginBottom: styleguide.gridbase * 2,
  },
  h2Element: {
    marginTop: 0,
    marginBottom: styleguide.gridbase * 2,
  },
  listElement: {
    marginTop: 0,
    marginBottom: styleguide.gridbase * 2,
  },
  paragraphElementContainer: {
    marginTop: 0,
    marginBottom: styleguide.gridbase * 2,
  },
}));

export interface RenderContext {
  doc: Document;
  selectionId: string;
  editorId: string;
  baseDirection?: WritingDirection;
  onNewTask?: () => void;
}

function focusOnLastTextNode(
  element: ElementNode,
  doc: Document,
  selectionId: string,
): void {
  const textNode = findLastTextNode(element);
  if (textNode) {
    if (!doc.ranges) {
      doc.ranges = {};
    }
    const curSelection = doc.ranges[selectionId];
    if (
      !curSelection ||
      (curSelection.anchor.node !== textNode &&
        curSelection.focus.node !== textNode)
    ) {
      doc.ranges[selectionId] = {
        anchor: {
          node: textNode,
          offset: textNode.text.length,
        },
        focus: {
          node: textNode,
          offset: textNode.text.length,
        },
        dir: PointerDirection.None,
      };
    }
  }
}

// interface TaskElementButtonsProps {
//   task: VertexManager<Note>;
// }
//
// function TaskElementButtons({ task }: TaskElementButtonsProps) {
//   const styles = useStyles();
//   return <div></div>;
// }

type TaskElementProps = React.PropsWithChildren<{
  id: string;
  task: VertexManager<Note>;
  ctx: RenderContext;
  className?: string;
  dir?: WritingDirection;
  focused?: boolean;
  onChange: (doc: Document) => void;
}>;

const TaskElement = React.forwardRef<HTMLDivElement, TaskElementProps>(
  function TaskElement(
    { children, className, dir, id, task, ctx, focused, onChange }:
      TaskElementProps,
    ref,
  ) {
    const styles = useStyles();
    const partialTask = usePartialVertex(task, ['isChecked']);
    const onClick = useCallback(() => {
      const doc = docClone(ctx.doc);
      const refNode = findNode(
        doc.root,
        (n) => isRefNode(n) && n.ref === task.key,
      );
      if (refNode) {
        focusOnLastTextNode(refNode[0] as ElementNode, doc, ctx.selectionId);
        onChange(doc);
      }
    }, [ctx, task]);
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
        onClick={onClick}
      >
        <CheckBox
          className={cn(styles.taskCheckbox)}
          value={partialTask.isChecked}
          onChange={(value) => partialTask.isChecked = value}
        />
        <div className={cn(styles.taskTextElement)}>
          {children}
          <div
            className={cn(styles.focusedTaskUnderline)}
            style={{ opacity: focused ? 1 : 0 }}
          >
          </div>
        </div>
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

type ParagraphElementNode = React.PropsWithChildren<{
  id: string;
  htmlId: string;
  dir?: WritingDirection;
  onNewTask?: () => void;
  showNewTaskHint?: boolean;
  ctx: RenderContext;
  onChange: (doc: Document) => void;
}>;

function ParagraphElementNode(
  { id, htmlId, dir, onNewTask, showNewTaskHint, ctx, onChange, children }:
    ParagraphElementNode,
) {
  const styles = useStyles();
  const [hover, setHover] = useState(false);
  const onClick = useCallback(() => {
    const doc = docClone(ctx.doc);
    const node = doc.nodeKeys.nodeFromKey(id);
    if (isElementNode(node)) {
      focusOnLastTextNode(node, doc, ctx.selectionId);
      onChange(doc);
    }
  }, [ctx, onChange]);
  return (
    <div
      key={id}
      id={htmlId}
      data-ovv-key={id}
      dir={dir}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      className={cn(
        styles.paragraphElement,
        showNewTaskHint && styles.paragraphElementContainer,
      )}
    >
      {showNewTaskHint && (
        <div
          className={cn(styles.newTaskHint)}
          onClick={onNewTask}
          style={{
            opacity: hover ? 1 : 0,
            left: dir === 'rtl' ? '0px' : `${styleguide.gridbase * 6}px`,
            right: dir === 'rtl' ? `${styleguide.gridbase * 6}px` : '0px',
          }}
        >
          <img src='/icons/design-system/checkbox/selected.svg' />
        </div>
      )}
      {children}
    </div>
  );
}

type EditorNodeProps = React.PropsWithChildren<{
  node: MarkupNode;
  ctx: RenderContext;
  onChange: (doc: Document) => void;
}>;

export function domIdFromNodeKey(ctx: RenderContext, node: CoreValue): string {
  return `${ctx.editorId}/${ctx.doc.nodeKeys.keyFor(node).id}`;
}

export function EditorNode({ node, ctx, onChange }: EditorNodeProps) {
  const styles = useStyles();
  const graph = useGraphManager();
  const htmlId = domIdFromNodeKey(ctx, node);

  if (isTextNode(node)) {
    const selection = ctx.doc.ranges && ctx.doc.ranges[ctx.selectionId];
    const focused = selection &&
      (selection.anchor?.node === node || selection.focus?.node === node);
    return <EditorSpan node={node} ctx={ctx} focused={focused} />;
  }

  let children: JSX.Element[] | undefined;
  let dir = writingDirectionAtNode(ctx.doc, node, ctx.baseDirection);
  if (isElementNode(node)) {
    children = node.children.map((n) => {
      return (
        <EditorNode
          node={n as MarkupNode}
          ctx={ctx}
          key={ctx.doc.nodeKeys.keyFor(node).id}
          onChange={onChange}
        />
      );
    });
  }

  const focusNode = ctx.doc.ranges && ctx.doc.ranges[ctx.selectionId] &&
    ctx.doc.ranges[ctx.selectionId].focus.node;
  const focusPath = focusNode && pathToNode(ctx.doc.root, focusNode);
  const elementInFocusPath = focusPath?.includes(node) === true;
  const isChildOfRoot = ctx.doc.root.children.includes(node);

  if (!dir) {
    dir = ctx.baseDirection || 'auto';
  }

  switch (node.tagName) {
    case 'h1':
      return (
        <h1
          key={ctx.doc.nodeKeys.keyFor(node).id}
          id={htmlId}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node).id}
          dir={dir}
          className={cn(styles.h1Element)}
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
          dir={dir}
          className={cn(styles.h2Element)}
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
          dir={dir}
          className={cn(styles.h2Element)}
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
          dir={dir}
          className={cn(styles.h2Element)}
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
          dir={dir}
          className={cn(styles.h2Element)}
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
          dir={dir}
          className={cn(styles.h2Element)}
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
          dir={dir}
          className={cn(styles.listElement)}
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
          dir={dir}
          className={cn(styles.listElement)}
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
          dir={dir}
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
          dir={dir}
          focused={elementInFocusPath}
          onChange={onChange}
          ctx={ctx}
        >
          {children}
        </TaskElement>
      );

    case 'p':
    default:
      return (
        <ParagraphElementNode
          id={ctx.doc.nodeKeys.keyFor(node).id}
          htmlId={htmlId}
          dir={dir}
          onNewTask={() => {
            const newDoc = docClone(ctx.doc);
            const newNode = newDoc.nodeKeys.nodeFromKey(
              ctx.doc.nodeKeys.keyFor(node).id,
            )! as MarkupElement;
            (newNode as CoreObject).tagName = 'ref';
            (newNode as CoreObject).ref = uniqueId();
            (newNode as CoreObject).type = 'inter-doc';
            onChange(newDoc);
          }}
          showNewTaskHint={isChildOfRoot}
          onChange={onChange}
          ctx={ctx}
        >
          {children}
        </ParagraphElementNode>
      );
  }
}

export interface RichTextRendererProps {
  ctx: RenderContext;
  onChange: (doc: Document) => void;
}

export function RichTextRenderer({ ctx, onChange }: RichTextRendererProps) {
  return ctx.doc.root.children.map((node) => {
    return (
      <EditorNode
        node={node as MarkupNode}
        ctx={ctx}
        key={ctx.doc.nodeKeys.keyFor(node).id}
        onChange={onChange}
      />
    );
  });
}
