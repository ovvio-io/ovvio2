import React from 'https://esm.sh/react@18.2.0';
import { BaseRange, Editor, Node } from 'https://esm.sh/slate@0.87.0';
import { RenderLeafProps } from 'https://esm.sh/slate-react@0.87.1';
import { makeStyles, cn } from '../../../../../styles/css-objects/index.ts';
import { KeyDownHandler, Plugin } from './index.ts';
import { FormattedText } from '../types.ts';
import {
  getPlatformHotkey,
  Hotkey,
  isHotkeyActive,
  MetaKeys,
  Shortcut,
} from '../utils/hotkeys.ts';

const useStyles = makeStyles(() => ({
  bold: {
    fontWeight: '600',
  },
  underline: {
    textDecoration: 'underline',
  },
  strikethrough: {
    textDecoration: 'line-through',
    '&underline': {
      textDecoration: 'underline line-through',
    },
  },
  italic: {
    fontStyle: 'italic',
  },
}));

const MARK_PROPS = ['bold', 'italic', 'underline', 'strikethrough'];

function Leaf(props: RenderLeafProps) {
  const styles = useStyles();
  const { leaf } = props;
  const classes = cn(MARK_PROPS.map((p) => leaf[p] && styles[p]));

  return (
    <span {...props.attributes} className={classes}>
      {props.children}
    </span>
  );
}

function renderLeaf(props: RenderLeafProps): JSX.Element {
  return <Leaf {...props} />;
}

const BOLD_SHORTCUT: Shortcut = {
  default: {
    metaKeys: [MetaKeys.Meta],
    key: 'b',
  },
};
const ITALIC_SHORTCUT: Shortcut = {
  default: {
    metaKeys: [MetaKeys.Meta],
    key: 'i',
  },
};

const STRIKETHROUGH_SHORTCUT: Shortcut = {
  default: {
    metaKeys: [MetaKeys.Meta],
    key: 's',
  },
};

const UNDERLINE_SHORTCUT: Shortcut = {
  default: {
    metaKeys: [MetaKeys.Meta],
    key: 'u',
  },
};

const handlers: { prop: keyof FormattedText; hotkey: Hotkey }[] = (
  [
    [BOLD_SHORTCUT, 'bold'],
    [ITALIC_SHORTCUT, 'italic'],
    [STRIKETHROUGH_SHORTCUT, 'strikethrough'],
    [UNDERLINE_SHORTCUT, 'underline'],
  ] as [Shortcut, keyof FormattedText][]
).map(([shortcut, prop]) => ({
  prop,
  hotkey: getPlatformHotkey(shortcut),
}));

function createKeyDownHandlers(editor: Editor): KeyDownHandler {
  return {
    onKeyDown(e) {
      for (const handler of handlers) {
        if (isHotkeyActive(e, handler.hotkey)) {
          e.preventDefault();
          e.stopPropagation();
          LeafUtils.toggleMark(editor, editor.selection!, handler.prop);
          return;
        }
      }
    },
  };
}

export function createLeafPlugin(editor: Editor): Partial<Plugin> {
  return {
    renderLeaf,
    ...createKeyDownHandlers(editor),
  };
}

export enum MarkToggleStatus {
  Off,
  Partial,
  On,
}

export const LeafUtils = {
  getMarkStatus(
    editor: Editor,
    at: BaseRange,
    mark: keyof FormattedText
  ): MarkToggleStatus {
    const fragment = Node.fragment(editor, at);
    const leaves = fragment.flatMap((x) =>
      Array.from(Node.texts(x)).map(([text, path]) => [x, text, path])
    );

    let all = true;
    let some = false;

    for (const [, text] of leaves) {
      const markVal = (text as FormattedText)[mark] as boolean;
      all = all && markVal;
      some = some || markVal;
    }
    if (all) {
      return MarkToggleStatus.On;
    }
    if (some) {
      return MarkToggleStatus.Partial;
    }
    return MarkToggleStatus.Off;
  },
  toggleMark(editor: Editor, at: BaseRange, mark: keyof FormattedText) {
    const markStatus = LeafUtils.getMarkStatus(editor, at, mark);
    if (markStatus === MarkToggleStatus.On) {
      Editor.removeMark(editor, mark as string);
    } else {
      Editor.addMark(editor, mark as string, true);
    }
  },
};
