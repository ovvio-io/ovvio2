import React, {
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Editor, Element, Path } from "slate";
import { ReactEditor, useSlate, useSlateStatic } from "slate-react";
import { VertexManager } from "../../../../../../../cfds/client/graph/vertex-manager.ts";
import { Note } from "../../../../../../../cfds/client/graph/vertices/note.ts";
import { layout, styleguide } from "../../../../../../../styles/index.ts";
import { Button } from "../../../../../../../styles/components/buttons.tsx";
import {
  IconBold,
  IconBulletList,
  IconItalic,
  IconNumberList,
  IconStrikethrough,
  IconTask,
  IconUnderline,
} from "../../../../../../../styles/components/icons/index.ts";
import { Tooltip } from "../../../../../../../styles/components/tooltip/index.tsx";
import {
  cn,
  makeStyles,
} from "../../../../../../../styles/css-objects/index.ts";
import { useCurrentUser } from "../../../../../core/cfds/react/vertex.ts";
import {
  AllowedElementType,
  ALLOWED_ELEMENTS,
  CardElement,
} from "../../../../../core/slate/elements/card.element/index.tsx";
import { LeafUtils } from "../../../../../core/slate/plugins/leaves.tsx";
import { FormattedText } from "../../../../../core/slate/types.ts";
import {
  ElementUtils,
  NodeToggleStatus,
} from "../../../../../core/slate/utils/element-utils.ts";
import { ListUtils } from "../../../../../core/slate/utils/list-utils.ts";
import { SelectionUtils } from "../../../../../core/slate/utils/selection-utils.ts";
import { TreeNode } from "../../../../../../../cfds/richtext/tree.ts";
import { useLogger } from "../../../../../core/cfds/react/logger.tsx";

const useStyles = makeStyles((theme) => ({
  menu: {
    position: "absolute",
    bottom: styleguide.gridbase * 3,
    height: styleguide.gridbase * 5,
    left: "50%",
    transform: `translate(-50%, ${styleguide.gridbase * 3}px)`,
    backgroundColor: theme.background[800],
    color: theme.background[0],
    border: `1px solid ${theme.background[100]}`,
    padding: [0, styleguide.gridbase * 0.5],
    borderRadius: 6,
    opacity: 0,
    ...styleguide.transition.short,
    transitionProperty: "opacity transform",
    alignItems: "center",
    userSelect: "none",
    basedOn: [layout.row],
  },
  visible: {
    opacity: 1,
    transform: "translateX(-50%)",
  },
  menuButton: {
    color: theme.background[0],
    width: styleguide.gridbase * 10,
    height: "100%",
    userSelect: "none",
  },
  icon: {
    userSelect: "none",
  },
  separator: {
    height: `calc(100% - ${styleguide.gridbase * 2}px)`,
    width: 1,
    backgroundColor: theme.background[100],
  },
  active: {
    color: theme.primary[500],
  },
}));

const HEADER_MAP = {
  h1: {
    button: "H1",
    tooltip: "Heading 1",
  },
  h2: {
    button: "H2",
    tooltip: "Heading 2",
  },
};

function HeaderButton({
  editor,
  headerType,
}: {
  editor: Editor;
  headerType: "h1" | "h2";
}) {
  const styles = useStyles();
  const { selection } = editor;
  const isActive =
    selection &&
    ElementUtils.getNodeToggleStatus(
      editor,
      selection,
      (node) => Element.isElement(node) && node.tagName === headerType
    ) === NodeToggleStatus.On;
  const otherTags = useMemo(
    () => ALLOWED_ELEMENTS.filter((x) => x !== headerType),
    [headerType]
  );

  const onClick = (e: MouseEvent) => {
    e.preventDefault();

    ElementUtils.toggleNode(
      editor,
      selection!,
      { tagName: headerType },
      (node: TreeNode) =>
        Element.isElement(node) &&
        (node.tagName === headerType ||
          !(otherTags as string[]).includes(node.tagName)),
      {
        match: (n: TreeNode) =>
          Element.isElement(n) &&
          (ALLOWED_ELEMENTS as string[]).includes(n.tagName),
      }
    );
  };
  const texts = HEADER_MAP[headerType];
  return (
    <Tooltip text={texts.tooltip}>
      <Button
        className={cn(styles.menuButton, isActive && styles.active)}
        onClick={onClick}
      >
        {texts.button}
      </Button>
    </Tooltip>
  );
}

function makeMarkButton(
  mark: keyof FormattedText,
  tooltip: string,
  IconComponent: React.ElementType<{ fill: string; className?: string }>
) {
  return ({ marks }: { marks: Omit<FormattedText, "text"> }) => {
    const styles = useStyles();
    const isActive = marks && marks[mark];
    const editor = useSlateStatic();
    const handler = useCallback(
      (e: MouseEvent) => {
        e.preventDefault();
        ReactEditor.focus(editor);
        setTimeout(() => {
          ReactEditor.focus(editor);
          LeafUtils.toggleMark(editor, editor.selection!, mark);
        }, 0);
      },
      [editor]
    );
    return (
      <Tooltip text={tooltip}>
        <Button
          className={cn(styles.menuButton, isActive && styles.active)}
          onClick={handler}
        >
          <IconComponent fill="currentColor" className={cn(styles.icon)} />
        </Button>
      </Tooltip>
    );
  };
}

const BoldButton = makeMarkButton("bold", "Bold", IconBold);
const ItalicButton = makeMarkButton("italic", "Italic", IconItalic);
const StrikethroughButton = makeMarkButton(
  "strikethrough",
  "Strikethrough",
  IconStrikethrough
);
const UnderlineButton = makeMarkButton("underline", "Underline", IconUnderline);

enum TaskButtonState {
  Hidden,
  Visible,
  Active,
}

function TaskButton({
  isVisible,
  rootManager,
  setVisible,
}: {
  isVisible: boolean;
  setVisible: (visible: boolean) => void;
  rootManager: VertexManager<Note>;
}) {
  const styles = useStyles();
  const editor = useSlate();
  const user = useCurrentUser();
  const { selection } = editor;
  const logger = useLogger();

  const selectionState = useMemo(() => {
    if (!isVisible) {
      return TaskButtonState.Hidden;
    }
    const entry = ElementUtils.getSingleElement(editor);
    if (!entry) {
      return TaskButtonState.Hidden;
    }
    const [node] = entry;
    if (CardElement.isCard(node)) {
      return TaskButtonState.Active;
    }
    if (CardElement.canTransformToCard(node)) {
      return TaskButtonState.Visible;
    }
    return TaskButtonState.Hidden;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, selection]);

  useEffect(() => {
    setVisible(selectionState !== TaskButtonState.Hidden);
  }, [selectionState, setVisible]);

  if (selectionState === TaskButtonState.Hidden) {
    return null;
  }

  const handler = () => {
    if (selectionState === TaskButtonState.Active) {
      CardElement.unwrapCard(editor, editor.selection!.focus.path);
    } else {
      const [node, path] =
        ElementUtils.getSingleElement<AllowedElementType>(editor)!;
      CardElement.replaceAsCard(editor, node, path, rootManager, user);
    }
  };

  return (
    <Tooltip text="Task">
      <Button
        className={cn(
          styles.menuButton,
          selectionState === TaskButtonState.Active && styles.active
        )}
        onClick={handler}
      >
        <IconTask fill="currentColor" className={cn(styles.icon)} />
      </Button>
    </Tooltip>
  );
}

const LIST_MAP = {
  ol: {
    Icon: IconNumberList,
    tooltip: "Numbered List",
  },
  ul: {
    Icon: IconBulletList,
    tooltip: "Bullet List",
  },
};

function ListButton({
  editor,
  listType,
  setVisible,
}: {
  editor: Editor;
  listType: "ul" | "ol";
  setVisible: (visible: boolean) => void;
}) {
  const styles = useStyles();
  const list = useMemo(() => LIST_MAP[listType], [listType]);
  const { selection } = editor;
  const [el, path] = SelectionUtils.extractSingleElement(editor, selection);

  const isParagraph =
    path && Path.isChild(path, []) && el && el.tagName === "p";
  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    // const nodes = Editor.nodes(editor, {
    //   at: selection,
    //   mode: 'highest',
    //   match: n => !Editor.isEditor(n),
    // });
    // for (const [node, path] of nodes) {
    ListUtils.setList(editor, path!, listType);
    // }
  };
  useEffect(() => {
    setVisible(isParagraph === true);
  }, [isParagraph, setVisible]);
  if (!isParagraph) {
    return null;
  }
  return (
    <Tooltip text={list.tooltip}>
      <Button className={cn(styles.menuButton)} onClick={onClick}>
        <list.Icon fill="currentColor" className={cn(styles.icon)} />
      </Button>
    </Tooltip>
  );
}

export const FloatingMenu = React.memo(
  ({ rootManager }: { rootManager: VertexManager<Note> }) => {
    const styles = useStyles();
    const editor = useSlate();
    // const focused = useThrottledFocused();
    const [listsVisible, setListsVisible] = useState<
      [boolean, boolean, boolean]
    >([false, false, false]);

    const setVisible = (index: number, visible: boolean) => {
      setListsVisible((current) => {
        const v = current.concat();
        if (v[index] === visible) {
          return current;
        }
        v[index] = visible;
        return v as [boolean, boolean, boolean];
      });
    };

    const handleClick = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      ReactEditor.focus(editor);
    };
    const marks = Editor.marks(editor) || {};

    const showSeparator = listsVisible.some((x) => x);

    return (
      <div className={cn(styles.menu, styles.visible)} onClick={handleClick}>
        <HeaderButton editor={editor} headerType="h1" />
        <HeaderButton editor={editor} headerType="h2" />
        <div className={cn(styles.separator)} />
        <BoldButton marks={marks} />
        <ItalicButton marks={marks} />
        <UnderlineButton marks={marks} />
        <StrikethroughButton marks={marks} />
        {showSeparator && <div className={cn(styles.separator)} />}
        <ListButton
          editor={editor}
          listType="ol"
          setVisible={(x) => setVisible(0, x)}
        />
        <ListButton
          editor={editor}
          listType="ul"
          setVisible={(x) => setVisible(1, x)}
        />
        <TaskButton
          isVisible={true}
          rootManager={rootManager}
          setVisible={(x) => setVisible(2, x)}
        />
      </div>
    );
  }
);
