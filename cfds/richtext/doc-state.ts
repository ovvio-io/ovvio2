import { CoreObject } from '../../base/core-types/index.ts';
import {
  RichText,
  Pointer,
  ElementNode,
  TextNode,
  isPointer,
  dfs,
  TreeNode,
  isTextNode,
  PointerDirection,
  Point,
  PointerType,
} from './tree.ts';
import { assert, notReached } from '../../base/error.ts';
import { TreeKeys } from './tree-keys.ts';
import { PointerValue, projectPointers } from './flat-rep.ts';
import { Dictionary } from '../../base/collections/dict.ts';

export interface Range extends CoreObject {
  anchor: Point;
  focus: Point;
  isLocal?: boolean;
  expiration?: Date;
}

export interface DocumentRanges extends CoreObject {
  [key: string]: Range;
}

export interface UnkeyedDocument extends CoreObject {
  root: ElementNode;
  ranges?: DocumentRanges;
}

export interface Document extends UnkeyedDocument {
  nodeKeys: TreeKeys;
}

export function docFromRT(rt: RichText | UnkeyedDocument): Document {
  const result: Document = {
    root: rt.root,
    nodeKeys: new TreeKeys(rt.root),
  };

  // if (rt.ranges !== undefined) {
  //   result.ranges = rt.ranges as DocumentRanges;
  // }

  if (rt.pointers !== undefined) {
    result.ranges = composeRanges(rt);
  }

  return result;
}

export function docToRT(doc: RichText | UnkeyedDocument): RichText {
  const result: RichText = {
    root: doc.root,
  };
  // if (doc.pointers !== undefined) {
  //   result.pointers = doc.pointers as Set<Pointer>;
  // }
  if (doc.ranges !== undefined) {
    const pointers = decomposeRanges(doc);
    if (pointers.size > 0) {
      result.pointers = pointers;
    }
  }
  return result;
}

export function isDocument(doc: UnkeyedDocument): doc is Document {
  return doc.nodeKeys instanceof TreeKeys;
}

export function unkeyedDocToDoc(doc: UnkeyedDocument): Document {
  if (isDocument(doc)) {
    return doc;
  }
  return {
    ...doc,
    nodeKeys: new TreeKeys(doc.root),
  };
}

function findLastTextNode(rt: RichText): TextNode {
  let textNode: TextNode | undefined;
  for (const [node] of dfs(rt.root)) {
    if (isTextNode(node)) {
      textNode = node;
    }
  }
  if (textNode === undefined) {
    notReached('No text nodes found in tree');
  }
  return textNode;
}

function findFirstTextNode(rt: RichText): TextNode {
  for (const [node] of dfs(rt.root)) {
    if (isTextNode(node)) {
      return node;
    }
  }
  notReached('No text nodes found in tree');
}

export function composeRanges(rt: RichText): DocumentRanges {
  const result: DocumentRanges = {};
  if (rt.pointers === undefined) {
    return result;
  }
  let lastTextNode: TextNode | undefined;
  let firstTextNode: TextNode | undefined;
  for (const ptr of rt.pointers) {
    if (isPointer(ptr)) {
      // Skip expired pointers
      // if (ptr.expiration && ptr.expiration.getTime() < now) {
      //   continue;
      // }
      let range = result[ptr.key];
      if (range === undefined) {
        if (ptr.type === 'anchor') {
          if (ptr.dir === PointerDirection.Forward) {
            if (lastTextNode === undefined) {
              lastTextNode = findLastTextNode(rt);
            }
            range = {
              anchor: {
                node: ptr.node,
                offset: ptr.offset,
              },
              focus: {
                node: lastTextNode,
                offset: lastTextNode.text.length,
              },
            };
          } else if (ptr.dir === PointerDirection.Backward) {
            if (firstTextNode === undefined) {
              firstTextNode = findFirstTextNode(rt);
            }
            range = {
              anchor: {
                node: ptr.node,
                offset: ptr.offset,
              },
              focus: {
                node: firstTextNode,
                offset: 0,
              },
            };
          }
        } else {
          assert(ptr.type === 'focus');
          if (ptr.dir === PointerDirection.Backward) {
            if (lastTextNode === undefined) {
              lastTextNode = findLastTextNode(rt);
            }
            range = {
              anchor: {
                node: lastTextNode,
                offset: lastTextNode.text.length,
              },
              focus: {
                node: ptr.node,
                offset: ptr.offset,
              },
            };
          } else if (ptr.dir === PointerDirection.Forward) {
            if (firstTextNode === undefined) {
              firstTextNode = findFirstTextNode(rt);
            }
            range = {
              anchor: {
                node: firstTextNode,
                offset: 0,
              },
              focus: {
                node: ptr.node,
                offset: ptr.offset,
              },
            };
          }
        }
        if (range === undefined) {
          assert(ptr.dir === PointerDirection.None);
          range = {
            anchor: {
              node: ptr.node,
              offset: ptr.offset,
            },
            focus: {
              node: ptr.node,
              offset: ptr.offset,
            },
          };
        }
        // Update in resulting map
        result[ptr.key] = range;
      } else {
        // Update an existing range entry
        // TODO(ofri): Only allow expansion of the range
        range[ptr.type] = {
          node: ptr.node,
          offset: ptr.offset,
        };
      }

      // Bump expiration up if needed
      if (
        ptr.expiration &&
        (range.expiration === undefined ||
          range.expiration.getTime() < ptr.expiration.getTime())
      ) {
        range.expiration = ptr.expiration;
      }
      // Copy local flag
      if (ptr.isLocal) {
        range.isLocal = true;
      }
    }
  }
  return result;
}

function nodesByFlatIndexes(rt: RichText): Dictionary<TreeNode, number> {
  const result = new Map<TreeNode, number>();
  let idx = 0;
  for (const [node] of dfs(rt.root)) {
    result.set(node, idx);
    if (isTextNode(node)) {
      idx += node.text.length;
    }
    idx += 1;
  }
  return result;
}

export function decomposeRanges(doc: UnkeyedDocument): Set<Pointer> {
  if (doc.ranges === undefined) {
    return new Set();
  }
  const result = new Set<Pointer>();
  // const now = Date.now();
  const nodesToIndexes = nodesByFlatIndexes({ root: doc.root });
  for (const [key, range] of Object.entries(doc.ranges)) {
    // if (range.expiration !== undefined && range.expiration.getTime() < now) {
    //   continue;
    // }
    const anchorOffset = nodesToIndexes.get(range.anchor.node)!;
    const focusOffset = nodesToIndexes.get(range.focus.node)!;
    const dir =
      anchorOffset < focusOffset
        ? PointerDirection.Forward
        : anchorOffset > focusOffset
        ? PointerDirection.Backward
        : PointerDirection.None;
    result.add(buildRangePointer(key, range, 'anchor', dir));
    result.add(buildRangePointer(key, range, 'focus', dir));
  }
  return result;
}

function buildRangePointer(
  key: string,
  range: Range,
  type: PointerType,
  dir: PointerDirection
): Pointer {
  const result: Pointer = {
    key,
    type,
    dir,
    node: range[type].node,
    offset: range[type].offset,
  };
  if (range.expiration !== undefined) {
    result.expiration = range.expiration;
  }
  if (range.isLocal) {
    result.isLocal = true;
  }
  return result;
}

export interface RangeFilter {
  (key: string): boolean;
}

/**
 * Given two documents, this function projects pointers from the source to
 * destination doc, adjusting for any edits that happened between the two docs.
 *
 * Use this function before updating a note's body to project ranges other than
 * the ones you've changed.
 *
 * @param src Source document
 * @param dst Destination document. This function updates the destination in
 *            place.
 * @returns The updated destination document.
 */
export function projectRanges(
  src: UnkeyedDocument,
  dst: UnkeyedDocument,
  filter: (ptr: PointerValue) => boolean
): Document {
  if (src.ranges === undefined) {
    return unkeyedDocToDoc(dst);
  }
  return unkeyedDocToDoc(
    docFromRT(projectPointers(docToRT(src), docToRT(dst), filter))
  );
}

function nodePathToIndexPath(
  root: ElementNode,
  nodePath: readonly ElementNode[]
): number[] {
  const result: number[] = [];
  let parent: ElementNode = root;
  for (const element of nodePath) {
    const idx = parent.children.indexOf(element);
    assert(idx >= 0);
    result.push(idx);
    parent = element;
  }
  return result;
}

export function pointToPath(
  document: UnkeyedDocument,
  point: Point
): { path: number[]; offset: number } {
  for (const [node, _depth, path] of dfs(document.root)) {
    if (node === point.node) {
      const indexPath = nodePathToIndexPath(document.root, path);
      indexPath.push(path[path.length - 1].children.indexOf(node));
      return {
        path: indexPath,
        offset: point.offset,
      };
    }
  }
  notReached();
}

// interface ProjectionContext {
//   diff: Diff[];
//   offsetsMap1: OrderedMap<TreeNode, number>;
//   offsetsMap2: OrderedMap<TreeNode, number>;
// }

// /**
//  * Converts a pointer from source to destination documents based on a given
//  * projection context.
//  *
//  * @param ctx The projection context
//  * @param ptr The pointer to project.
//  * @returns A projected pointer
//  */
// function projectPoint(ctx: ProjectionContext, ptr: Point): Point {
//   // Convert the relative pointer to an absolute index
//   let targetOffset = pointToAbsOffset(ctx.offsetsMap1, ptr);
//   // Project the index based on the previously computed diff(src -> dst)
//   targetOffset = kDMP.diff_xIndex(ctx.diff, targetOffset);
//   // Convert back to offset relative to dst doc
//   const result = pointFromAbsOffset(ctx.offsetsMap2, targetOffset);
//   if (ptr.isLocal) {
//     result.isLocal = true;
//   }
//   return result;
// }
