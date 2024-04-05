import React, { useCallback, useEffect, useState } from 'react';
import * as ArrayUtils from '../base/array.ts';
import { docClone, Document } from '../cfds/richtext/doc-state.ts';
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
  Pointer,
  comparePointers,
} from '../cfds/richtext/tree.ts';
import {
  isRefNode,
  MarkupElement,
  MarkupNode,
  RefNode,
} from '../cfds/richtext/model.ts';
import { cn, makeStyles, keyframes } from '../styles/css-objects/index.ts';
import { resolveWritingDirection, WritingDirection } from '../base/string.ts';
import { brandLightTheme as theme } from '../styles/theme.tsx';
import { styleguide } from '../styles/styleguide.ts';
import { CoreObject, CoreValue } from '../base/core-types/base.ts';
import { writingDirectionAtNode } from '../cfds/richtext/doc-state.ts';
import { CheckBox } from '../components/checkbox.tsx';
import { usePartialVertex } from '../web-app/src/core/cfds/react/vertex.ts';
import { VertexManager } from '../cfds/client/graph/vertex-manager.ts';
import { Note } from '../cfds/client/graph/vertices/note.ts';
import { useGraphManager } from '../web-app/src/core/cfds/react/graph.tsx';
import { uniqueId } from '../base/common.ts';
import { coreValueCompare } from '../base/core-types/comparable.ts';
import { AssigneeChip } from '../components/assignee-chip.tsx';
import Menu from '../styles/components/menu.tsx';
import { MemberPicker } from '../components/member-picker.tsx';
import { TagChip } from '../components/tag-chip.tsx';
import { stripDuplicatePointers } from '../cfds/richtext/flat-rep.ts';
import { docToRT } from '../cfds/richtext/doc-state.ts';
import { ParagraphRenderer, TextStyle } from './paragraph-renderer.tsx';

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
    minHeight: styleguide.gridbase * 2,
    minWidth: '1px',
  },
  firstTaskElement: {
    borderTop: '1px solid',
  },
  lastTaskElement: {
    marginBottom: styleguide.gridbase * 2,
  },
  taskElement: {
    boxSizing: 'border-box',
    borderBottom: '1px solid',
    borderColor: theme.primary.p2,
    display: 'flex',
    alignItems: 'stretch',
    transition: `background-color ${styleguide.transition.duration.short}ms ease-out`,
  },
  taskTextElement: {
    display: 'flex',
    flexDirection: 'column',
    width: `calc(100% - 34px - ${styleguide.gridbase * 3}px)`,
    paddingTop: styleguide.gridbase,
    paddingBottom: styleguide.gridbase,
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
  taskCheckboxContainer: {
    display: 'flex',
    alignItems: 'flex-start',
  },
  taskCheckbox: {
    marginTop: styleguide.gridbase * 2,
    marginBottom: styleguide.gridbase * 2,
    marginInlineEnd: styleguide.gridbase * 2,
  },
  taskColumnsContainer: {
    display: 'flex',
    height: '100%',
  },
  taskActionsColumn: {
    width: styleguide.gridbase * 51,
    marginInlineStart: styleguide.gridbase * 2,
    display: 'flex',
    gap: styleguide.gridbase * 3,
  },
  taskAssigneesColumn: {
    display: 'flex',
    gap: styleguide.gridbase / 2,
  },
  taskTagsColumn: {
    display: 'flex',
    gap: styleguide.gridbase / 2,
  },
  taskTextColumn: {
    width: `calc(100% - ${styleguide.gridbase * 51}px)`,
    height: '100%',
    display: 'flex',
    alignItems: 'center',
  },
  taskText: {
    overflowWrap: 'break-word',
    color: theme.mono.m10,
    transition: `text-decoration-color ${styleguide.transition.duration.short}ms ease-in`,
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
  assigneeChip: {
    position: 'relative',
    top: 2,
  },
  p: {
    fontFamily: 'Poppins, Heebo',
    fontSize: '13px',
    lineHeight: '18px',
  },
  h1: {
    fontFamily: 'PoppinsBold, HeeboBold',
    fontSize: '18px',
    lineHeight: '24px',
  },
  h2: {
    fontFamily: 'Poppins, Heebo',
    fontSize: '16px',
    lineHeight: '22px',
  },
  h3: {
    fontFamily: 'PoppinsSemiBold, HeeboSemiBold',
    fontSize: '18px',
    lineHeight: '24px',
  },
  h4: {
    fontFamily: 'Poppins, Heebo',
    fontSize: '18px',
    lineHeight: '24px',
  },
  h5: {
    fontFamily: 'Poppins, Heebo',
    fontSize: '16px',
    lineHeight: '22px',
  },
  h6: {
    fontFamily: 'Poppins, Heebo',
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
    alignItems: 'center',
    alignContent: 'center',
  },
  paragraphElement: {
    overflow: 'visible',
    display: 'flex',
    alignItems: 'flex-start',
    width: '100%',
  },
  paragraphRenderer: {
    position: 'relative',
    top: 2,
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
  cursor: {
    backgroundColor: theme.mono.m4,
    width: 2,
    height: styleguide.gridbase * 2,
    position: 'relative',
    borderRadius: 1,
    top: 1,
    boxSizing: 'border-box',
    border: `1px solid ${theme.mono.m4}`,
    zIndex: 100,
  },
  editorSpan: {
    '::selection': {
      background: 'transparent',
    },
  },
}));

export interface RenderContext {
  doc: Document;
  selectionId: string;
  editorId: string;
  sortedPointers?: Pointer[];
  baseDirection?: WritingDirection;
  onNewTask?: () => void;
}

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
    { children, className, dir, id, task, ctx, focused, onChange },
    ref,
  ) {
    const styles = useStyles();
    const partialTask = usePartialVertex(task, [
      'isChecked',
      'assignees',
      'workspace',
      'tags',
    ]);
    const partialWorkspace = usePartialVertex(partialTask.workspace.manager, [
      'users',
    ]);

    return (
      <div
        className={cn(
          styles.taskElement,
          className,
          focused ? styles.focusedTask : styles.unfocusedTask,
        )}
        ref={ref}
        dir={dir}
        key={`TaskElementDiv:${id}`}
        id={id}
        data-ovv-key={id}
      >
        <div className={cn(styles.taskCheckboxContainer)}>
          <CheckBox
            className={cn(styles.taskCheckbox)}
            value={partialTask.isChecked}
            onChange={(value) => (partialTask.isChecked = value)}
          />
        </div>
        <div className={cn(styles.taskTextElement)}>
          <div className={cn(styles.taskColumnsContainer)}>
            <div className={cn(styles.taskTextColumn)}>{children}</div>
            <div className={cn(styles.taskActionsColumn)}>
              {partialTask.assignees.size > 0 && (
                <div className={cn(styles.taskAssigneesColumn)}>
                  {Array.from(partialTask.assignees)
                    .sort(coreValueCompare)
                    .map((u) => (
                      <Menu
                        key={`TaskAssignee:${id}:${u.key}`}
                        renderButton={() => (
                          <AssigneeChip
                            className={cn(styles.assigneeChip)}
                            user={u.manager}
                          />
                        )}
                        position="bottom"
                        align="center"
                        direction="out"
                      >
                        <MemberPicker
                          users={Array.from(partialWorkspace.users)
                            .filter(
                              (wsUser) => !partialTask.assignees.has(wsUser),
                            )
                            .map((u) => u.manager)}
                          onRowSelect={(updatedAssignee) => {
                            const assignees = partialTask.assignees;
                            assignees.delete(u);
                            assignees.add(updatedAssignee);
                          }}
                          showSearch={false}
                          onRemove={() => partialTask.assignees.delete(u)}
                        />
                      </Menu>
                    ))}
                </div>
              )}
              <div className={cn(styles.taskTagsColumn)}>
                {Array.from(partialTask.tags.values())
                  .sort(coreValueCompare)
                  .map((tag) => (
                    <Menu
                      key={`TaskTag:${id}:${tag.key}`}
                      renderButton={() => (
                        <TagChip
                          className={cn(styles.assigneeChip)}
                          tag={tag.manager}
                        />
                      )}
                      position="bottom"
                      align="center"
                      direction="out"
                    >
                      <div></div>
                    </Menu>
                  ))}
              </div>
            </div>
          </div>
          <div
            className={cn(styles.focusedTaskUnderline)}
            style={{ opacity: focused ? 1 : 0 }}
          ></div>
        </div>
      </div>
    );
  },
);

interface EditorSpanProps {
  node: TextNode;
  ctx: RenderContext;
  focused?: boolean;
  dir: WritingDirection;
}

function EditorSpan({ node, ctx, focused, dir }: EditorSpanProps) {
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
      className={cn(...classNames, styles.editorSpan)}
      key={htmlId}
      id={htmlId}
      data-ovv-node-key={ctx.doc.nodeKeys.keyFor(node)}
    >
      {node.text}
    </span>
  );
}

interface ParagraphElementNode extends Partial<TextStyle> {
  element: MarkupElement;
  id: string;
  htmlId: string;
  dir?: WritingDirection;
  onNewTask?: () => void;
  showNewTaskHint?: boolean;
  ctx: RenderContext;
  onChange: (doc: Document) => void;
}

function ParagraphElementNode({
  element,
  id,
  htmlId,
  dir,
  onNewTask,
  showNewTaskHint,
  ctx,
  onChange,
  ...rest
}: // children,
ParagraphElementNode) {
  const styles = useStyles();
  const [hover, setHover] = useState(false);

  return (
    <div
      key={`${id}-container`}
      data-ovv-key={id}
      className={cn(
        styles.paragraphElement,
        showNewTaskHint && styles.paragraphElementContainer,
      )}
    >
      <ParagraphRenderer
        element={element}
        className={cn(styles.paragraphRenderer)}
        key={id}
        id={htmlId}
        data-ovv-key={id}
        dir={dir}
        data-ovv-node-key={ctx.doc.nodeKeys.keyFor(element)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        {...rest}
        // width="100%"
        // height="100%"
      >
        {/* {showNewTaskHint && (
        <div
          className={cn(styles.newTaskHint)}
          onClick={onNewTask}
          style={{
            opacity: hover ? 1 : 0,
            left: dir === 'rtl' ? '0px' : `${styleguide.gridbase * 6}px`,
            right: dir === 'rtl' ? `${styleguide.gridbase * 6}px` : '0px',
          }}
        >
          <img src="/icons/design-system/checkbox/selected.svg" />
        </div>
      )} */}
        {/* {children} */}
      </ParagraphRenderer>
    </div>
  );
}

type EditorNodeProps = React.PropsWithChildren<{
  node: MarkupNode;
  ctx: RenderContext;
  onChange: (doc: Document) => void;
}>;

export function domIdFromNodeKey(ctx: RenderContext, node: CoreValue): string {
  return `${ctx.editorId}/${ctx.doc.nodeKeys.keyFor(node)}`;
}

export function EditorNode({ node, ctx, onChange }: EditorNodeProps) {
  const styles = useStyles();
  const graph = useGraphManager();
  const htmlId = domIdFromNodeKey(ctx, node);
  const dir =
    writingDirectionAtNode(ctx.doc, node, ctx.baseDirection) ||
    ctx.baseDirection ||
    'auto';

  if (isTextNode(node)) {
    const selection = ctx.doc.ranges && ctx.doc.ranges[ctx.selectionId];
    const focused =
      selection &&
      (selection.anchor?.node === node || selection.focus?.node === node);
    return <EditorSpan node={node} ctx={ctx} focused={focused} dir={dir} />;
  }

  let children: JSX.Element[] | undefined;
  if (isElementNode(node)) {
    children = node.children.map((n) => (
      <EditorNode
        node={n as MarkupNode}
        ctx={ctx}
        key={`EditorNode:${ctx.doc.nodeKeys.keyFor(n)}`}
        onChange={onChange}
      />
    ));
  }

  const focusNode =
    ctx.doc.ranges &&
    ctx.doc.ranges[ctx.selectionId] &&
    ctx.doc.ranges[ctx.selectionId].focus.node;
  const focusPath = focusNode && pathToNode(ctx.doc.root, focusNode);
  const elementInFocusPath = focusPath?.includes(node) === true;
  const indexInRoot = ctx.doc.root.children.indexOf(node);
  const isChildOfRoot = indexInRoot >= 0;
  const nodePath = pathToNode(ctx.doc.root, node);
  const taskKey = nodePath?.find(isRefNode)?.ref;
  const taskNoteMgr =
    (taskKey &&
      graph.hasVertex(taskKey) &&
      graph.getVertexManager<Note>(taskKey)) ||
    undefined;

  switch (node.tagName) {
    case 'h1':
      return (
        <h1
          key={ctx.doc.nodeKeys.keyFor(node)}
          id={htmlId}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node)}
          dir={dir}
          className={cn(styles.h1Element)}
        >
          {children}
        </h1>
      );

    case 'h2':
      return (
        <h2
          key={ctx.doc.nodeKeys.keyFor(node)}
          id={htmlId}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node)}
          dir={dir}
          className={cn(styles.h2Element)}
        >
          {children}
        </h2>
      );

    case 'h3':
      return (
        <h3
          key={ctx.doc.nodeKeys.keyFor(node)}
          id={htmlId}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node)}
          dir={dir}
          className={cn(styles.h2Element)}
        >
          {children}
        </h3>
      );

    case 'h4':
      return (
        <h4
          key={ctx.doc.nodeKeys.keyFor(node)}
          id={htmlId}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node)}
          dir={dir}
          className={cn(styles.h2Element)}
        >
          {children}
        </h4>
      );

    case 'h5':
      return (
        <h5
          key={ctx.doc.nodeKeys.keyFor(node)}
          id={htmlId}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node)}
          dir={dir}
          className={cn(styles.h2Element)}
        >
          {children}
        </h5>
      );

    case 'h6':
      return (
        <h6
          key={ctx.doc.nodeKeys.keyFor(node)}
          id={htmlId}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node)}
          dir={dir}
          className={cn(styles.h2Element)}
        >
          {children}
        </h6>
      );

    case 'ol':
      return (
        <ol
          key={ctx.doc.nodeKeys.keyFor(node)}
          id={htmlId}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node)}
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
          key={ctx.doc.nodeKeys.keyFor(node)}
          id={htmlId}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node)}
          dir={dir}
          className={cn(styles.listElement)}
        >
          {children}
        </ul>
      );

    case 'li':
      return (
        <li
          key={ctx.doc.nodeKeys.keyFor(node)}
          id={htmlId}
          data-ovv-key={ctx.doc.nodeKeys.keyFor(node)}
          dir={dir}
          style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}
        >
          {children}
        </li>
      );

    case 'ref': {
      let isLastTask = false;
      let isFirstTask = false;
      if (isChildOfRoot) {
        const rootChildren = ctx.doc.root.children;
        const nextElement = rootChildren[indexInRoot + 1];
        if (!isRefNode(nextElement)) {
          isLastTask = true;
        }
        const prevElement = rootChildren[indexInRoot - 1];
        if (!isRefNode(prevElement)) {
          isFirstTask = true;
        }
      }
      return (
        <TaskElement
          key={ctx.doc.nodeKeys.keyFor(node)}
          id={ctx.doc.nodeKeys.keyFor(node)}
          task={graph.getVertexManager<Note>(node.ref)}
          dir={dir}
          focused={elementInFocusPath}
          onChange={onChange}
          ctx={ctx}
          className={cn(
            isLastTask && styles.lastTaskElement,
            isFirstTask && styles.firstTaskElement,
          )}
        >
          {children}
        </TaskElement>
      );
    }

    case 'p':
    default: {
      return (
        <ParagraphElementNode
          element={node}
          id={ctx.doc.nodeKeys.keyFor(node)}
          htmlId={htmlId}
          dir={dir}
          onNewTask={() => {
            const newDoc = docClone(ctx.doc);
            const newNode = newDoc.nodeKeys.nodeFromKey(
              ctx.doc.nodeKeys.keyFor(node),
            )! as MarkupElement;
            (newNode as CoreObject).tagName = 'ref';
            (newNode as CoreObject).ref = uniqueId();
            (newNode as CoreObject).type = 'inter-doc';
            onChange(newDoc);
          }}
          showNewTaskHint={isChildOfRoot}
          onChange={onChange}
          ctx={ctx}
          strikethrough={taskNoteMgr?.getVertexProxy()?.isChecked}
        >
          {/* {children} */}
        </ParagraphElementNode>
      );
    }
  }
}

export interface RichTextRendererProps {
  ctx: RenderContext;
  onChange: (doc: Document) => void;
}

export function RichTextRenderer({ ctx, onChange }: RichTextRendererProps) {
  const rt = docToRT(ctx.doc);
  const pointers = rt.pointers;
  ctx.sortedPointers =
    pointers !== undefined
      ? Array.from<Pointer>(stripDuplicatePointers(pointers)).sort(
          comparePointers,
        )
      : undefined;

  return ctx.doc.root.children.map((node) => {
    return (
      <EditorNode
        node={node as MarkupNode}
        ctx={ctx}
        key={`EditorNode:${ctx.doc.nodeKeys.keyFor(node)}`}
        onChange={onChange}
      />
    );
  });
}
