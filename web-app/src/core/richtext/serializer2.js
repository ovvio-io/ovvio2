import {
  Builder,
  ANN_KEY_TAG,
  ANN_KEY_NODE_ID,
} from '@ovvio/cfds/lib/primitives/richtext-tree2';
import { RichText } from '@ovvio/cfds/lib/primitives/richtext2';

export const ANN_KEY_TASK_REF = 'taskId';

function filterData(data) {
  const filtered = {};
  data = data.toJS();
  for (let [key, value] of Object.entries(data)) {
    if (key !== 'size' && !key.startsWith('_')) {
      filtered[key] = value;
    }
    if (key === 'type') {
      continue;
    }
  }

  return filtered;
}

class NodeParser {
  canParseNode(node) {
    return false;
  }
  parseNode(node, richtext) {
    return false;
  }
}

class MentionsAnchorParser extends NodeParser {
  canParseNode(node) {
    return (
      node && node.type && node.type.endsWith('-anchor')
    );
  }
  parseNode(node, treeBuilder) {
    treeBuilder.appendEmbed(
      {
        [ANN_KEY_NODE_ID]: node.key,
        [ANN_KEY_TAG]: node.type,
        anchorText: node.text,
        ...filterData(node.data),
      },
      true
    );
  }
}

class AssigneeParser extends NodeParser {
  canParseNode(node) {
    return node.type === 'assignee';
  }

  parseNode(node, treeBuilder) {
    treeBuilder.appendEmbed({
      [ANN_KEY_NODE_ID]: node.key,
      [ANN_KEY_TAG]: node.type,
      ...filterData(node.data),
    });
  }
}

class VoidParser extends NodeParser {
  canParseNode(node) {
    return ['gif'].includes(node.type);
  }

  parseNode(node, treeBuilder, serializeNode) {
    treeBuilder.appendEmbed({
      [ANN_KEY_NODE_ID]: node.key,
      [ANN_KEY_TAG]: node.type,
      ...filterData(node.data),
    });
  }
}

class BlockParser extends NodeParser {
  canParseNode(node) {
    return node.object === 'block';
  }

  parseNode(node, treeBuilder, serializeNode) {
    treeBuilder.openElement(
      {
        [ANN_KEY_NODE_ID]: node.key,
        [ANN_KEY_TAG]: node.type,
        ...filterData(node.data),
      },
      {},
      node.key.startsWith('ui-')
    );
    const nodes = node.nodes;

    for (let i = 0; i < nodes.size; i++) {
      serializeNode(nodes.get(i), treeBuilder);
    }

    treeBuilder.closeElement();
  }
}

class TextParser extends NodeParser {
  canParseNode(node) {
    return node.object === 'text';
  }

  parseNode(node, treeBuilder) {
    if (node.key.startsWith('ui-')) {
      return;
    }

    for (let i = 0; i < node.leaves.size; i++) {
      const leaf = node.leaves.get(i);
      // if (leaf.marks.size) {
      //   debugger;
      // }
      const marks = leaf.marks.toList().map(x => x.type);
      treeBuilder.appendText(leaf.text, marks);
    }
  }
}

export default class SlateDocumentSerializer {
  constructor(parsers) {
    this._serializeNode = this._serializeNode.bind(this);
    this._parsers = parsers;
  }

  static default(getRemoteObject) {
    return new SlateDocumentSerializer([
      new AssigneeParser(),
      new TaskParser(getRemoteObject),
      new MentionsAnchorParser(),
      new VoidParser(),
      new TextParser(),
      new BlockParser(),
    ]);
  }

  static getSerializer(type, getRemoteObject) {
    switch (type) {
      case 'task': {
        const s = new SlateDocumentSerializer([
          new MentionsAnchorParser(),
          new VoidParser(),
          new TextParser(),
          new BlockParser(),
        ]);
        s._type = type;
        return s;
      }
      default:
        return this.default(getRemoteObject);
    }
  }

  serialize(rootNode, snapshot) {
    const treeBuilder = new Builder();
    const nodes = rootNode.nodes;

    for (let i = 0; i < nodes.size; i++) {
      this._serializeNode(
        nodes.get(i),
        treeBuilder,
        rootNode
      );
    }

    treeBuilder.root.normalize();
    return new RichText(treeBuilder);
  }

  _serializeNode(node, treeBuilder) {
    for (let parser of this._parsers) {
      if (parser.canParseNode(node)) {
        parser.parseNode(
          node,
          treeBuilder,
          this._serializeNode
        );
        return;
      }
    }
  }
}

class TaskParser extends NodeParser {
  constructor(getRemoteObject) {
    super();
    this._taskSerializer = new SlateDocumentSerializer([
      new AssigneeParser(),
      new MentionsAnchorParser(),
      new TextParser(),
      new BlockParser(),
    ]);
    this._getRemoteObject = getRemoteObject;
  }
  canParseNode(node) {
    return (
      node.type === 'task' || node.type === 'task-skeleton'
    );
  }

  parseNode(node, treeBuilder, serializeNode, parent) {
    let taskId = node.data.get(ANN_KEY_TASK_REF);
    if (!taskId) {
      if (node.data.get('key')) {
        taskId = `notes/${node.data.get('key')}`;
      } else {
        return;
      }
    }

    treeBuilder.appendEmbed({
      [ANN_KEY_NODE_ID]: node.key,
      [ANN_KEY_TAG]: 'task',
      [ANN_KEY_TASK_REF]: taskId,
    });
  }
}
