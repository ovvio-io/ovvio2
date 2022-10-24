import { useStyles as typography } from '@ovvio/styles/lib/components/texts';
import { cn } from '@ovvio/styles/lib/css-objects';
import React from 'react';
import { Editor } from 'slate';
import { ReactEditor, RenderElementProps } from 'slate-react';
import { KeyDownHandler, mergePlugins, Plugin, RenderElementHandler } from '.';
import { ElementUtils } from '../utils/element-utils';
import { isKeyPressed } from '../utils/hotkeys';
import { ListUtils } from '../utils/list-utils';
import { createLeafPlugin } from './leaves';

// const Paragraph = React.forwardRef<HTMLDivElement, RenderElementProps>(
//   ({ attributes, children }, ref) => {
//     return (
//       <div ref={ref} {...attributes} className={cn(className, typography.text)} />
//     );
//   }
// );

const Paragraph = ({ children, attributes }: RenderElementProps) => {
  return (
    <div {...attributes} className={cn(typography.text)}>
      {children}
    </div>
  );
};

export function createBaseRender(
  editor: Editor,
  Component: any = Paragraph
): RenderElementHandler {
  return {
    renderElement(props) {
      // if (props.element.tagName !== 'p') {
      //   console.warn(
      //     'Received unhandled element to base render, rendering as default paragraph',
      //     props.element
      //   );
      // }
      if (props.element.tagName === 'p') {
        return <Component {...props}>{props.children}</Component>;
      }
    },
  };
}
function createNestedContainersHandler(editor: Editor): KeyDownHandler {
  return {
    onKeyDown(e) {
      const isNestedChild = ElementUtils.isSingleElement(
        editor,
        ListUtils.isNestedChild
      );
      if (!isNestedChild) {
        return;
      }
      const [node, path] = Editor.node(editor, editor.selection);
      switch (e.key) {
        case 'Enter':
        case 'Backspace': {
          if (!ElementUtils.isEmpty(node)) {
            return;
          }
          e.preventDefault();
          ListUtils.liftListItem(editor, path);
          break;
        }
        case 'Tab': {
          if (e.shiftKey) {
            e.preventDefault();
            ListUtils.liftListItem(editor, path);
            break;
          }
        }
      }
    },
  };
}

export function createBaseBodyPlugin(editor: Editor): Plugin {
  return mergePlugins([
    createNestedContainersHandler(editor),
    createLeafPlugin(editor),
  ]);
}

export function createBaseTitlePlugin(
  editor: Editor,
  DefaultComponent: any,
  onFocusNext: () => void
): Plugin {
  return mergePlugins([
    {
      onKeyDown(e) {
        if (isKeyPressed(e, 'Enter') || isKeyPressed(e, 'Tab')) {
          ReactEditor.blur(editor);
          e.preventDefault();
          e.stopPropagation();
          window.setTimeout(() => {
            onFocusNext();
          }, 0);
        }
      },
    },
    createBaseRender(editor, DefaultComponent),
    createLeafPlugin(editor),
  ]);
}
