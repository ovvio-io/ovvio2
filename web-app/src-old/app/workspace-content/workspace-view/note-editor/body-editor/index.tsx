import React, { MouseEvent, useImperativeHandle } from 'react';
import { Node } from 'https://esm.sh/slate@0.87.0';
import { Editable, Slate } from 'https://esm.sh/slate-react@0.87.1';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import { Note } from '../../../../../../../cfds/client/graph/vertices/note.ts';
import { usePartialVertex } from '../../../../../core/cfds/react/vertex.ts';
import { useBodyEditor } from '../../../../../core/slate/index.tsx';
import { EditableCardContext } from '../../../../../core/slate/elements/card.element/index.tsx';
import { SelectionUtils } from '../../../../../core/slate/utils/selection-utils.ts';
import { styleguide } from '../../../../../../../styles/styleguide.ts';
import {
  makeStyles,
  cn,
} from '../../../../../../../styles/css-objects/index.ts';
import { FocusReporter } from '../focus-reporter.tsx';
import { FloatingMenu } from './floating-menu.tsx';
import TaskCtaView from './task-cta-view.tsx';
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';

const useStyles = makeStyles((theme) => ({
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
  className?: string;
  isRtl?: boolean;
}
export interface EditorHandle {
  focus: () => void;
}

export default React.forwardRef<EditorHandle, BodyProps>(function BodyView(
  { cardManager, className, isRtl },
  ref
) {
  const styles = useStyles();
  const placeholder = usePlaceholder(cardManager);
  const { editor, plugins, handlers } = useBodyEditor(cardManager);
  const logger = useLogger();
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
    logger.log({
      severity: 'INFO',
      event: 'Click',
      source: 'editor:task-cta',
      vertex: cardManager.key,
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
            <FocusReporter cardManager={cardManager} source="editor:body" />
            <Editable
              {...plugins}
              tabIndex={1}
              placeholder={placeholder}
              // onFocus={e => {
              //   if (!editor.selection) {
              //     e.preventDefault();
              //   }
              // }}
              onClick={(e) => e.stopPropagation()}
            />
            <FloatingMenu rootManager={cardManager} />
            <TaskCtaView onClick={onCtaClick} />
          </Slate>
        </EditableCardContext>
      </React.StrictMode>
    </div>
  );
});
