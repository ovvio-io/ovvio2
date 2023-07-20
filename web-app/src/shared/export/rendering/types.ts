import { TreeNode } from '@ovvio/cfds/lib/richtext/tree';
import { GraphManager } from '@ovvio/cfds/lib/client/graph/graph-manager';
import { Workspace } from '@ovvio/cfds/lib/client/graph/vertices';

export interface RenderProps {
  node: TreeNode;
  children: any;
  attributes: any;
  graph: GraphManager;
  workspace: Workspace;
}

export interface NodeRenderer {
  renderNode(props: RenderProps, next: () => any): any;
  css(): string;
}

export function isNodeRenderer(val: any): val is NodeRenderer {
  return typeof val === 'object' && typeof val.renderNode === 'function';
}

export interface PlainTextRenderer {
  renderPlainText(props: RenderProps, next: () => any): any;
}

export function isPlainTextRenderer(val: any): val is PlainTextRenderer {
  return typeof val === 'object' && typeof val.renderPlainText === 'function';
}

export interface Renderer extends NodeRenderer, PlainTextRenderer {}
