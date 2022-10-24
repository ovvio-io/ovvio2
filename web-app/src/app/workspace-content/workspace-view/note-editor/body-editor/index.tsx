import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Note } from '@ovvio/cfds/lib/client/graph/vertices';
import { usePartialVertex } from 'core/cfds/react/vertex';
import { useBodyEditor } from 'core/slate';
import { EditableCardContext } from 'core/slate/elements/card.element';
import { SelectionUtils } from 'core/slate/utils/selection-utils';
import { useObservable } from 'core/state';
import React, { MouseEvent, useImperativeHandle } from 'react';
import { Node } from 'slate';
import { Editable, Slate } from 'slate-react';
import { CurrentUser } from 'stores/user';
import { styleguide } from '@ovvio/styles/lib';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { EventCategory, useEventLogger } from '../../../../../core/analytics';
import { FocusReporter } from '../focus-reporter';
import { EditorTutorial } from './editor-tutorial';
import { FloatingMenu } from './floating-menu';
import TaskCtaView from './task-cta-view';

const useStyles = makeStyles(theme => ({
  editor: {
    margin: '0 auto',
    boxSizing: 'border-box',
    '::selection': {
      backgroundColor: theme.primary[500],
    },
    '& *': {
      '::selection': {
        backgroundColor: theme.primary[400],
      },
    },
    color: theme.background.text,
  },
  rtl: {
    direction: 'rtl',
    placeholder: {
      right: styleguide.gridbase * 8,
      left: 'unset',
    },
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: styleguide.gridbase * 8,
    color: 'rgba(17, 8, 43, 0.3)',
    height: styleguide.gridbase * 3,
    fontSize: styleguide.gridbase * 2,
    lineHeight: `${styleguide.gridbase * 3}px`,
    pointerEvents: 'none',
  },
}));

// function Placeholder({ card }: { card: Note }) {
//   const pcard = usePartialVertex(card, ['body', 'title']);
//   const body = pcard.body;
//   const title = pcard.title;

//   // if (body.hasContent() || !title.hasContent()) {
//   //   return null;
//   // }

//   return <div className={cn(styles.placeholder)}>Start writing here...</div>;
// }

function usePlaceholder(cardManager: VertexManager<Note>): string {
  const { title } = usePartialVertex(cardManager, ['title']);
  const text = Node.string(title.root as unknown as Node);
  if (!text) {
    return '';
  }

  return 'Start writing here';
}

interface BodyProps {
  cardManager: VertexManager<Note>;
  currentUser: CurrentUser;
  className?: string;
  isRtl?: boolean;
  dispatch: (any) => void;
}
export interface EditorHandle {
  focus: () => void;
}

export default React.forwardRef<EditorHandle, BodyProps>(function BodyView(
  { cardManager, currentUser, className, isRtl, dispatch },
  ref
) {
  const styles = useStyles();
  useObservable(currentUser);
  const placeholder = usePlaceholder(cardManager);
  const { editor, plugins, handlers } = useBodyEditor(cardManager);
  const eventLogger = useEventLogger();
  useImperativeHandle(
    ref,
    () => ({
      focus() {
        SelectionUtils.focusAtEnd(editor);
      },
    }),
    [editor]
  );
  const onCtaClick = () => {
    eventLogger.cardAction('TASK_CTA_CLICKED', cardManager, {
      category: EventCategory.EDITOR,
    });
    SelectionUtils.focusAtEnd(editor);
  };

  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editor.selection) {
      SelectionUtils.focusAtEnd(editor);
    }
  };

  return (
    <div
      className={cn(className, styles.editor, isRtl && styles.rtl)}
      onClick={onClick}
    >
      <React.StrictMode>
        <EditableCardContext cardManager={cardManager}>
          <Slate editor={editor} {...handlers}>
            <FocusReporter cardManager={cardManager} source="body" />
            <Editable
              {...plugins}
              tabIndex={1}
              placeholder={placeholder}
              // onFocus={e => {
              //   if (!editor.selection) {
              //     e.preventDefault();
              //   }
              // }}
              onClick={e => e.stopPropagation()}
            />
            <EditorTutorial />
            <FloatingMenu rootManager={cardManager} />
            <TaskCtaView onClick={onCtaClick} />
          </Slate>
        </EditableCardContext>
      </React.StrictMode>
    </div>
  );
});
