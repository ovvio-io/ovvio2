import { Scroller, useScrollParent } from 'core/react-utils/scrolling';
import React, {
  JSXElementConstructor,
  KeyboardEventHandler,
  MouseEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Node, Transforms } from 'slate';
import { RenderElementProps, useSelected, useSlateStatic } from 'slate-react';
import { layout, styleguide } from '@ovvio/styles/lib';

import PopperView from '@ovvio/styles/lib/components/popper';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { MentionElement } from '.';
import { CfdsEditor } from '../cfds/with-cfds';
import { isKeyPressed } from '../utils/hotkeys';

const useStyles = makeStyles(theme => ({
  scroller: {
    maxHeight: styleguide.gridbase * 40,
    overflowY: 'auto',
  },
  suggestionItem: {
    // height: styleguide.gridbase * 7,
    minWidth: styleguide.gridbase * 25,
    padding: styleguide.gridbase * 2,
    boxSizing: 'border-box',
    fontSize: 14,
    alignItems: 'center',
    backgroundColor: theme.background[0],
    transform: `backgroundColor linear ${styleguide.transition.duration.short}ms`,
    ':hover': {
      backgroundColor: '#f7f9ff',
    },
    userSelect: 'none',
    basedOn: [layout.row],
  },
  suggestionIcon: {
    marginRight: styleguide.gridbase,
    basedOn: [layout.column, layout.centerCenter],
  },
  selected: {
    backgroundColor: theme.background[500],
  },
  anchor: {
    display: 'inline-block',
  },
  popperShadow: {
    boxShadow: theme.shadows.z2,
  },
}));

export interface RenderMentionPopupProps<T> {
  filter: string;
  closeMention: () => void;
  SuggestionComponent: JSXElementConstructor<SuggestionComponentProps<T>>;
}

export interface MentionElementNodeProps<T> extends RenderElementProps {
  element: MentionElement;
  trigger: string;
  registerKeyDown: (fn: KeyboardEventHandler) => () => void;
  MentionComponent: JSXElementConstructor<RenderMentionPopupProps<T>>;
}

export interface SuggestionComponentProps<T> {
  items: T[];
  keyForItem: (item: T) => string;
  onItemSelected: (item: T) => void;
  ItemSuggestionComponent: JSXElementConstructor<{
    item: T;
    isSelected: boolean;
    onItemSelected: (item: T) => void;
  }>;
}

export interface MentionSuggestionsProps<T> {
  filter: string;
  selectedIndex: number;
  setLength: (length: number) => void;
  setSelectedItem: (item: T) => void;
}

interface SuggestionItemProps {
  isSelected: boolean;
  children?: React.ReactNode;
  onItemSelected: () => void;
}

export const SuggestionItemIcon: React.FC<{}> = ({ children }) => {
  const styles = useStyles();
  return <div className={cn(styles.suggestionIcon)}>{children}</div>;
};

export function SuggestionItem({
  isSelected,
  children,
  onItemSelected,
}: SuggestionItemProps) {
  const styles = useStyles();
  const ref = useRef();
  const scrollParent = useScrollParent();
  useLayoutEffect(() => {
    if (isSelected && ref.current && scrollParent) {
      // TODO: scroll if necessary
    }
  }, [scrollParent, isSelected]);
  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onItemSelected();
  };
  return (
    <div
      className={cn(styles.suggestionItem, isSelected && styles.selected)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface InnerSuggestionComponentProps<T> extends SuggestionComponentProps<T> {
  registerKeyDown: (fn: KeyboardEventHandler) => () => void;
}

function InnerSuggestionComponent<T>({
  ItemSuggestionComponent,
  items,
  keyForItem,
  registerKeyDown,
  onItemSelected,
}: InnerSuggestionComponentProps<T>) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const length = items.length;
  const selectedItem = useRef(items[selectedIndex]);
  useEffect(() => {
    selectedItem.current = items[selectedIndex];
  }, [items, selectedIndex]);
  useEffect(() => {
    return registerKeyDown(e => {
      switch (e.key) {
        case 'ArrowUp':
        case 'Up': {
          setSelectedIndex(x => (x - 1) % length);
          e.preventDefault();
          break;
        }
        case 'ArrowDown':
        case 'Down': {
          setSelectedIndex(x => (x + 1) % length);
          e.preventDefault();
          break;
        }
        case 'Enter':
        case 'ArrowRight':
        case 'Right': {
          e.preventDefault();
          onItemSelected(selectedItem.current);
          break;
        }
        default: {
          return;
        }
      }
    });
  }, [registerKeyDown, length, onItemSelected]);

  useEffect(() => setSelectedIndex(0), [length]);

  return (
    <React.Fragment>
      {items.map((item, index) => (
        <ItemSuggestionComponent
          key={keyForItem(item)}
          item={item}
          isSelected={index === selectedIndex}
          onItemSelected={() => onItemSelected(item)}
        />
      ))}
    </React.Fragment>
  );
}

export function MentionElementNode<T>({
  attributes,
  trigger,
  element,
  children,
  registerKeyDown,
  MentionComponent,
}: MentionElementNodeProps<T>) {
  const styles = useStyles();
  const anchor = useRef();
  const editor = useSlateStatic();
  const selected = useSelected();
  const [open, setOpen] = useState(false);
  const content = Node.string(element).trim();
  const filter = content.startsWith(trigger)
    ? content.substr(trigger.length).trim()
    : content;
  const contentRef = useRef(content);

  useLayoutEffect(() => {
    setOpen(selected && !!anchor.current);
  }, [selected]);

  const closeMention = useCallback(() => {
    const path = CfdsEditor.findPath(editor, element);
    // Workaround: Apparently under some weird conditions this function gets
    // called more than once, which causes the second execution to clear the
    // editor's contents.
    if (path === undefined || path.length === 0) {
      return;
    }
    Transforms.removeNodes(editor, { at: path });
    editor.activeMention = '';
    editor.discardMention = () => {};
  }, [editor, element]);
  const closeMentionRef = useRef(closeMention);

  useEffect(() => {
    contentRef.current = content;
    closeMentionRef.current = closeMention;
  }, [content, closeMention]);

  useEffect(() => {
    return registerKeyDown(e => {
      if (isKeyPressed(e, 'Backspace') && contentRef.current === trigger) {
        e.preventDefault();
        closeMentionRef.current();
      }
    });
  }, [registerKeyDown, trigger]);

  const SuggestionComponent = useCallback(
    (props: SuggestionComponentProps<T>) => {
      return (
        <InnerSuggestionComponent
          {...props}
          registerKeyDown={registerKeyDown}
        />
      );
    },
    [registerKeyDown]
  );

  return (
    <div {...attributes} className={cn(styles.anchor)}>
      <span ref={anchor}>
        {children}
        <PopperView
          anchor={anchor.current}
          position="bottom"
          align="start"
          contentEditable={false}
          open={open}
          className={cn(styles.popperShadow)}
        >
          <Scroller>
            {ref => (
              <div ref={ref} className={cn(styles.scroller)}>
                <MentionComponent
                  filter={filter}
                  SuggestionComponent={SuggestionComponent}
                  closeMention={closeMention}
                />
              </div>
            )}
          </Scroller>
        </PopperView>
      </span>
    </div>
  );
}
