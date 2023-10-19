import {
  ElementNode,
  EmbedNode,
  TextNode,
} from '@ovvio/cfds/lib/primitives/richtext-tree2';
import { uniqueId } from '@ovvio/base/lib/utils';
import { ANN_KEY_TASK_REF } from './serializer2';

export class PlainTextSerializer {
  deserialize(root) {
    if (root.builder) {
      root = root.builder.root;
    }

    return this.mapChildren(root).trim();
  }

  mapChildren(parent) {
    const content = [];
    for (const node of parent.children) {
      if (node instanceof TextNode) {
        content.push(node.text);
      } else if (node instanceof ElementNode) {
        content.push('\n');
        content.push(this.mapChildren(node));
      }
    }

    return content.join('');
  }
}

class EmbedSerializer {
  serializeNode(node) {
    return null;
  }
}

class MentionsAnchorSerializer extends EmbedSerializer {
  serializeNode(node, parent) {
    if (!node.local || !(node.tagName || node.data.type).endsWith('-anchor')) {
      return null;
    }

    return [
      {
        object: 'inline',
        type: node.tagName || node.data.type,
        key: node.id,
        nodes: [
          {
            object: 'text',
            key: `${node.id}-t1`,
            leaves: [
              {
                object: 'leaf',
                text: node.data.anchorText,
                marks: [],
              },
            ],
          },
        ],
      },
      {
        object: 'text',
        key: `ui-${parent.id}-ws`,
        leaves: [
          {
            object: 'leaf',
            text: '',
            marks: [],
          },
        ],
      },
    ];
  }
}

class AssigneeSerializer extends EmbedSerializer {
  serializeNode(node, parent) {
    if ((node.tagName || node.data.type) !== 'assignee') {
      return null;
    }
    const { type, ...data } = node.data;

    return {
      object: 'inline',
      type: node.tagName || node.data.type,
      key: node.id,
      data: data,
    };
  }
}

class TaskSerializer extends EmbedSerializer {
  constructor(getRemoteObject) {
    super();
    this.taskBuilder = new SlateDocumentBuilder([
      new MentionsAnchorSerializer(),
      new AssigneeSerializer(),
    ]);

    this._getRemoteObject = getRemoteObject;
  }

  serializeNode(node, parent) {
    if ((node.tagName || node.data.type) !== 'task') {
      return null;
    }

    let taskKey = node.data[ANN_KEY_TASK_REF];
    if (!taskKey) {
      if (node.data.key) {
        // Legacy task
        taskKey = `notes/${node.data.key}`;
      } else {
        return [];
      }
    }
    const task = this._getRemoteObject(taskKey);

    if (!task) {
      return {
        object: 'block',
        type: 'task-skeleton',
        key: node.id,
        data: { [ANN_KEY_TASK_REF]: taskKey },
      };
    }
    if (task.isDeleted) {
      return [];
    }
    return {
      object: 'block',
      type: 'task',
      key: node.id,
      data: {
        [ANN_KEY_TASK_REF]: taskKey,
      },
    };
  }
}
function getUrlRanges(str) {
  const ranges = [];
  let index = 0;
  while (index + 'http://'.length <= str.length) {
    const letters = str.substring(index, index + 'https://'.length);
    if (letters.startsWith('http://') || letters === 'https://') {
      let rangeEnd = str.indexOf(' ', index + letters.length);
      if (rangeEnd === -1) {
        rangeEnd = str.length;
      }
      ranges.push({
        start: index,
        end: rangeEnd,
        url: str.substring(index, rangeEnd),
      });
      index = rangeEnd;
    } else {
      index++;
    }
  }

  return ranges;
}
export default class SlateDocumentBuilder {
  constructor(embedSerializers) {
    this._embedSerializers = embedSerializers;
  }

  static default(getRemoteObject) {
    return new SlateDocumentBuilder([
      new TaskSerializer(getRemoteObject),
      new MentionsAnchorSerializer(),
      new AssigneeSerializer(),
    ]);
  }

  static getBuilder(type, getRemoteObject) {
    switch (type) {
      case 'task': {
        return new SlateDocumentBuilder([
          new MentionsAnchorSerializer(),
          new AssigneeSerializer(),
        ]);
      }
      default:
        return this.default(getRemoteObject);
    }
  }

  deserialize(root, what, context) {
    if (root.builder) {
      root = root.builder.root;
    }

    const doc = {
      object: 'document',
      data: {},
      key: root.id,
    };
    const decorations = [];
    const addDecorations = arr => {
      decorations.push(...arr);
    };

    doc.nodes = this.mapChildren(root, addDecorations);

    if (!doc.nodes.length) {
      let type = 'line';
      if (context && context.snapshot && context.snapshot.type) {
        type = context.snapshot.type === 'task' ? 'task' : 'title';
      }
      let key = context ? context.key : uniqueId();
      doc.nodes.push({
        type,
        object: 'block',
        key,
        nodes: [
          {
            object: 'text',
            key: `${key}-t1`,
            leaves: [
              {
                object: 'leaf',
                text: '',
                marks: [],
              },
            ],
          },
        ],
      });
    }

    return { doc, decorations };
  }

  serializeTexts(texts, parent, textCount, addDecorations) {
    const key = `${parent.id}-t${textCount}`;
    const fullText = texts.map(t => t.text).join('');
    const urls = getUrlRanges(fullText);
    const decorations = new Array(urls.length);
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      decorations[i] = {
        object: 'decoration',
        anchor: {
          object: 'point',
          key,
          offset: url.start,
        },
        focus: {
          object: 'point',
          key,
          offset: url.end,
        },
        mark: {
          object: 'mark',
          type: 'link-inplace',
          data: {
            url: url.url,
          },
        },
      };
    }
    addDecorations(decorations);
    return {
      object: 'text',
      key: key,
      leaves: texts.map(t => ({
        object: 'leaf',
        text: t.text,
        marks: t.getMarkers().map(x => ({ type: x })),
      })),
    };
  }

  serializeNonTextNode(node, parent, addDecorations) {
    if (node instanceof ElementNode) {
      const type = node.tagName || node.getValueForKey('type');

      const { _, ...props } = node.getProps();

      return {
        object: 'block',
        type: type,
        key: node.id,
        nodes: this.mapChildren(node, addDecorations),
        data: props,
      };
    }
    if (node instanceof EmbedNode) {
      for (const embedSerializer of this._embedSerializers) {
        const r = embedSerializer.serializeNode(node);
        if (r) {
          return r;
        }
      }
    }
    throw new Error(`Unknown node type ${node}`);
  }

  mapChildren(parent, addDecorations) {
    let texts = [];
    let textCount = 1;
    let children = [];
    for (const node of parent.children) {
      if (node instanceof TextNode) {
        texts.push(node);
      } else {
        if (texts.length) {
          children.push(
            this.serializeTexts(texts, parent, textCount, addDecorations)
          );
          texts = [];
          textCount++;
        }
        children = children.concat(
          this.serializeNonTextNode(node, parent, addDecorations)
        );
      }
    }
    if (texts.length) {
      children.push(
        this.serializeTexts(texts, parent, textCount, addDecorations)
      );
    }

    return children;
  }
}
