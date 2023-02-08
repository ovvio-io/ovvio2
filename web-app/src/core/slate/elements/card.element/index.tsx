import React, { ReactNode, useContext } from 'https://esm.sh/react@18.2.0';
import {
  Editor,
  Element,
  Node,
  NodeEntry,
  Path,
  Transforms,
} from 'https://esm.sh/slate@0.87.0';
import { RenderElementProps } from 'https://esm.sh/slate-react@0.87.1';
import { NS_NOTES } from '../../../../../../cfds/base/scheme-types.ts';
import {
  Note,
  User,
} from '../../../../../../cfds/client/graph/vertices/index.ts';
import { UnkeyedDocument } from '../../../../../../cfds/richtext/doc-state.ts';
import { ElementNode } from '../../../../../../cfds/richtext/tree.ts';
import { createTagsPlugin } from '../../mentions/tags.tsx';
import { ElementUtils } from '../../utils/element-utils.ts';
import { SelectionUtils } from '../../utils/selection-utils.ts';
import { VertexManager } from '../../../../../../cfds/client/graph/vertex-manager.ts';
import { mergePlugins } from '../../plugins/index.ts';
import { ParagraphElement } from '../../types.ts';
import { createAutoReplaceHandler } from '../../utils/auto-replace.ts';
import { HeaderElement } from '../header.element.tsx';
import { Header2Element } from '../header2.element.tsx';
import {
  CardElementProps,
  CardNode,
  LoadingCardElementProps,
  LoadingCardNode,
} from './card-node/index.tsx';
import { createAssigneesPlugin } from '../../mentions/assignees.tsx';
import { NoteType } from '../../../../../../cfds/client/graph/vertices/note.ts';
import { Logger } from '../../../../../../logging/log.ts';
import { UISource } from '../../../../../../logging/client-events.ts';
export const CARD_TYPE = 'ref';
export const CARD_LOADING_TYPE = 'NON_EXISTENT';
export interface CardElement extends ElementNode {
  tagName: typeof CARD_TYPE;
  children: [ParagraphElement];
  ref: string;
  type: 'inter-doc';
}

export interface LoadingCardElement extends ElementNode {
  tagName: typeof CARD_LOADING_TYPE;
  type: 'inter-doc';
  ref: string;
  loading: true;
}

const cardContext = React.createContext<VertexManager<Note> | null>(null);

export function EditableCardContext({
  cardManager,
  children,
}: {
  cardManager: VertexManager<Note>;
  children?: ReactNode;
}) {
  return (
    <cardContext.Provider value={cardManager}>{children}</cardContext.Provider>
  );
}

export function useCurrentCard() {
  return useContext(cardContext);
}

export function isCardProps(
  props: RenderElementProps
): props is CardElementProps {
  return (
    props.element.tagName === CARD_TYPE && props.element.type === 'inter-doc'
  );
}

export function isLoadingCardProps(
  props: RenderElementProps
): props is LoadingCardElementProps {
  return CardElement.isLoadingCard(props.element);
}

export function renderCard(props: RenderElementProps) {
  if (isCardProps(props)) {
    return <CardNode {...props} />;
  }
  if (isLoadingCardProps(props)) {
    return <LoadingCardNode {...props} />;
  }
}

interface CreateNoteOptions {
  likeSibling?: Note;
  body?: UnkeyedDocument;
  title?: UnkeyedDocument;
}

export function createNote(
  parent: Note,
  currentUser: User,
  options?: CreateNoteOptions
): Note {
  //const refKey = uniqueId();
  const {
    likeSibling,
    body = {
      root: { children: [{ tagName: 'p', children: [{ text: '' }] }] },
    },
    title = {
      root: { children: [{ tagName: 'p', children: [{ text: '' }] }] },
    },
  } = options || {};
  // const tags = likeSibling ? likeSibling.tags : parent.workspace.taskTags;

  // const tagsMap = new Map(Array.from(tags).map(([p, t]) => [p.key, t.key]));

  // const taskTags = parent.workspace.taskTags;
  // if (taskTags) {
  //   for (const [p, c] of taskTags) {
  //     tagsMap.set(p.key, c.key);
  //   }
  // }

  const assignees = likeSibling ? likeSibling.assignees : [currentUser];

  const child = parent.graph.createVertex<Note>(NS_NOTES, {
    creationDate: new Date(),
    workspace: parent.workspaceKey,
    // tags: tagsMap,
    title,
    body,
    type: NoteType.Task,
    parentNote: parent.key,
    assignees: new Set(Array.from(assignees).map((x) => x.key)),
    createdBy: currentUser.key,
  });

  return child;
}

export function createCardPlugin(
  editor: Editor,
  getContainingNote: () => VertexManager<Note>,
  getCurrentUser: () => User,
  logger: Logger
) {
  return mergePlugins([
    createAutoReplaceHandler({
      trigger: {
        default: {
          metaKeys: [],
          key: ' ',
        },
      },
      prefix: '-',
      editor,
      canTrigger: ([node]) => {
        return CardElement.canTransformToCard(node);
      },
      onTriggered([node, path]: NodeEntry) {
        const el = node as AllowedElementType;
        CardElement.replaceAsCard(
          editor,
          el,
          path,
          getContainingNote(),
          getCurrentUser()
        );
      },
    }),
    createTagsPlugin({
      canOpen() {
        return CardElement.isSingleCard(editor);
      },
      editor,
    }),
    createAssigneesPlugin({
      canOpen() {
        return CardElement.isSingleCard(editor);
      },
      editor,
    }),
    {
      onKeyDown(e) {
        if (e.key !== 'Enter' && e.key !== 'Backspace') {
          return;
        }
        const [currentNode, currentPath] =
          SelectionUtils.extractSingleElement(editor);
        if (!currentNode) {
          return;
        }
        const el = ElementUtils.getClosestNode(
          editor,
          currentPath,
          CardElement.isCard
        );
        if (!el) {
          return;
        }

        const containing = getContainingNote();
        if (!containing) {
          console.warn('No containing note found');
          return;
        }

        const [node, path] = el;
        if (CardElement.isEmptyCard(node)) {
          e.preventDefault();

          CardElement.unwrapCard(editor, currentPath);
          logger.log({
            severity: 'INFO',
            event: 'Delete',
            vertex: node.ref,
            source: 'editor:key-down',
            id: e.key,
          });
          return;
        }
        if (e.key === 'Backspace') {
          return;
        }
        e.preventDefault();

        // const current = containing.graph.getVertex<Note>(node.ref);
        const child = createNote(containing.getVertexProxy(), getCurrentUser());

        const insertAt = Path.next(path);
        CardElement.insertNote(editor, child, insertAt);
        Transforms.setSelection(editor, {
          focus: {
            path: [...insertAt, 0, 0],
            offset: 0,
          },
          anchor: {
            path: [...insertAt, 0, 0],
            offset: 0,
          },
        });
      },
    },
    { renderElement: renderCard },
  ]);
}

export type AllowedElementType =
  | ParagraphElement
  | HeaderElement
  | Header2Element;

export const ALLOWED_ELEMENTS: AllowedElementType['tagName'][] = [
  'p',
  'h1',
  'h2',
];

// eslint-disable-next-line
export const CardElement = {
  isCard(value: any): value is CardElement {
    return Element.isElement(value) && value.tagName === CARD_TYPE;
  },
  isLoadingCard(node: any): node is LoadingCardElement {
    return (
      Element.isElement(node) &&
      node.type === 'inter-doc' &&
      !!(node as any).loading
    );
  },
  canTransformToCard(node: Node): boolean {
    return (
      Element.isElement(node) &&
      ALLOWED_ELEMENTS.includes(node.tagName as AllowedElementType['tagName'])
    );
  },
  isSingleCard(editor: Editor): boolean {
    return ElementUtils.isSingleElement(editor, CardElement.isCard);
  },
  isEmptyCard(card: CardElement) {
    return ElementUtils.isEmptyElement(card.children[0]);
  },
  insertNote(editor: Editor, note: Note, at: Path) {
    Transforms.insertNodes(
      editor,
      [
        {
          tagName: 'ref',
          type: 'inter-doc',
          ref: note.key,
          children: note.title.root.children as [ParagraphElement],
        },
      ],
      { at }
    );
  },
  unwrapCard(editor: Editor, at: Path) {
    const el = ElementUtils.getClosestNode(editor, at, CardElement.isCard);
    if (!el) {
      return;
    }

    const [, cardPath] = el;
    Transforms.unwrapNodes(editor, { at: cardPath });
  },
  replaceAsCard(
    editor: Editor,
    node: AllowedElementType,
    path: Path,
    parentNoteMng: VertexManager<Note>,
    currentUser: User
  ) {
    const child = createNote(parentNoteMng.getVertexProxy(), currentUser, {
      title: {
        root: {
          children: [
            {
              tagName: 'p',
              children: node.children.map((x) => {
                const { localKey, ...text } = x;
                return text;
              }),
            },
          ],
        },
      },
    });
    const reffedPath = Editor.pathRef(editor, path);

    CardElement.insertNote(editor, child, path);
    const cardPath = Editor.pathRef(editor, [...path, 0]);
    if (Path.equals(path, [0])) {
      // FIX: Slate has issues with a nested child as first child
      Transforms.insertNodes(
        editor,
        {
          tagName: 'p',
          children: [{ text: '' }],
        },
        { at: path }
      );
    }
    Transforms.setSelection(editor, {
      focus: {
        path: [...cardPath.current!, 0],
        offset: 0,
      },
      anchor: {
        path: [...cardPath.current!, 0],
        offset: 0,
      },
    });
    Transforms.removeNodes(editor, {
      at: reffedPath.current || undefined,
    });
    reffedPath.unref();
    cardPath.unref();
  },
};
