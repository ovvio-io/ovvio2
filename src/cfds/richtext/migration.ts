import {
  ElementNode as ElementNodeV2,
  EmbedNode as EmbedNodeV2,
  TextNode as TextNodeV2,
} from '../primitives-old/richtext-tree2';
import { RichText as RichTextV2 } from '../primitives-old/richtext2';
import { RefMarker, RefType } from './model';
import {
  ElementNode as ElementNodeV3,
  initRichText,
  isElementNode,
  RichText as RichTextV3,
  TextNode as TextNodeV3,
} from './tree';

export function migrationToRichtextV3(richtext2: RichTextV2): RichTextV3 {
  const newRT: RichTextV3 = {
    root: migrateElement(richtext2.root),
  };

  fixLists(newRT.root);

  if (newRT.root.children.length === 0) {
    return initRichText();
  }

  return newRT;
}

function migrateElement(oldElement: ElementNodeV2): ElementNodeV3 {
  const newElement: ElementNodeV3 = {
    children: [],
  };
  if (oldElement.local === true) newElement.isLocal = true;

  //What is the tag
  const oldTagName = oldElement.tagName || oldElement.getValueForKey('type');
  if (oldTagName !== undefined) {
    let newTagName: string | undefined;

    switch (oldTagName) {
      case 'line': {
        newTagName = 'p';
        break;
      }
      case 'bullet-list': {
        newTagName = 'li';
        newElement.fixList = 'ul';
        break;
      }
      case 'numbered-list': {
        newTagName = 'li';
        newElement.fixList = 'ol';
        break;
      }
      case 'h1':
      case 'h2': {
        newTagName = oldTagName;
        break;
      }
      default: {
        newTagName = 'p';
        break;
      }
    }

    if (newTagName !== undefined) {
      newElement.tagName = newTagName;
    }
  }

  //Children
  for (const child of oldElement.children) {
    if (child instanceof ElementNodeV2) {
      newElement.children.push(migrateElement(child));
    } else if (child instanceof TextNodeV2) {
      newElement.children.push(migrateText(child));
    } else if (child instanceof EmbedNodeV2) {
      const refMarker = migrateEmbed(child);
      if (refMarker) newElement.children.push(refMarker);
    }
  }

  return newElement;
}

function migrateText(oldTextNode: TextNodeV2): TextNodeV3 {
  const newTextNode: TextNodeV3 = {
    text: oldTextNode.text,
  };
  if (oldTextNode.local === true) newTextNode.isLocal = true;

  //Marks
  let addedMarker = false;
  for (const marker of oldTextNode.getMarkers()) {
    switch (marker) {
      case 'bold':
        newTextNode.bold = true;
        addedMarker = true;
        break;
      case 'strikethrough':
        newTextNode.strike = true;
        addedMarker = true;
        break;
      case 'italic':
        newTextNode.italic = true;
        addedMarker = true;
        break;
      case 'underline':
        newTextNode.underline = true;
        addedMarker = true;
        break;
    }
  }

  if (addedMarker) newTextNode.tagName = 'span';

  return newTextNode;
}

function migrateEmbed(oldEmbed: EmbedNodeV2): RefMarker | undefined {
  let ref: string;
  let type: RefType;
  switch (oldEmbed.tagName) {
    case 'task': {
      ref = (oldEmbed.data as any).taskId;
      type = RefType.InternalDoc;
      break;
    }
    default: {
      return;
    }
  }

  const refMarker: RefMarker = {
    ref,
    type,
  };
  if (oldEmbed.local === true) refMarker.isLocal = true;

  return refMarker;
}

function fixLists(curElement: ElementNodeV3) {
  let i = 0;
  while (i < curElement.children.length) {
    const child = curElement.children[i];
    let moveToNext = true;
    if (isElementNode(child)) {
      fixLists(child);

      if (child.tagName === 'li' && typeof child.fixList === 'string') {
        if (i === 0 || curElement.children[i - 1].tagName !== child.fixList) {
          const newList: ElementNodeV3 = {
            tagName: child.fixList,
            children: [child],
          };
          curElement.children[i] = newList;
        } else {
          //add to prev child
          const prevChild = curElement.children[i - 1] as ElementNodeV3;
          prevChild.children.push(child);

          //Remove child from current element
          curElement.children.splice(i, 1);
          moveToNext = false;
        }
        delete child.fixList;
      }
    }

    if (moveToNext) i++;
  }
}
