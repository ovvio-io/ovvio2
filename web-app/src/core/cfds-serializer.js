import { Value, Selection } from 'slate';
import { Node, NODE_TYPE_BLOCK } from '@ovvio/cfds/primitives/richtext';
import { uniqueId, assert } from '@ovvio/base/lib/utils';
import { createCfdsProxy } from 'core/react-utils/cfds';

function isDataKeyRelevant(key) {
  return !['size'].includes(key) && !key.startsWith('_');
}

class NodeSerializer {
  shouldSerializeNode(node) {
    throw new Error('Not Implemented');
  }
  shouldDeserializeNode(node) {
    throw new Error('Not Implemented');
  }
  serializeNode(node, parentNode, serialize) {
    throw new Error('Not Implemented');
  }
  deserializeNode(node, parentNode, deserialize, slateNode, includedKeys) {
    throw new Error('Not Implemented');
  }

  getPropsForNode(node) {
    const props = {
      key: node.key,
    };
    Object.keys(node.data).forEach(key => {
      if (isDataKeyRelevant(key)) {
        props[key] = node.data[key];
      }
    });
    return props;
  }
  getSlateTypeForNode(node, parentNode) {
    assert(node.props.type, 'Tried to deserialize a node without a type');
    return node.props.type;
  }

  buildSlateNode(node, parentNode) {
    const data = {};
    Object.keys(node.props).forEach(key => {
      if (key !== 'type' && key !== 'key') {
        data[key] = node.props[key];
      }
    });
    const slateNode = {
      object: 'block',
      type: this.getSlateTypeForNode(node, parentNode),
      data: data,
      key: node.props.key,
    };

    return slateNode;
  }

  deserializeText(node) {
    if (!node.markerSet) {
      return node.text;
    }

    const leaves = [];
    let lastEnd = 0;
    node.markerSet.fragments((range, data) => {
      if (range.start > lastEnd) {
        leaves.push({
          object: 'leaf',
          text: node.text.substring(lastEnd, range.start),
        });
      }
      lastEnd = range.end;
      const text = node.text.substring(range.start, range.end);
      const leaf = {
        object: 'leaf',
        text,
        marks: [],
      };

      for (let i = 0; i < data.length; i++) {
        const marker = data[i];
        let type = marker.name;
        if (marker.props.$key) {
          type = `${type}:${marker.props.$key}`;
        }

        const markData = {};
        Object.keys(marker.props).forEach(key => {
          markData[key] = marker.props[key];
        });

        leaf.marks.push({
          object: 'mark',
          type,
          data: markData,
        });
      }
      leaves.push(leaf);
    });

    if (lastEnd < node.text.length) {
      leaves.push({
        object: 'leaf',
        text: node.text.substring(lastEnd, node.text.length),
      });
    }

    return leaves;
  }
}

class BlockNodeSerializer extends NodeSerializer {
  shouldSerializeNode(node) {
    return node.object === 'text' || node.nodes.every(x => x.object === 'text');
  }

  shouldDeserializeNode(node) {
    return node.type === NODE_TYPE_BLOCK;
  }

  getSlateTypeForNode(node, parentNode) {
    return node.props.type || 'line';
  }

  getTypeForNode(node, parentNode) {
    if (node.type === 'line') {
      return null;
    }
    return node.type;
  }

  serializeNode(node, parentNode, serialize) {
    const props = this.getPropsForNode(node);
    const type = this.getTypeForNode(node, parentNode);
    if (type) {
      props.type = type;
    }
    const result = Node.block(node.text, props);
    let offset = 0;

    const text = node.nodes.get(0);

    for (let i = 0; i < text.leaves.size; i++) {
      const leaf = text.leaves.get(i);
      const marks = leaf.marks.toList();
      for (let j = 0; j < marks.size; j++) {
        const mark = marks.get(j);
        const markProps = mark.data.toJSON();
        const typeArr = mark.type.split(':');
        if (typeArr.length > 1) {
          markProps.$key = typeArr[1];
        }
        result.markerSet.applyMarker(
          typeArr[0],
          offset,
          offset + leaf.text.length
        );
      }

      offset += leaf.text.length;
    }

    return result;
  }

  deserializeNode(node, parentNode, deserialize) {
    const slateNode = this.buildSlateNode(node, parentNode);
    slateNode.nodes = [
      {
        object: 'text',
        key: `${node.props.key}-t`,
        leaves: this.deserializeText(node),
      },
    ];

    return slateNode;
  }
}

class DynamicNodeSerializer extends NodeSerializer {
  shouldSerializeNode(node, parentNode) {
    return true;
  }

  shouldDeserializeNode(node, parentNode) {
    return node.type !== NODE_TYPE_BLOCK;
  }

  serializeNode(node, parentNode, serialize) {
    const props = this.getPropsForNode(node);
    props.type = node.type;
    const children = node.nodes;

    const parent = Node.dynamic(props);
    for (let i = 0; i < children.size; i++) {
      const child = serialize(children.get(i), node);
      if (child) {
        parent.appendChild(child);
      }
    }
    return parent;
  }

  deserializeNode(node, parentNode, deserialize, oldSlateNode) {
    const slateNode = this.buildSlateNode(node, parentNode);
    slateNode.nodes = [];
    for (let i = 0; i < node.children.length; i++) {
      const c = node.children[i];
      const child = deserialize(
        c,
        node,
        oldSlateNode && oldSlateNode.getNode(c.props.key)
      );
      if (child) {
        slateNode.nodes.push(child);
      }
    }

    return slateNode;
  }
}

class TaskNodeSerializer extends DynamicNodeSerializer {
  constructor(taskRepository) {
    super();
    this._taskRepository = taskRepository;
  }

  shouldSerializeNode(node, parentNode) {
    return node.type === 'task';
  }

  shouldDeserializeNode(node, parentNode) {
    return node.props.type === 'task';
  }

  serializeNode(node, parentNode, serialize) {
    const task = this._taskRepository.get(node.key);

    if (task) {
      const text = node.getNode(`${node.key}-t`).text;

      task.snapshot.title = text;
    }

    return Node.dynamic({
      id: node.key,
      key: node.key,
      type: 'task',
    });
  }

  deserializeNode(node, parentNode, deserialize, oldSlateNode, includedKeys) {
    assert(node.props.id, 'Received task node without id');
    includedKeys.push(`notes/${node.props.id}`);

    const task = this._taskRepository.get(node.props.id);

    const slateNode = this.buildSlateNode(node, parentNode);
    slateNode.key = node.props.id;
    if (task) {
      slateNode.nodes = [
        {
          object: 'text',
          key: `${slateNode.key}-t`,
          leaves: [
            {
              object: 'leaf',
              text: task.snapshot.title,
            },
          ],
        },
      ];
    }

    if (oldSlateNode) {
      for (let i = 0; i < oldSlateNode.nodes.size; i++) {
        const oldChild = oldSlateNode.nodes.get(i);
        if (oldChild.key && oldChild.key.startsWith('ui-')) {
          slateNode.nodes.push(slateNodeToJS(oldChild));
        }
      }
    }

    return slateNode;
  }
}

function slateNodeToJS(node) {
  const obj = node.toJS();

  const copyKeys = (jsNode, orig) => {
    if (orig.key) {
      jsNode.key = orig.key;
    }
    if (jsNode.object === 'text') {
      return;
    }
    for (let i = 0; i < jsNode.nodes.length; i++) {
      copyKeys(jsNode.nodes[i], orig.nodes.get(i));
    }
  };
  copyKeys(obj, node);
  return obj;
}

export default class CFDSSerializer {
  constructor(cfdsClient) {
    this._serializers = [
      new TaskNodeSerializer({
        get: (id, ...args) => {
          const key = `notes/${id}`;
          if (cfdsClient.hasDoc(key)) {
            return {
              key: id,
              snapshot: createCfdsProxy(
                cfdsClient,
                key,
                cfdsClient.getDocSync(key)
              ),
            };
          }

          return null;
        },
      }),
      new BlockNodeSerializer(),
      new DynamicNodeSerializer(),
    ];
  }
  serialize(value) {
    const root = Node.dynamic({ key: value.document.key });
    const nodes = value.document.nodes;
    for (let i = 0; i < nodes.size; i++) {
      const child = this.serializeNode(nodes.get(i), value.document);
      if (child) {
        root.appendChild(child);
      }
    }

    return root;
  }

  serializeNode(node, parentNode) {
    for (let i = 0; i < this._serializers.length; i++) {
      const serializer = this._serializers[i];
      if (serializer.shouldSerializeNode(node)) {
        return serializer.serializeNode(
          node,
          parentNode,
          this.serializeNode.bind(this)
        );
      }
    }
  }

  deserialize(rootNode, currentValue) {
    const nodes = [];
    const includedKeys = [];
    for (let i = 0; i < rootNode.children.length; i++) {
      const child = rootNode.children[i];
      let correspondingNode;
      if (currentValue && child.props.key) {
        correspondingNode = currentValue.document.getNode(child.props.key);
      }
      const node = this.deserializeNode(
        child,
        rootNode,
        correspondingNode,
        includedKeys
      );
      if (node) {
        nodes.push(node);
      }
    }

    const value = {
      object: 'value',
      document: {
        object: 'document',
        key: currentValue ? currentValue.document.key : uniqueId(),
        data: {},
        nodes: nodes.length
          ? nodes
          : [
            {
              object: 'block',
              type: 'line',
              nodes: [
                {
                  object: 'text',
                  leaves: [
                    {
                      type: 'leaf',
                      text: '',
                    },
                  ],
                },
              ],
            },
          ],
      },
    };

    let slateValue = Value.fromJSON(value);

    if (currentValue) {
      slateValue = slateValue.setSelection(currentValue.selection);
    }

    return {
      value: slateValue,
      includedKeys,
    };
  }

  deserializeNode(node, parentNode, slateNode, includedKeys) {
    for (let i = 0; i < this._serializers.length; i++) {
      const serializer = this._serializers[i];
      if (serializer.shouldDeserializeNode(node, parentNode)) {
        return serializer.deserializeNode(
          node,
          parentNode,
          this.deserializeNode.bind(this),
          slateNode,
          includedKeys
        );
      }
    }
  }
}
