import * as Tree from './richtext-tree2.js';
import * as Diff from './richtext-diff';

export class RichText {
  constructor(builder) {
    this.builder = builder || new Tree.Builder();
  }

  get root() {
    return this.builder.root;
  }

  get nodes() {
    const result = [];
    for (const [node] of this.builder.root.dfs()) {
      result.push(node);
    }
    return result;
  }

  nodesIter() {
    return this.builder.root.dfs();
  }

  *childrenIter() {
    for (const child of this.builder.root.children) {
      yield child;
    }
  }

  clone() {
    return new this.constructor(this.builder.clone());
  }

  isEqual(other, local) {
    return Tree.treesEqual(this.builder.root, other.builder.root, local);
  }

  hasContent() {
    return this.builder.root.hasContents;
  }

  diff(other, local) {
    return Diff.diff(this.builder.root, other.builder.root, local);
  }

  toChecksum(checksum, local) {
    Tree.toChecksum(this.builder.root, checksum, local);
  }

  normalize() {
    this.builder.root.normalize();
  }

  patch(changes1, changes2) {
    const diff = changes1.clone();
    diff.append(changes2);
    this.builder = new Tree.Builder(
      Diff.patch(this.builder.root, diff).lastElement()
    );
    return this;
  }

  toJS(local, compress = true) {
    return Tree.encodeJS(this.builder.root, local, compress);
  }

  static fromJS(obj) {
    return new this(new Tree.Builder(Tree.decodeJS(obj)));
  }
}

export function isTrivialDiff(changes) {
  return Diff.isTrivialDiff(changes);
}

export function emptyDiff() {
  return Diff.RichTextDiff.trivialDiff();
}
