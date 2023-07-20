/*
 * This file contains the data structure and supporting functions for handling
 * rich text documents. A document is represented as a tree similar to an XML
 * tree.
 *
 * ==========================================================================
 *                                 Node Types
 * ==========================================================================
 *
 * Element:
 * --------
 *
 * Element nodes are containers for other nodes. Think <div>, <p>, <span>, etc.
 * Elements can contain both other elements and value nodes as their children.
 *
 * Elements have properties which are collaborative. Different clients can
 * simultaneously edit different keys in the props dict. This can lead to
 * unexpected results if you try to "think in XML". Instead you should maintain
 * the following best practices:
 *
 * 1. Properties should have consistent value types. If you need to "mix"
 *    different types, use some prefix to namespace your keys.
 *
 * 2. It's OK to have meaningless keys in your props dict.
 *    For example, let's say that we have a <list type="ordered"> element.
 *    User A changes the element's tag to "p", while User B in parallel changes
 *    type to be "unordered". The merged result in this case would be
 *    <p type="unordered">. If you gacefully ignore that meaningless type prop
 *    everything just works. Live with that.
 *
 * 3. Semantically wrong documents happen all the time. Expect to have any kind
 *    of element as a child of any other element, and be prepared to draw
 *    something meaningful to the user. Luckily, browers are already pretty
 *    good at handling semantically wrong HTML so you can simply convert the
 *    doc to HTML as-is, and let the browser handle everything.
 *
 * Text:
 * -----
 *
 * Text nodes are value nodes and can not have any children. Text nodes hold
 * actual characters, as well as a list of user defined markers that apply to
 * the entire string. For example the word "foo" in bold would be represented as
 * a Text node, where the text node's text is "foo", and a "bold" marker is
 * applied over that text. Unlike in HTML, we don't use containers to apply
 * styling.
 *
 * For example the following HTML:
 * <p>
 *  <b>foo<u>bar</u></b>
 * </p>
 *
 * Would be the following tree:
 * Element { tag: "p" }
 *  - Text: "foo", markers: ["b"]
 *  - Text: "bar", markers: ["b", "u"]
 *
 *
 *
 * Note: Text nodes are fake and are provided as a convenience. The real atoms
 * behind the scenes are individual characters. This means the text nodes before
 * and after a patch operation may and will differ from the original tree.
 * Because of that text nodes have some limitations on the data they hold.
 * See the class docs for details.
 *
 * Embed:
 * ------
 *
 * Embed nodes hold values other than text. Like Text nodes, Emebeds are always
 * leaves. Embed nodes have a data (JSON) object that defines them. Two embed
 * nodes are considered equal if and only if their data objects are equal.
 *
 * An embed can't be edited simultaneously by different clients. Conceptually,
 * embeds act like single characters (atoms). Any change in an embed's data
 * results in a delete + insert operation while performing a diff.
 *
 *
 * ==========================================================================
 *                                 Local Data
 * ==========================================================================
 *
 * It's often needed to keep some part of the tree local to the client. A common
 * use case is two-step insertion UI where the user types in a special trigger
 * (like the '@' character), some interaction is performed outside of the
 * editer (a popup that appeared in place, etc), then finally the edit is
 * confirmed and the document is updated. To keep the "half-performed" action
 * from being synced to other users, the data is being kept locally until the
 * final confirmation by the user.
 *
 * There are two mechanisms available for keeping data locally:
 *
 * 1. Local nodes. Any node that has its local field set to true, will not be
 *    synced to other clients.
 *
 * 2. Local props. These are key-value pairs attached to the node which can be
 *    used to store user-defined data. Caching, temp unique ids, etc.
 *    Note: Local props are supported only by elements and embeds. Text nodes
 *    don't support local props.
 *
 * As a convenience, an "id" field is provided by elements and embeds, which
 * assignes a unique, local, id to the nodes. It's guaranteed to always return
 * a value and never be empty.
 *
 *
 * ==========================================================================
 *                             Depth Preservation
 * ==========================================================================
 *
 * We like to think of nodes in a tree using a parent-children relationship.
 * While convenient for manipulationg trees, this relationship is hard to
 * maintain in a realtime collaborative system. It's also not very
 * representative of the user's actual intention, and reflects more on the
 * developer's design choices.
 *
 * Instead, our approach is similar to code indentation and how text editors
 * work in practice. Rather than preserve the parent of a node, we try to
 * preserve the *depth* of a node as much as possible, and gracefully "collapse"
 * nodes to a smaller depth as needed.
 */
/* eslint-disable */
import stableStringify from 'json-stable-stringify';

import Utils from '@ovvio/base/lib/utils';
import { AnnotationMap } from './annotations-map';
import * as LegacyDecoders from './legacy-rt-decoders';
import * as JSCompress from './js-compress';

export const TYPE_ELEMENT = 'elem';
export const TYPE_TEXT = 'txt';
export const TYPE_EMBED = 'embd';

const CACHE_KEY_DEPTH = 'depth';
const CACHE_KEY_KEY = 'key';
const CACHE_KEY_MARKERS = 'markers';
const CACHE_KEY_SUBTREE_LEN = 'vislen';

const ANN_PREFIX_LOCAL = '_local:';
const ANN_PREFIX_PROP = '_prop:';
const ANN_PREFIX_MARK = '_mark:';

export const ANN_KEY_TAG = '_tag';
const ANN_KEY_LOCL_NODE = '_localNode';
export const ANN_KEY_NODE_ID = 'local_key';

export const BLAME_UID = 'uid';
export const BLAME_TS = 'ts';
export const BLAME_LOC = 'loc';

export const NS_PROPS = 'props';
export const NS_PTRS = 'ptrs';

const EMPTY_GENERATOR = (function* () {})();

export function isAnnKeyLocal(key) {
  return key.startsWith(ANN_PREFIX_LOCAL) || key.startsWith(ANN_KEY_LOCL_NODE);
}

/**
 * Base class for all nodes in a RichText document. Node itself is an abstract
 * base class.
 */
export class Node {
  constructor() {
    this._children = [];
    this._parent = null;
    this._annMap = null;
    this._pointerMap = null;
    this._cache = null;
    if (this.allowsLocalProps) {
      this.id;
    }
  }

  /**
   * Returns an array of child nodes. You should never manipulate this array
   * directly. Always use (or add as needed) proper mutation methods that
   * correctly handle cache invalidation.
   */
  get children() {
    return this._children;
  }

  /**
   * Returns the parent of this node or null if its a root node.
   */
  get parent() {
    return this._parent;
  }

  /**
   * Returns the root of this node's tree.
   */
  get root() {
    let node = this;
    while (node.parent) {
      node = node.parent;
    }
    return node;
  }

  /**
   * Returns whether the node is local to this client and shouldn't be sent to
   * other parties in the collaborative space.
   */
  get local() {
    return Boolean(this.annMap.getValue(ANN_KEY_LOCL_NODE, 0));
  }

  /**
   * Sets the local flag of this node.
   */
  set local(flag) {
    Utils.assert(this.allowsLocalProps);
    if (flag) {
      this.annMap.setValue(ANN_KEY_LOCL_NODE, 0, true);
    } else {
      this.annMap.deleteValue(ANN_KEY_LOCL_NODE, 0);
    }
  }

  /**
   * Returns the AnnotationMap of this node. Normally you shouldn't manipulate
   * it directly but use dedicated higher level methods. Direct access is
   * reserved for subclasses.
   *
   * This map refers only to this node and its contents, and excludes children
   * and parents. For non-text nodes the length of the map is 1.
   */
  get annMap() {
    if (!this._annMap) {
      this._annMap = new AnnotationMap();
    }
    return this._annMap;
  }

  /**
   * Returns the ann map for pointers of this node. Prefer to interact with
   * higher level abstractions than with the map directly.
   */
  get ptrMap() {
    if (!this._pointerMap) {
      this._pointerMap = new AnnotationMap();
    }
    return this._pointerMap;
  }

  /**
   * Returns the depth of this node where the root is at depth 0.
   */
  get depth() {
    const cache = this.cache;
    if (cache.has(CACHE_KEY_DEPTH)) {
      return cache.get(CACHE_KEY_DEPTH);
    }
    const d = this.parent ? this.parent.depth + 1 : 0;
    cache.set(CACHE_KEY_DEPTH, d);
    return d;
  }

  /**
   * Returns a string that can be used for equality checks with other nodes.
   * Used when performing a diff when encoding the tree as atoms for comparison.
   */
  get key() {
    const cache = this.cache;
    if (cache.has(CACHE_KEY_KEY)) {
      return cache.get(CACHE_KEY_KEY);
    }
    const obj = {};
    this.encodeForKey(obj);
    const key = stableStringify(obj);
    cache.set(CACHE_KEY_KEY, key);
    return key;
  }

  get id() {
    let id = this.getLocalProp('id');
    if (!id) {
      id = Utils.uniqueId();
      this.setLocalProp('id', id);
    }
    return id;
  }

  set id(id) {
    this.setLocalProp('id', id);
  }

  /**
   * Returns the length of the node if it was an encoded as an atoms array.
   * For all nodes but TextNode, the length is 1.
   */
  get length() {
    return 1;
  }

  /**
   * Returns the effective length of this node including all its children.
   */
  get subtreeLength() {
    const cache = this.cache;
    let len = cache.get(CACHE_KEY_SUBTREE_LEN);
    if (!len) {
      let len = this.length;
      for (const child of this.children) {
        len += child.subtreeLength;
      }
      cache.set(CACHE_KEY_SUBTREE_LEN, len);
    }
    return len;
  }

  /**
   * A convenience getter for detecting element nodes.
   */
  get isElement() {
    return this.type === TYPE_ELEMENT;
  }

  get isEmbed() {
    return this.type === TYPE_EMBED;
  }

  get isText() {
    return this.type === TYPE_TEXT;
  }

  /**
   * Returns whether this subtree has any text or embed nodes with contents.
   */
  get hasContents() {
    for (const [node] of this.dfs()) {
      const type = node.type;
      if (type === TYPE_EMBED || (type === TYPE_TEXT && node.text.length)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns whether local props are allowed for this node.
   */
  get allowsLocalProps() {
    return true;
  }

  /**
   * A node may choose to manage its own internal selection. If this getter
   * returns a SelectionManager instance, it'll be used instead of direct
   * pointer access.
   *
   * Currently only Embed nodes override the selection manager.
   */
  get selectionManager() {
    return null;
  }

  /**
   * Returns whether this node is nullish and holds zero information. Null
   * nodes are automatically stripped away during tree normalization.
   */
  get isNull() {
    // debugger;
    return (
      (this.isElement &&
        !this.annMap.countKeys(key => !isAnnKeyLocal(key)) &&
        !this.hasContents) ||
      (this.isText && !this.text)
    );
  }

  _mapForNamespace(ns) {
    return ns === NS_PTRS ? this.ptrMap : this.annMap;
  }

  /**
   * Sets a property that stays local to this client and won't get synced to
   * other parties.
   */
  setLocal(ns, key, value, idx = 0) {
    Utils.assert(ns !== NS_PROPS || this.allowsLocalProps);
    this._mapForNamespace(ns).setValue(ANN_PREFIX_LOCAL + key, idx, value);
  }

  /**
   * Returns the value of a local propery.
   */
  getLocal(ns, key, idx = 0) {
    return this._mapForNamespace(ns).getValue(ANN_PREFIX_LOCAL + key, idx);
  }

  *localEntriesForKey(ns, key) {
    const realKey = ANN_PREFIX_LOCAL + key;
    const annMap = this._mapForNamespace(ns);
    for (const idx of annMap.sortedIndexesForKey()) {
      yield [key, idx, annMap.getValue(realKey, idx)];
    }
  }

  /**
   * Deletes a local property.
   */
  deleteLocal(ns, key, idx = 0) {
    Utils.assert(ns !== NS_PROPS || this.allowsLocalProps);
    this._mapForNamespace(ns).deleteValue(ANN_PREFIX_LOCAL + key, idx);
  }

  /**
   * Returns a snapshot of all local props and their values as an object.
   */
  getLocalObj(ns, idx = 0) {
    const prefixLen = ANN_PREFIX_LOCAL.length;
    return this._mapForNamespace(ns).getDataAtIndex(
      idx,
      k => k.startsWith(ANN_PREFIX_LOCAL),
      k => k.substring(prefixLen)
    );
  }

  /**
   * Set multiple local props as an object. Replaces all existing local props
   * with the key-value pairs in the provided object.
   */
  setLocalObj(ns, props, idx = 0) {
    Utils.assert(ns !== NS_PROPS || this.allowsLocalProps);
    this._mapForNamespace(ns).clearRange(idx, idx + 1, k =>
      k.startsWith(ANN_PREFIX_LOCAL)
    );
    for (const k of Object.keys(props)) {
      this.setLocal(ns, k, props[k]);
    }
  }

  /**
   * Sets a property that stays local to this client and won't get synced to
   * other parties.
   */
  setLocalProp(key, value) {
    this.setLocal(NS_PROPS, key, value);
  }

  /**
   * Returns the value of a local propery.
   */
  getLocalProp(key) {
    return this.getLocal(NS_PROPS, key);
  }

  /**
   * Deletes a local property.
   */
  deleteLocalProp(key) {
    this.deleteLocal(NS_PROPS, key);
  }

  /**
   * Returns a snapshot of all local props and their values as an object.
   */
  getLocalPropsObj() {
    return this.getLocalObj(NS_PROPS);
  }

  /**
   * Set multiple local props as an object. Replaces all existing local props
   * with the key-value pairs in the provided object.
   */
  setLocalPropsObj(props) {
    this.setLocalObj(NS_PROPS, props);
  }

  /**
   * Returns the internal Map instance used for caching. Access is reserved for
   * instances only.
   */
  get cache() {
    if (!this._cache) {
      this._cache = new Map();
    }
    return this._cache;
  }

  /**
   * Invalidates the internal cache. All methods that perform relevant mutations
   * must call this method.
   */
  invalidateCaches() {
    if (this._cache) {
      this._cache = null;
    }
  }

  invalidateAncestorCaches() {
    let parent = this.parent;
    while (parent) {
      parent.invalidateCaches();
      parent = parent.parent;
    }
  }

  invalidateDescendantCaches() {
    for (const c of this.children) {
      c.invalidateCaches();
      c.invalidateDescendantCaches();
    }
  }

  // ==================================== //
  // ========== Tree Mutations ========== //
  // ==================================== //

  /**
   * Appends a child node to the end of the children array.
   */
  appendChild(child) {
    Utils.assert(this.allowsChildren());
    Utils.assert(!child.parent);
    this.children.push(child);
    child._parent = this;
    child.invalidateCaches();
    child.invalidateDescendantCaches();
  }

  insertChild(idx, child) {
    Utils.assert(this.allowsChildren());
    Utils.assert(!child.parent);
    this.children.splice(idx, 0, child);
    child._parent = this;
    child.invalidateCaches();
    child.invalidateDescendantCaches();
  }

  /**
   * Detaches a child from this node, making it available for attachment to
   * a new parent.
   */
  detachChild(childIdx) {
    Utils.assert(this.allowsChildren());
    Utils.assert(childIdx >= 0 && childIdx < this.children.length);
    const child = this.children[childIdx];
    child._parent = null;
    this.children.splice(childIdx, 1);
    child.invalidateCaches();
    child.invalidateDescendantCaches();
    return child;
  }

  /**
   * Normalize this subtree by removing any null nodes.
   */
  normalize() {
    for (let i = 0; i < this.numberOfChildren; ++i) {
      this.childAtIndex(i).normalize();
    }
    const parent = this.parent;
    if (parent && this.isNull) {
      parent.detachChild(parent.indexOfChild(this));
    }
  }

  // ==================================== //
  // ========== Tree Traversal ========== //
  // ==================================== //

  get numberOfChildren() {
    return this.children.length;
  }

  /**
   * Returns the index of a given child.
   */
  indexOfChild(child) {
    Utils.assert(child.parent === this);
    return this.children.indexOf(child);
  }

  childAtIndex(idx) {
    return this.children[idx];
  }

  firstLeaf() {
    const children = this.children;
    if (!children.length) {
      return this;
    }
    return children[0].firstLeaf();
  }

  lastLeaf() {
    const children = this.children;
    const len = children.length;
    if (!len) {
      return this;
    }
    return children[len - 1].lastLeaf();
  }

  lastElement() {
    let result = this.isElement ? this : null;
    for (const [n] of this.dfs()) {
      if (n.isElement) {
        result = n;
      }
    }
    return result;
  }

  back() {
    const parent = this.parent;
    if (parent) {
      const myIdx = parent.indexOfChild(this);
      const childCount = parent.numberOfChildren;
      if (myIdx > 0) {
        return parent.childAtIndex(myIdx - 1).lastLeaf();
      }
    }
    return parent;
  }

  next() {
    if (this.numberOfChildren) {
      return this.childAtIndex(0);
    }

    let node = this;
    do {
      const parent = node.parent;
      if (parent) {
        const myIdx = parent.indexOfChild(node);
        const childCount = parent.numberOfChildren;
        if (myIdx < childCount - 1) {
          return parent.childAtIndex(myIdx + 1);
        }
      }
      node = parent;
    } while (node);

    return null;
  }

  dfs() {
    if (!this._children.length) {
      return EMPTY_GENERATOR;
    }
    return this._dfsImpl.apply(this, arguments);
  }

  /**
   * Iterates over the children of this node in DFS order.
   *
   * @param copy If true, it'll make internal copies of the state during
   *             iteration, allowing the caller to make mutations on the go.
   *
   * @param _depth Don't use. Used as part of the recursion state.
   *
   * @yields Arrays of [node, depth] pairs.
   */
  *_dfsImpl(copy = false, _depth = 0) {
    if (!this._children.length) {
      return;
    }
    ++_depth;
    const arr = copy ? Array.from(this._children) : this._children;
    for (const child of arr) {
      yield [child, _depth];
      for (const v of child.dfs(copy, _depth)) {
        yield v;
      }
    }
  }

  // ==================================== //
  // =========== By Value Ops =========== //
  // ==================================== //

  toJS(local) {
    const result = {};
    this.encodeToObject(result, local);
    return result;
  }

  static fromJS(obj) {
    const cls = TYPE_CLS_MAP[obj.type];
    Utils.assert(cls);
    const result = new cls();
    result.decodeFromObject(obj);
    return result;
  }

  /**
   * Returns a copy of this node. If shallow is false, the returned copy will
   * be a part of a full copy of its tree. If shallow is true, the cloned node
   * will be detached from its parent and children.
   */
  clone(shallow = false, _clone_parent = true) {
    const result = new this.constructor();
    result.copyFrom(this);
    if (!shallow) {
      if (_clone_parent) {
        result._parent = this.parent ? this.parent.clone(shallow) : null;
      }
      for (const child of this.children) {
        result.appendChild(child.clone(shallow, false));
      }
    }
    return result;
  }

  /**
   * Returns whether this node is equal to other node. This method doesn't
   * consider parents nor children. For tree equality use treesEqual().
   */
  isEqual(other, local) {
    if (!other) {
      return false;
    }
    if (this.type !== other.type) {
      return false;
    }
    if (!this.isEquivalent(other)) {
      return false;
    }
    const keyFilter = local ? k => true : k => !isAnnKeyLocal(k);
    return (
      this.isEquivalent(other) &&
      this.annMap.isEqual(other.annMap, keyFilter) &&
      this.ptrMap.isEqual(other.ptrMap, keyFilter)
    );
  }

  /**
   * Returns whether this node is equivalent to other node as an atoms, that is
   * ignoring annotations, pointers and other collaborative content this node
   * may hold. Used during diffing.
   */
  isEquivalent(other) {
    if (this === other) {
      return true;
    }
    if (!other) {
      return false;
    }
    return this.key === other.key;
  }

  // ==================================== //
  // ====== Methods for Subclasses ====== //
  // ==================================== //

  // Override in subclasses
  get type() {
    Utils.notImplemented();
  }

  /**
   * Used to enforce a bunch of edge cases. Override in your subclasses as
   * needed.
   */
  allowsChildren() {
    return true;
  }

  /**
   * Encodes this node to a plain object for purposes of generating a key
   * representative of the node's purpose. Used during diffing.
   *
   * Don't call this method directly. Instead, use the key property of the node
   * which builds on this method.
   */
  encodeForKey(outObj) {
    outObj.type = this.type;
    outObj.local = this.local;
  }

  /**
   * Encodes a node to a plain object for purposes of serialization. If local
   * is false, local data won't be encoded.
   *
   * Don't call this method directly. Instead use toJS().
   */
  encodeToObject(outObj, local) {
    outObj.type = this.type;
    const keyFilter = local ? k => true : k => !k.startsWith(ANN_PREFIX_LOCAL);
    if (this.annMap.hasKeys(keyFilter)) {
      outObj.annMap = this.annMap.toJS(keyFilter);
    }
    if (!this.ptrMap.isEmpty()) {
      outObj.ptrMap = this.ptrMap.toJS();
    }
  }

  /**
   * Decodes a previously encoded node.
   *
   * Don't call this method directly. Instead use fromJS().
   */
  decodeFromObject(obj) {
    if (obj.annMap) {
      const annMap = AnnotationMap.fromJS(obj.annMap);
      this.annMap.clear();
      this.annMap.update(annMap);
    }
    if (obj.ptrMap) {
      const annMap = AnnotationMap.fromJS(obj.ptrMap);
      this.ptrMap.clear();
      this.ptrMap.update(annMap);
    }

    if (obj.local) {
      this.local = Boolean(obj.local);
    }
    if (this.allowsLocalProps && obj.localProps) {
      this.setLocalPropsObj(obj.localProps);
    }
  }

  /**
   * Copy values from otherNode to this.
   *
   * Don't call this method directly. Use clone() instead.
   */
  copyFrom(otherNode) {
    Utils.assert(this.type === otherNode.type);
    // this.annMap.clear();
    // this.annMap.update(otherNode.annMap);
    this._annMap = otherNode.annMap.clone();
    // this.ptrMap.clear();
    // this.ptrMap.update(otherNode.ptrMap);
    this._ptrMap = otherNode.ptrMap.clone();
    this.invalidateCaches();
  }

  toChecksum(checksum, local, endObject = true) {
    checksum.startObject();
    checksum.appendKey('type');
    checksum.appendValue(this.type);
    checksum.appendKey('annMap');
    this.annMap.toChecksum(
      checksum,
      local ? k => true : k => !k.startsWith(ANN_PREFIX_LOCAL)
    );
    checksum.appendKey('ptrMap');
    this.ptrMap.toChecksum(
      checksum,
      local ? k => true : k => !k.startsWith(ANN_PREFIX_LOCAL)
    );
    if (endObject) {
      checksum.endObject();
    }
  }

  appendContents(otherNode) {
    return false;
  }
}

export class ElementNode extends Node {
  get type() {
    return TYPE_ELEMENT;
  }

  get tagName() {
    return this.annMap.getValue(ANN_KEY_TAG, 0);
  }

  set tagName(tag) {
    this.annMap.setValue(ANN_KEY_TAG, 0, tag);
  }

  getValueForKey(key) {
    return this.annMap.getValue(ANN_PREFIX_PROP + key, 0);
  }

  setValueForKey(key, value) {
    this.implicit = false;
    this.annMap.setValue(ANN_PREFIX_PROP + key, 0, value);
  }

  deleteValueForKey(key) {
    this.annMap.deleteValue(ANN_PREFIX_PROP + key, 0);
  }

  getProps() {
    const result = {};
    const annMap = this.annMap;
    const prefixLen = ANN_PREFIX_PROP.length;
    for (const k of annMap.keys(key => key.startsWith(ANN_PREFIX_PROP))) {
      const v = annMap.getValue(k, 0);
      if (!Utils.isNoValue(v)) {
        result[k.substring(prefixLen)] = v;
      }
    }
    return result;
  }

  setProps(props) {
    const annMap = this.annMap;
    for (const k of Array.from(
      annMap.keys(key => key.startsWith(ANN_PREFIX_PROP))
    )) {
      annMap.deleteMap(k);
    }

    for (const k of Object.keys(props)) {
      annMap.setValue(ANN_PREFIX_PROP + k, 0, props[k]);
    }
    this.implicit = false;
  }

  // Backwards compatibility
  decodeFromObject(obj) {
    super.decodeFromObject(obj);
    if (obj.props) {
      this.setProps(obj.props);
    }
  }
}

export class ValueNode extends Node {
  allowsChildren() {
    return false;
  }
}

export class TextNode extends ValueNode {
  constructor(text) {
    super();
    this._text = text || '';
  }

  get type() {
    return TYPE_TEXT;
  }

  get allowsLocalProps() {
    return false;
  }

  get text() {
    return this._text || '';
  }

  set text(txt) {
    txt = txt || '';
    if (txt !== this._text) {
      this._text = txt;
      this.clearMarkers();
    }
  }

  get length() {
    return this.text.length;
  }

  clearMarkers() {
    const annMap = this.annMap;
    annMap.clearRange(0, Number.MAX_SAFE_INTEGER, k =>
      k.startsWith(ANN_PREFIX_MARK)
    );
  }

  setMarkers(markers) {
    const annMap = this.annMap;
    const textLen = this.text.length;

    this.clearMarkers();
    for (const key of markers) {
      for (let idx = 0; idx < textLen; ++idx) {
        annMap.setValue(ANN_PREFIX_MARK + key, idx, true);
      }
    }
    this.cache.set(CACHE_KEY_MARKERS, markers);
  }

  getMarkers() {
    const cache = this.cache;
    if (cache.has(CACHE_KEY_MARKERS)) {
      return cache.get(CACHE_KEY_MARKERS);
    }
    const result = Array.from(
      this.annMap.keys(k => k.startsWith(ANN_PREFIX_MARK))
    );
    const prefixLen = ANN_PREFIX_MARK.length;
    for (let idx = 0; idx < result.length; ++idx) {
      result[idx] = result[idx].substring(prefixLen);
    }
    result.sort();
    cache.set(CACHE_KEY_MARKERS, result);
    return result;
  }

  isEqual(other) {
    return super.isEqual(other) && this.text === other.text;
  }

  encodeToObject(outObj) {
    super.encodeToObject(outObj);
    outObj.text = this.text;
  }

  decodeFromObject(obj) {
    super.decodeFromObject(obj);
    this._text = obj.text;
    // Backwards compatibility
    if (obj.markers) {
      this.setMarkers(obj.markers);
    }
  }

  copyFrom(otherNode) {
    super.copyFrom(otherNode);
    this._text = otherNode.text;
  }

  toChecksum(checksum, local, endObject = true) {
    super.toChecksum(checksum, local, false);
    checksum.appendKey('text');
    checksum.appendValue(this.text);
    if (endObject) {
      checksum.endObject();
    }
  }

  appendContents(otherNode) {
    if (!otherNode.isText) {
      return false;
    }
    const markers = this.getMarkers();
    if (!Utils.deepEqual(markers, otherNode.getMarkers())) {
      return false;
    }
    const startIdx = this._text.length;
    this._text += otherNode.text;
    const textLen = this._text.length;
    for (const key of markers) {
      for (let idx = startIdx; idx < textLen; ++idx) {
        annMap.setValue(ANN_PREFIX_MARK + key, idx, true);
      }
    }
    this.ptrMap.update(otherNode.ptrMap, startIdx);
    return true;
  }
}

export class EmbedNode extends ValueNode {
  constructor(data = {}) {
    super();
    this._data = data;
    this._selectionManager = null;
  }

  get type() {
    return TYPE_EMBED;
  }

  get tagName() {
    return this.data[ANN_KEY_TAG];
  }

  set tagName(tag) {
    this.data[ANN_KEY_TAG];
  }

  get data() {
    return this._data;
  }

  set data(data) {
    data = data || {};
    if (this._data !== data) {
      this._data = Utils.deepCopy(data, true);
    }
    this.invalidateCaches();
  }

  get selectionManager() {
    return this._selectionManager;
  }

  isEqual(other) {
    return super.isEqual(other) && Utils.deepEqual(this.data, other.data);
  }

  encodeForKey(outObj) {
    super.encodeForKey(outObj);
    outObj.data = this.data;
  }

  encodeToObject(outObj) {
    super.encodeToObject(outObj);
    outObj.data = Utils.deepCopy(this.data, true);
  }

  decodeFromObject(obj) {
    super.decodeFromObject(obj);
    this.data = Utils.deepCopy(obj.data, true);
  }

  copyFrom(otherNode) {
    super.copyFrom(otherNode);
    this.data = Utils.deepCopy(otherNode.data, true);
    this.repr = otherNode.repr;
  }

  toChecksum(checksum, local, endObject = true) {
    super.toChecksum(checksum, local, false);
    checksum.appendKey('data');
    checksum.appendValue(this.data);
    if (endObject) {
      checksum.endObject();
    }
  }
}

export class Builder {
  constructor(parent = null) {
    if (!parent) {
      parent = new ElementNode();
    }
    this.currentParent = parent;
  }

  get root() {
    return this.currentParent.root;
  }

  openElement(props = {}, localProps = {}, local = false) {
    const node = new ElementNode();
    node.local = local;
    if (props[ANN_KEY_NODE_ID]) {
      node.id = props[ANN_KEY_NODE_ID];
      delete props[ANN_KEY_NODE_ID];
    }
    if (props[ANN_KEY_TAG]) {
      node.tagName = props[ANN_KEY_TAG];
      delete props[ANN_KEY_TAG];
    }
    node.setProps(props);
    for (const [key, value] of Object.entries(localProps)) {
      node.setLocalProp(key, value);
    }
    this.currentParent.appendChild(node);
    this.currentParent = node;

    return node;
  }

  closeElement() {
    Utils.assert(this.currentParent.parent, 'Unbalanced call to close()');
    this.currentParent = this.currentParent.parent;
    return this.currentParent;
  }

  appendText(text, marks = []) {
    const node = new TextNode();
    node.text = text;
    node.setMarkers(marks);
    this.currentParent.appendChild(node);
    return node;
  }

  appendEmbed(data, local = false) {
    const node = new EmbedNode();
    node.local = local;
    if (data[ANN_KEY_NODE_ID]) {
      node.id = data[ANN_KEY_NODE_ID];
      delete data[ANN_KEY_NODE_ID];
    }
    // if (data[ANN_KEY_TAG]) {
    //   node.tagName = data[ANN_KEY_TAG];
    //   delete data[ANN_KEY_TAG];
    // }
    node.data = data;
    this.currentParent.appendChild(node);

    return node;
  }

  appendTree(node) {
    switch (node.type) {
      case TYPE_ELEMENT:
        this.openElement(node.props, node.localProps, node.local);
        for (const child of node.children) {
          this.appendTree(child);
        }
        this.closeElement();
        return this.currentParent;

      case TYPE_EMBED:
        return this.appendEmbed(node.data, node.local);

      case TYPE_TEXT:
        return this.appendText(node.text, node.getMarkers());

      default:
        Utils.Error.notReached('Unknown node type: ' + node.type);
    }
  }

  clone() {
    return new this.constructor(this.currentParent.clone());
  }
}

/**
 * Performs deep equality on two trees comparing them node by node.
 */
export function treesEqual(tree1, tree2, local) {
  let iter1 = tree1.dfs();
  let iter2 = tree2.dfs();
  while (true) {
    const v1 = iter1.next();
    const v2 = iter2.next();
    if (Boolean(v1.done) !== Boolean(v2.done)) {
      return false;
    }

    if (
      v1.value &&
      (v1.value[1] !== v2.value[1] || !v1.value[0].isEqual(v2.value[0], local))
    ) {
      return false;
    }
    if (v1.done) {
      break;
    }
  }
  return true;
}

function _xmlAttrsFromObj(obj) {
  const keys = Object.keys(obj).sort();
  let outStr = '';
  for (const k of keys) {
    outStr += `${k}="${obj[k]}" `;
  }
  return outStr;
}

export function encodeXML(
  root,
  local = true,
  indent = '    ',
  defaultTag = 'div'
) {
  let outStr = '<xml>';
  let prevDepth = 0;
  let pendingClosingElements = ['</xml>'];
  for (const [node, depth] of root.dfs()) {
    if (!local && node.local) {
      continue;
    }

    while (pendingClosingElements.length > depth) {
      outStr += '\n';
      outStr += indent.repeat(pendingClosingElements.length - 1);
      outStr += pendingClosingElements.pop();
      outStr += '\n';
    }
    const indentText = indent.repeat(depth);
    outStr += '\n';
    switch (node.type) {
      case TYPE_EMBED: {
        outStr += `${indentText}<${node.tagName || 'embed'} ${_xmlAttrsFromObj(
          node.data
        )}`;
        if (local) {
          outStr += _xmlAttrsFromObj(node.getLocalPropsObj());
        }
        outStr += '/>';
        break;
      }

      case TYPE_TEXT: {
        const markers = node.getMarkers();
        outStr += `${indentText}<span`;
        if (markers.length) {
          outStr += ` class="${markers.join(', ')}"`;
        }
        outStr += `>${node.text}</span>`;
        break;
      }

      case TYPE_ELEMENT: {
        const tagName = node.tagName || defaultTag;
        outStr += `${indentText}<${tagName} ${_xmlAttrsFromObj(
          node.getProps()
        )}`;
        if (local) {
          outStr += _xmlAttrsFromObj(node.getLocalPropsObj());
        }
        outStr += `>`;
        pendingClosingElements.push(`</${tagName}>`);
        break;
      }
    }
  }

  while (pendingClosingElements.length) {
    outStr += '\n';
    outStr += indent.repeat(pendingClosingElements.length - 1);
    outStr += pendingClosingElements.pop();
  }

  return outStr;
}

function _encodeJSImpl(root, local) {
  const result = root.toJS(local);
  if (root.allowsChildren()) {
    const children = [];
    for (const child of root.children) {
      if (local || !child.local) {
        children.push(_encodeJSImpl(child, local));
      }
    }
    result.children = children;
  }
  return result;
}

export function encodeJS(root, local, compress = true) {
  let encodedTree = _encodeJSImpl(root, local);
  if (compress) {
    encodedTree = JSCompress.deflate(encodedTree);
  }
  return {
    version: 1,
    root: encodedTree,
  };
}

function _toChecksumImpl(root, checksum, local) {
  root.toChecksum(checksum, local, false);
  if (root.allowsChildren()) {
    checksum.appendKey('children');
    checksum.startArray();
    for (const child of root.children) {
      if (local || !child.local) {
        _toChecksumImpl(child, checksum, local);
      }
    }
    checksum.endArray();
  }
  checksum.endObject();
}

// Expects a RollingChecksum instance
export function toChecksum(root, checksum, local) {
  checksum.startObject();
  checksum.appendKey('v');
  checksum.appendValue(1);
  checksum.appendKey('r');
  checksum.startArray();
  _toChecksumImpl(root, checksum, local);
  checksum.endArray();
  checksum.endObject();
}

function _decodeJSImpl(obj) {
  const result = Node.fromJS(obj);
  if (obj.children) {
    for (const c of obj.children) {
      result.appendChild(_decodeJSImpl(c));
    }
  }
  return result;
}

export function decodeJS(obj) {
  if (obj.version === 1 || (!obj.version && obj.root)) {
    let root = obj.root;
    if (JSCompress.isDeflatedObject(root)) {
      root = JSCompress.inflate(root);
    }
    root = _decodeJSImpl(root);
    root.normalize();
    return root;
  } else {
    return LegacyDecoders.V0Decoder.parse(obj);
  }
}

const TYPE_CLS_MAP = {
  [TYPE_ELEMENT]: ElementNode,
  [TYPE_TEXT]: TextNode,
  [TYPE_EMBED]: EmbedNode,
};
