import {
  Builder,
  ANN_KEY_TAG,
  ANN_KEY_NODE_ID,
} from '@ovvio/cfds/lib/primitives/richtext-tree2';
import { RichText } from '@ovvio/cfds/lib/primitives/richtext2';
import { ANN_KEY_TASK_REF } from './serializer2';

export function element(tagName, props, children) {
  if (!children) {
    if (Array.isArray(props)) {
      children = props;
      props = {};
    } else {
      children = [];
    }
  } else if (!Array.isArray(children)) {
    children = [children];
  }
  props = props || {};
  props[ANN_KEY_TAG] = tagName;

  if (props.key) {
    props[ANN_KEY_NODE_ID] = props.key;
    delete props.key;
  }
  return {
    object: 'element',
    props,
    children,
  };
}

export function text(text, marks = []) {
  return {
    object: 'text',
    text,
    marks,
  };
}

export function embed(tagName, data = {}) {
  data[ANN_KEY_TAG] = tagName;

  return {
    object: 'embed',
    data: data,
  };
}

export function task(taskId) {
  if (!taskId.startsWith('notes/')) {
    taskId = `notes/${taskId}`;
  }
  return embed('task', { [ANN_KEY_TASK_REF]: taskId });
}

export function line(str) {
  return element('line', {}, text(str));
}

export function h1(str) {
  return element('h1', {}, text(str));
}

export function h2(str) {
  return element('h2', {}, text(str));
}

export function h3(str) {
  return element('h3', {}, text(str));
}

export function newLine() {
  return element('line', {});
}

export function document(...children) {
  const builder = new Builder();

  const serializeNode = node => {
    switch (node.object) {
      case 'text': {
        return builder.appendText(node.text, node.marks);
      }
      case 'element': {
        builder.openElement(node.props);
        for (const child of node.children) {
          serializeNode(child);
        }
        builder.closeElement();
        break;
      }
      case 'embed': {
        return builder.appendEmbed(node.data);
      }
      default: {
        throw new Error();
      }
    }
  };

  for (const child of children) {
    serializeNode(child);
  }

  return new RichText(builder);
}

export function emptyDocument() {
  return document(newLine());
}
