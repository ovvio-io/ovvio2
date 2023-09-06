import {
  Editor,
  Element,
  Node,
  NodeEntry,
  NodeMatch,
  Text,
  Location,
  Path,
  BaseRange,
  Transforms,
  Descendant,
} from 'slate';
import { notReached } from '../../../../../base/error.ts';

type ElementMatch<T extends Element> =
  | ((node: Element, path: Path) => node is T)
  | ((node: Element, path: Path) => boolean);

export enum NodeToggleStatus {
  Off,
  Partial,
  On,
}
type SetNodesOptions = Parameters<typeof Transforms.setNodes>[2];

export const ElementUtils = {
  getSingleElement<T extends Element>(
    editor: Editor,
    match: NodeMatch<T> = Element.isElement
  ) {
    const nodes = Array.from(
      Editor.nodes(editor, {
        match,
        mode: 'highest',
      })
    );

    if (nodes.length === 1) {
      return nodes[0];
    }
    return null;
  },
  isSingleElement<T extends Element>(
    editor: Editor,
    match: ElementMatch<T> = () => true
  ) {
    return !!ElementUtils.getSingleElement(
      editor,
      (n, p) => Element.isElement(n) && match(n, p)
    );
  },
  isEmpty(node: Node): boolean {
    return !Node.string(node);
  },
  getClosestElement(editor: Editor, at: Location) {
    return ElementUtils.getClosestNode(editor, at, Element.isElement);
  },
  getClosestNode<T extends Node>(
    editor: Editor,
    at: Location,
    match: (node: Node) => node is T
  ): NodeEntry<T> {
    let [node, path] = Editor.node(editor, at);
    while (path.length) {
      if (match(node)) {
        return [node, path];
      }
      [node, path] = Editor.node(editor, Path.parent(path));
    }
    notReached();
  },
  isEmptyElement(value: any): boolean {
    if (!Element.isElement(value)) {
      return false;
    }

    if (value.children.length === 0) {
      // Shouldn't happen but whatever
      return true;
    }
    if (value.children.length > 1) {
      return false;
    }
    const onlyChild = value.children[0];
    return Text.isText(onlyChild) && !onlyChild.text;
  },
  findNode<T extends Node>(
    root: Node,
    match: NodeMatch<T>
  ): NodeEntry<T> | [null, null] {
    for (const [node, path] of Node.elements(root)) {
      if (match(node, path)) {
        return [node, path];
      }
    }
    return [null, null];
  },
  getNodeToggleStatus(
    editor: Editor,
    at: BaseRange,
    condition: (node: Node) => boolean
  ): NodeToggleStatus {
    let fragment: Descendant[];
    try {
      fragment = Editor.fragment(editor, at);
    } catch {
      return NodeToggleStatus.Off;
    }

    let all = true;
    let some = false;

    for (const node of fragment) {
      const conditionVal = condition(node);
      all = all && conditionVal;
      some = some || conditionVal;
    }
    if (all) {
      return NodeToggleStatus.On;
    }
    if (some) {
      return NodeToggleStatus.Partial;
    }
    return NodeToggleStatus.Off;
  },
  toggleNode(
    editor: Editor,
    at: BaseRange,
    setNodeAs: Partial<Node>,
    condition: (node: Node) => boolean,
    setNodesOptions?: Omit<SetNodesOptions, 'at'>
  ) {
    const nodeStatus = ElementUtils.getNodeToggleStatus(editor, at, condition);
    if (nodeStatus === NodeToggleStatus.On) {
      Transforms.setNodes(
        editor,
        { tagName: 'p' },
        {
          ...setNodesOptions,
          at,
        }
      );
    } else {
      Transforms.setNodes(editor, setNodeAs, {
        ...setNodesOptions,
        at,
      });
    }
  },
};
