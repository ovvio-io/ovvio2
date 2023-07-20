import {
  Editor,
  Element,
  Node,
  NodeEntry,
  Path,
  Transforms,
} from 'https://esm.sh/slate@0.87.0';
import { BulletListElement } from '../elements/bullet-list.element.tsx';
import { ListItemElement } from '../elements/list-item.element.tsx';
import { NumberedListElement } from '../elements/numbered-list.element.tsx';
import { ElementUtils } from './element-utils.ts';

type NestedContainerElement = BulletListElement | NumberedListElement;
type NestedChild = ListItemElement;

export const ListUtils = {
  isNestedContainer(value: any): value is NestedContainerElement {
    // if (Editor.isEditor(value)) {
    //   return true;
    // }
    if (!Element.isElement(value)) {
      return false;
    }
    return value.tagName === 'ol' || value.tagName === 'ul';
  },
  isNestedChild(value: any): value is NestedChild {
    return (
      Element.isElement(value) &&
      (value.tagName === 'li' || ListUtils.isNestedContainer(value))
    );
  },
  getContainerParent(
    editor: Editor,
    path: Path
  ): NodeEntry<NestedContainerElement> {
    return Editor.above(editor, {
      at: path,
      mode: 'lowest',
      match: (node, p) =>
        !Path.equals(path, p) && ListUtils.isNestedContainer(node),
    })!;
  },
  setList(editor: Editor, path: Path, listType: 'ul' | 'ol'): void {
    const [node] = Editor.node(editor, path);
    const texts = Array.from(Node.texts(node)).map(([text]) => text);
    Transforms.removeNodes(editor, { at: path });
    Transforms.insertNodes(
      editor,
      {
        tagName: listType,
        children: [
          {
            tagName: 'li',
            children: texts,
          },
        ],
      },
      { at: path }
    );
    const newPath = [...path, 0, 0];
    Transforms.setSelection(editor, {
      anchor: {
        path: newPath,
        offset: 0,
      },
      focus: {
        path: newPath,
        offset: 0,
      },
    });
  },
  liftListItem(editor: Editor, path: Path): void {
    const [item] = Editor.node(editor, path);
    const [itemNode, itemPath] = ListUtils.isNestedChild(item)
      ? [item, path]
      : Editor.above(editor, {
          at: path,
          mode: 'lowest',
          match: ListUtils.isNestedChild,
        })!;
    const itemRef = Editor.pathRef(editor, itemPath);
    const [containerNode, containerPath] = ListUtils.getContainerParent(
      editor,
      itemPath
    );
    // let [upperContainer, upperContainerPath] = ListUtils.getContainerParent(editor, containerPath);
    const containerPathRef = Editor.pathRef(editor, containerPath);
    const itemIndex = itemPath[itemPath.length - 1];
    if (itemIndex !== 0 && itemIndex !== containerNode.children.length - 1) {
      const splitPath = Path.next(containerPath);
      Transforms.insertNodes(
        editor,
        {
          tagName: containerNode.tagName,
          children: [],
        },
        {
          at: splitPath,
        }
      );
      Transforms.moveNodes(editor, {
        at: containerPath,
        to: [...splitPath, 0],
        match: (_, p) =>
          Path.isSibling(p, itemRef.current!) &&
          Path.isAfter(p, itemRef.current!),
      });
    }
    const indexAfterSplit = itemRef.current![itemRef.current!.length - 1];

    Transforms.moveNodes(editor, {
      at: itemRef.current!,
      to: indexAfterSplit === 0 ? containerPath : Path.next(containerPath),
    });
    const newContainer = ListUtils.getContainerParent(editor, itemRef.current!);
    if (itemNode.tagName === 'li' && !newContainer) {
      Transforms.setNodes(editor, { tagName: 'p' }, { at: itemRef.current! });
    }
    itemRef.unref();

    const [updatedContainer] = Editor.node(editor, containerPathRef.current!);

    if (ElementUtils.isEmptyElement(updatedContainer)) {
      Transforms.removeNodes(editor, { at: containerPathRef.current! });
    }
    containerPathRef.unref();
  },
};
