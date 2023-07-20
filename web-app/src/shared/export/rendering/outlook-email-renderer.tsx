import { isRTL } from 'core/richtext/rtl';
import { Dns } from '@ovvio/base/lib/utils';
import {
  Note,
  Tag,
  User,
  Workspace,
} from '@ovvio/cfds/lib/client/graph/vertices';
import {
  dfs,
  ElementNode,
  isElementNode,
  isTextNode,
  TreeNode,
  TextNode,
} from '@ovvio/cfds/lib/richtext/tree';
import {
  NodeRenderer,
  renderRichText,
  richTextToHtmlString,
} from '../html-utils';
import {
  isRefMarker,
  RefMarker,
  RefType,
  SpanNode,
} from '@ovvio/cfds/lib/richtext/model';
const COLORS = ['#1995d1', '#00c7d6', '#da9f43', '#dd2e9a', '#fe4a62'];

export function renderSubject(card: Note): string {
  return getTitleText(card);
}

interface RenderOptions {
  isBodyRTL: boolean;
  workspace: Workspace;
}

class ParagraphHeaderRenderer implements NodeRenderer<RenderOptions> {
  needRender(
    node: TreeNode,
    parentNode?: ElementNode,
    options?: RenderOptions
  ): boolean {
    return (
      node.tagName === 'p' || node.tagName === 'h1' || node.nTagName === 'h2'
    );
  }
  render(
    node: TreeNode,
    parentNode?: ElementNode,
    options?: RenderOptions
  ): TreeNode {
    if (isEmptyLine(node)) {
      return { tagName: 'br' };
    }

    const newNode: TreeNode = {
      tagName: node.tagName === 'p' ? 'div' : node.tagName,
    };
    if (!options.isBodyRTL && isNodeRTL(node)) {
      newNode.dir = 'rtl';
    } else if (options.isBodyRTL && isNodeLTR(node)) {
      newNode.dir = 'ltr';
      newNode.style = 'text-align: right;';
    }

    return newNode;
  }
}

class ListRenderer implements NodeRenderer<RenderOptions> {
  needRender(
    node: TreeNode,
    parentNode?: ElementNode,
    options?: RenderOptions
  ): boolean {
    return (
      node.tagName === 'ul' || node.tagName === 'ol' || node.tagName === 'li'
    );
  }
  render(
    node: TreeNode,
    parentNode?: ElementNode,
    options?: RenderOptions
  ): TreeNode {
    return {
      tagName: node.tagName,
    };
  }
}

class TextRenderer implements NodeRenderer<RenderOptions> {
  needRender(
    node: TreeNode,
    parentNode?: ElementNode,
    options?: RenderOptions
  ): boolean {
    return parentNode && isTextNode(node);
  }
  render(
    node: TreeNode,
    parentNode?: ElementNode,
    options?: RenderOptions
  ): TreeNode {
    return addTextWithMarkers(node as TextNode);
  }
}

class TaskRenderer implements NodeRenderer<RenderOptions> {
  needRender(
    node: TreeNode,
    parentNode?: ElementNode,
    options?: RenderOptions
  ): boolean {
    return isRefMarker(node) && node.type === RefType.InternalDoc;
  }
  render(
    node: TreeNode,
    parentNode?: ElementNode,
    options?: RenderOptions
  ): TreeNode {
    const { task, tags, assignees, isDone } = getTaskInfo(
      node as RefMarker,
      options.workspace
    );
    const taskTitle = getTitleText(task);

    const taskNode: ElementNode = {
      tagName: 'table',
      children: [],
      cellpadding: '0',
      cellspacing: '0',
      border: '0',
      style: 'margin-top: 7px',
    };

    const tableRTL = options.isBodyRTL || isRTL(taskTitle);
    if (tableRTL) {
      taskNode.dir = 'rtl';
    }
    const taskRow: ElementNode = {
      tagName: 'tr',
      children: [],
    };
    taskNode.children.push(taskRow);

    const taskData: ElementNode = {
      tagName: 'td',
      children: [
        {
          text: '&nbsp;&nbsp;',
        },
      ],
      style: 'vertical-align:middle;',
    };

    if (isDone) {
      const strikeRow: ElementNode = {
        tagName: 's',
        children: [taskData],
      };
      taskRow.children.push(strikeRow);

      taskData.children.push(createImageElm('task-full'));
      taskData.children.push({
        tagName: 'span',
        style: 'color: #cfced5',
        text: `&nbsp;&nbsp;${taskTitle}`,
      });
    } else {
      taskRow.children.push(taskData);

      taskData.children.push(createImageElm('task-empty'));
      taskData.children.push({
        text: `&nbsp;&nbsp;${taskTitle}`,
      });
    }

    //Assignee:
    for (const ass of assignees) {
      taskData.children.push({
        tagName: 'span',
        style: `color:${ass.color}`,
        text: tableRTL ? `&nbsp;${ass.user.name}@` : `&nbsp;@${ass.user.name}`,
      });
    }

    //Tags:
    for (const t of tags) {
      taskData.children.push({
        tagName: 'span',
        style: `color:${t.parent.color};backgroundColor:${makeTransparent(
          t.parent.color
        )}`,
        text: tableRTL
          ? `&nbsp;${t.parent.name}${t.child ? '/' + t.child.name : ''}#`
          : `&nbsp;#${t.parent.name}${t.child ? '/' + t.child.name : ''}`,
      });
    }
    //Due Date:
    const dueDate = task.dueDate;
    if (dueDate) {
      taskData.children.push(createImageElm('due-date'));
      taskData.children.push({
        tagName: 'span',
        style: `<td style="vertical-align:middle; color: ${
          isDone ? '#cfced5' : '#000000'
        }`,
        text: dueDate.toLocaleDateString(),
      });
    }

    taskNode.children.push({ tagName: 'br' });
    taskNode.children.push({ tagName: 'br' });

    return taskNode;
  }
}

class AssigneeRenderer implements NodeRenderer<RenderOptions> {
  needRender(
    node: TreeNode,
    parentNode?: ElementNode,
    options?: RenderOptions
  ): boolean {
    return isRefMarker(node) && node.type === RefType.Link;
  }
  render(
    node: TreeNode,
    parentNode?: ElementNode,
    options?: RenderOptions
  ): TreeNode {
    const assignee = getAssignee((node as RefMarker).ref, options.workspace);
    const newNode: SpanNode = {
      tagName: 'span',
      dir: 'ltr',
      style: `color:${assignee.color}`,
      text: `@${assignee.user.name}`,
    };
    return newNode;
  }
}

export function renderBody(card: Note, workspace: Workspace): string {
  const isBodyRTL = isNoteRTL(card);

  const renderers: NodeRenderer<RenderOptions>[] = [
    new ParagraphHeaderRenderer(),
    new ListRenderer(),
    new TextRenderer(),
    new TaskRenderer(),
    new AssigneeRenderer(),
  ];

  const rawBody = card.getRawBody();

  const rendered = (
    rawBody
      ? renderRichText(rawBody.root, renderers, {
          isBodyRTL,
          workspace,
        })
      : { children: [] }
  ) as ElementNode;
  rendered.tagName = 'body';
  if (isBodyRTL) {
    rendered.dir = 'rtl';
  }

  //Add footer:
  rendered.children.push({
    tagName: 'p',
    children: [
      { tagName: 'br' },
      { text: 'Powered by ' },
      { text: `<a href="${Dns.getHost()}">Ovvio</a>` },
    ],
  });

  const body = richTextToHtmlString(rendered);

  return body;
}

function addTextWithMarkers(node: TextNode): TreeNode {
  const markers: string[] = [];
  if (node.bold === true) {
    markers.push('b');
  }
  if (node.underline === true) {
    markers.push('u');
  }
  if (node.strike === true) {
    markers.push('s');
  }
  if (node.italic === true) {
    markers.push('i');
  }

  let firstElem: ElementNode | undefined;
  let lastElem: ElementNode | undefined;

  if (markers.length > 0) {
    firstElem = { children: [] };
    lastElem = firstElem;
    for (const mark of markers) {
      lastElem.tagName = mark;
      lastElem.children.push({ children: [] });
      lastElem = lastElem.children[0] as ElementNode;
    }
  }

  let newTextArr = [];

  node.text.split(' ').forEach(word => {
    if (isValidHttpUrl(word)) {
      newTextArr.push(`<a href="${word}">${word}</a>`);
    } else {
      newTextArr.push(word);
    }
  });

  const text = newTextArr.join('&nbsp;');

  if (firstElem && lastElem) {
    lastElem.text = text;
    return firstElem;
  }

  return { text };
}

function isValidHttpUrl(string) {
  let url;

  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }

  return url.protocol === 'http:' || url.protocol === 'https:';
}

interface TaskInfo {
  task: Note;
  tags: {
    parent: Tag;
    child?: Tag;
    text: string;
  }[];
  assignees: AssigneeInfo[];
  isDone: boolean;
}

function getTaskInfo(node: RefMarker, workspace: Workspace): TaskInfo {
  const task = workspace.graph.getVertex<Note>(node.ref);

  const tags = [];
  let isDone = false;

  for (const [pTag, cTag] of task.tags) {
    let child: Tag | undefined;
    if (pTag !== cTag) {
      child = cTag;
      if (pTag.name === 'Status' && cTag.name === 'Done') {
        isDone = true;
      }
    }

    tags.push({
      parent: pTag,
      child: child,
      text: `${pTag.name}${child ? '/' + child.name : ''}`,
    });
  }

  const assignees: AssigneeInfo[] = [];

  //Assignees
  for (const user of task.assignees) {
    const assignee = getAssignee(user.key, workspace);
    if (assignee) {
      assignees.push(assignee);
    }
  }

  return { task, tags, assignees, isDone };
}

interface AssigneeInfo {
  user: User;
  color: string;
}
function getAssignee(userId: string, workspace: Workspace): AssigneeInfo {
  const wsUsers = Array.from(workspace.users);
  for (let i = 0; i < wsUsers.length; i++) {
    if (wsUsers[i].key === userId) {
      const color = COLORS[i % COLORS.length];
      return {
        user: wsUsers[i],
        color,
      };
    }
  }
}

function getTitleText(card: Note): string {
  for (const [node] of dfs(card.title.root)) {
    if (isTextNode(node) && node.text.length > 0) {
      return node.text;
    }
  }
  return '';
}

function isNoteRTL(card: Note) {
  const title = getTitleText(card);

  const res = isRTL(title);

  return res;
}

function isNodeLTR(node: TreeNode) {
  if (isElementNode(node)) {
    for (const child of node.children) {
      if (isTextNode(child)) {
        for (const part of child.text.split(' ')) {
          if (isRTL(part)) {
            return false;
          }
        }
      }
    }
  }

  return true;
}

function isNodeRTL(node: TreeNode): boolean {
  let res: boolean | undefined;
  if (isElementNode(node)) {
    for (const child of node.children) {
      if (isTextNode(child) && res === undefined) {
        res = isRTL(child.text);
      }
    }
  } else if (isTextNode(node)) {
    res = isRTL(node.text);
  }

  return res !== undefined ? res : false;
}

function isEmptyLine(node: TreeNode): boolean {
  if (isElementNode(node) && node.tagName === 'p') {
    for (let child of node.children) {
      if (isTextNode(child)) {
        if (child.text.trim().length > 0) {
          return false;
        }
      } else {
        return false;
      }
    }
    return true;
  }

  return false;
}

function makeTransparent(color: string): string {
  color = color.split('#').join('');
  const r = parseInt(color[0] + color[1], 16);
  const g = parseInt(color[2] + color[3], 16);
  const b = parseInt(color[4] + color[5], 16);
  return `rgba(${r}, ${g}, ${b}, 0.2)`;
}

function createImageElm(cid: string): TreeNode {
  return {
    tagName: 'img',
    alt: cid,
    src: `cid:${cid}`,
    width: '18',
    height: '18',
    valign: 'middle',
  };
}
