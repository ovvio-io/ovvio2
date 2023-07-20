import { RichText } from './richtext2';
import { MarkerSet } from './marker-set';

export const TYPE_BLOCK_OLD = 'blk';
export const TYPE_DYNAMIC_OLD = 'dyn';

export const TYPE_BLOCK = 'blk2';
export const TYPE_INLINE = 'inl';
export const TYPE_TEXT = 'txt';
export const TYPE_EMBED = 'emb';

export class V0Decoder {
  static parse(obj) {
    const result = new RichText();
    for (let node of obj.children) {
      this._parseNode(node, result);
    }
    return result.builder.root;
  }

  static _parseNode(node, richtext) {
    const type = node.type;
    switch (type) {
      case TYPE_TEXT:
        richtext.appendText(node.text, MarkerSet.fromJS(node.markers));
        break;

      case TYPE_EMBED: {
        if (node.props.type === 'task' && node.props.key) {
          node.props.taskId = 'notes/' + node.props.key;
          delete node.props.key;
        }
        richtext.appendEmbed(node.props, node.local);
        break;
      }

      case TYPE_INLINE:
      case TYPE_BLOCK_OLD:
        richtext.openInline(node.props, node.local);
        for (let child of node.children) {
          this._parseNode(child, richtext);
        }
        richtext.closeNode();
        break;

      case TYPE_BLOCK:
      case TYPE_DYNAMIC_OLD:
        richtext.openBlock(node.props, node.local);
        for (let child of node.children) {
          this._parseNode(child, richtext);
        }
        richtext.closeNode();
        break;
    }
  }
}
