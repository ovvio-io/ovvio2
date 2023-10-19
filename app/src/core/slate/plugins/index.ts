import { KeyboardEventHandler } from 'react';
import { NodeEntry, Range } from 'slate';
import { RenderElementProps, RenderLeafProps } from 'slate-react';
import { coreValueEquals } from '../../../../../base/core-types/equals.ts';

type PropType<T, K extends keyof T> = T[K];

function createTypeguard<T extends Partial<Plugin>>(
  key: keyof T
): (handler: Partial<Plugin> | undefined) => handler is T {
  return ((handler: Partial<Plugin> | undefined) =>
    handler && key in handler) as unknown as (
    handler: Partial<Plugin> | undefined
  ) => handler is T;
}

function slateAttributesEquals(
  prev: PropType<RenderElementProps, 'attributes'>,
  next: PropType<RenderElementProps, 'attributes'>
): boolean {
  return (
    prev['data-slate-node'] === next['data-slate-node'] &&
    prev['data-slate-inline'] === next['data-slate-inline'] &&
    prev['data-slate-void'] === next['data-slate-void'] &&
    prev['dir'] === next['dir'] &&
    prev['ref'] === next['ref']
  );
}

export function areElementPropsEqual(
  prevProps: RenderElementProps,
  nextProps: RenderElementProps
) {
  return (
    coreValueEquals(prevProps.element, nextProps.element) &&
    slateAttributesEquals(prevProps.attributes, nextProps.attributes)
  );
}

export interface KeyDownHandler {
  onKeyDown: KeyboardEventHandler;
}

const isKeyDownHandler = createTypeguard<KeyDownHandler>('onKeyDown');

export interface RenderElementHandler {
  renderElement: (props: RenderElementProps) => JSX.Element | null | undefined;
}

const isRenderElementHandler =
  createTypeguard<RenderElementHandler>('renderElement');

export interface RenderLeafHandler {
  renderLeaf: (props: RenderLeafProps) => JSX.Element | null;
}

const isRenderLeafHandler = createTypeguard<RenderLeafHandler>('renderLeaf');

export interface DecorateHandler {
  decorate: (entry: NodeEntry) => Range[];
}
const isDecorateHandler = createTypeguard<DecorateHandler>('decorate');

export type Plugin = KeyDownHandler &
  RenderElementHandler &
  RenderLeafHandler &
  DecorateHandler;

export type PluginStack = KeyDownHandler & {
  renderElement: (props: RenderElementProps) => JSX.Element;
  renderLeaf: (props: RenderLeafProps) => JSX.Element;
};

export function mergePlugins(plugins: (Partial<Plugin> | undefined)[]): Plugin {
  const keyboardHandlers = plugins.filter(isKeyDownHandler);
  const renderers = plugins.filter(isRenderElementHandler);
  const leafRenderers = plugins.filter(isRenderLeafHandler);
  const decorators = plugins.filter(isDecorateHandler);

  return {
    onKeyDown(event) {
      for (const handler of keyboardHandlers) {
        handler.onKeyDown(event);
        if (event.defaultPrevented) {
          return;
        }
      }
    },
    renderElement(props) {
      for (const renderer of renderers) {
        const el = renderer.renderElement(props);
        if (el) {
          return el;
        }
      }
    },
    renderLeaf(props) {
      for (const renderer of leafRenderers) {
        const el = renderer.renderLeaf(props);
        if (el) {
          return el;
        }
      }
      return null;
    },
    decorate(entry) {
      return decorators.reduce((ranges, decorator) => {
        return ranges.concat(decorator.decorate(entry));
      }, [] as Range[]);
    },
  };
}

export function createPluginStack(
  plugins: (Partial<Plugin> | undefined)[]
): PluginStack {
  const merged = mergePlugins(plugins);
  const { renderElement, renderLeaf } = merged;
  return {
    ...merged,
    renderElement(props) {
      const el = renderElement(props);
      if (!el) {
        throw new Error('No default renderer defined');
      }
      return el;
    },
    renderLeaf(props) {
      const el = renderLeaf(props);
      if (!el) {
        throw new Error('No default leaf renderer defined');
      }
      return el;
    },
  };
}
