import baseRenderers from './default-renderers';
import { uniqueId } from '@ovvio/base/lib/utils';
import { Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import {
  isElementNode,
  RichText,
  TreeNode,
} from '@ovvio/cfds/lib/richtext/tree';
import { GraphManager } from '@ovvio/cfds/lib/client/graph/graph-manager';
import {
  isNodeRenderer,
  isPlainTextRenderer,
  NodeRenderer,
  PlainTextRenderer,
} from './types';
import React from 'react';

export class RichtextRenderer {
  private _plainTextRenderers: PlainTextRenderer[];
  private _nodeRenderers: NodeRenderer[];

  constructor(renderers: (PlainTextRenderer | NodeRenderer)[] = []) {
    renderers = [...baseRenderers, ...renderers];
    this._plainTextRenderers = renderers.filter(x =>
      isPlainTextRenderer(x)
    ) as PlainTextRenderer[];
    this._nodeRenderers = renderers.filter(x =>
      isNodeRenderer(x)
    ) as NodeRenderer[];
  }

  _renderPlainText(node: TreeNode, graph: GraphManager, workspace: Workspace) {
    let i = this._plainTextRenderers.length - 1;

    let children: string = '';
    if (isElementNode(node)) {
      children = node.children
        .map(c => this._renderPlainText(c, graph, workspace))
        .join('');
    }

    const attributes = {
      key: uniqueId(),
    };
    const next = () => {
      const renderer = this._plainTextRenderers[i];
      i--;
      return renderer.renderPlainText(
        {
          node,
          attributes,
          children,
          graph,
          workspace,
        },
        next
      );
    };

    return next();
  }

  _renderNode(node: TreeNode, graph: GraphManager, workspace: Workspace) {
    let i = this._nodeRenderers.length - 1;

    let children: any;
    if (isElementNode(node)) {
      children = node.children.map(c => this._renderNode(c, graph, workspace));
    }

    const attributes = {
      key: uniqueId(),
    };
    const next = () => {
      const renderer = this._nodeRenderers[i];
      i--;
      return renderer.renderNode(
        {
          node,
          attributes,
          children,
          graph,
          workspace,
        },
        next
      );
    };

    return next();
  }

  css() {
    return this._nodeRenderers
      .filter(x => x.css)
      .map(x => x.css())
      .join('\n\n');
  }

  renderPlainText(
    rt: RichText | undefined,
    graph: GraphManager,
    workspace: Workspace
  ) {
    if (!rt) return '';
    return this._renderPlainText(rt.root, graph, workspace);
  }
  renderHtml(
    rt: RichText | undefined,
    graph: GraphManager,
    workspace: Workspace
  ) {
    return {
      style: this.css(),
      content: rt ? this._renderNode(rt.root, graph, workspace) : <div />,
    };
  }
}
