import { useRef, useEffect } from 'react';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { styleguide, layout } from '@ovvio/styles/lib';
import { CreateTagContext, useCreateTag } from 'shared/tags/create-tag-context';
import { Note } from '@ovvio/cfds/lib/client/graph/vertices';
import { useTitleEditor } from 'core/slate';
import { Editable, Slate } from 'slate-react';
import { EditableCardContext } from 'core/slate/elements/card.element';
import { H1 } from '@ovvio/styles/lib/components/texts';
import { CARD_SOURCE } from 'shared/card';
import CardMenuView from 'shared/item-menu';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
// import { useEventLogger } from '../../../../../core/analytics';
import { FocusReporter } from '../focus-reporter';
import { CardFooter } from '../../cards-display/card-item/card-footer';
import { CardHeader, CardSize } from '../../cards-display/card-item';

const useStyles = makeStyles(theme => ({
  placeholder: {
    marginLeft: styleguide.gridbase * 1.5,
    marginRight: styleguide.gridbase * 1.5,
    marginBottom: styleguide.gridbase * 2,
    color: '#b7b4bf',
    fontSize: 12,
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    direction: 'ltr',
  },
  header: {
    position: 'relative',
  },
  textContainer: {
    position: 'relative',
    alignItems: 'center',
    minHeight: styleguide.gridbase * 7,
    basedOn: [layout.row],
    ':hover': {
      backgroundColor: theme.background[150],
      overflowIcon: {
        opacity: 1,
      },
    },
  },
  tags: {
    marginLeft: 0,
    marginBottom: styleguide.gridbase * 2,
    '& > :first-child': {
      marginLeft: 0,
    },
  },
  footer: {
    height: styleguide.gridbase * 4,
  },
  rtl: {
    direction: 'rtl',
  },
  noteHeader: {
    fontSize: 56,
  },
  noteEditor: {
    maxWidth: '100%',
    flexShrink: 1,
  },
  pills: {
    flexShrink: 1,
    flexWrap: 'wrap',
    basedOn: [layout.row],
  },
  assignees: {
    alignSelf: 'center',
  },
}));

// function TagsPlaceholder({ value, hasTags, text, isRtl }) {
//   const doc = value.document;
//   const texts = doc.getTexts();
//   const firstText = texts.get(0);
//   const inlines = doc.getInlines();
//   const [left, setLeft] = useState(-9999);
//   const [right, setRight] = useState(null);
//   useLayoutEffect(() => {
//     if (texts.size > 1 || inlines.size) {
//       setLeft(-9999);
//       setRight(null);
//       return;
//     }
//     try {
//       // TODO: fix
//       // const domNode = findDOMNode(firstText);
//       // const width = domNode.getBoundingClientRect().width;
//       const width = 0;
//       if (isRtl) {
//         setLeft(null);
//         setRight(width);
//       } else {
//         setLeft(width);
//         setRight(null);
//       }
//     } catch (e) {
//       setLeft(-9999);
//       setRight(null);
//     }
//   }, [texts, inlines, firstText, isRtl]);
//   if (hasTags || (firstText && !firstText.text.length)) {
//     return null;
//   }
//   return (
//     <div
//       className={cn(styles.placeholder)}
//       style={{
//         left: left && left + 'px',
//         right: right && right + 'px',
//       }}>
//       {text}
//     </div>
//   );
// }

interface TitleEditorProps {
  cardManager: VertexManager<Note>;
  className?: string;
  isRtl?: boolean;
  focusNext?: () => void;
  dispatch: (x: any) => void;
  onDelete?: () => void;
  showWS?: boolean;
}

export default function TitleEditorView({
  cardManager,
  className,
  isRtl,
  focusNext,
  onDelete,
}: TitleEditorProps) {
  const styles = useStyles();
  const createTag = useCreateTag();

  const createTagRef = useRef<CreateTagContext>(createTag);
  useEffect(() => {
    createTagRef.current = createTag;
  }, [createTag]);

  // const eventLogger = useEventLogger();

  const { editor, plugins, handlers } = useTitleEditor(
    cardManager,
    H1,
    CARD_SOURCE.TITLE,
    {
      onFocusNext: focusNext,
    }
  );

  return (
    <div className={cn(className, styles.header, isRtl && styles.rtl)}>
      <Slate editor={editor} {...handlers}>
        <CardHeader
          size={CardSize.Regular}
          card={cardManager}
          source={CARD_SOURCE.TITLE}
          isExpanded={true}
          hideMenu={true}
        />
        <div className={cn(styles.textContainer)}>
          <div className={cn(layout.flex, styles.noteEditor)}>
            <EditableCardContext cardManager={cardManager}>
              <FocusReporter cardManager={cardManager} source="editor-title" />
              <Editable
                {...plugins}
                placeholder="Name your card"
                tabIndex={0}
              />
            </EditableCardContext>
          </div>
          {/* <TagsPlaceholder
            value={value}
            text={`Tag this card (# Tag Name)`}
            isRtl={isRtl}
            hasTags={pcard.get('tags', new COWMap([])).size}
          /> */}
          <CardMenuView
            cardManager={cardManager}
            onDeleted={onDelete}
            source={CARD_SOURCE.TITLE}
            position="bottom"
            editorRootKey={cardManager.key}
          />
        </div>
        <CardFooter
          className={cn(styles.footer)}
          card={cardManager}
          source={CARD_SOURCE.TITLE}
        />
      </Slate>
    </div>
  );
}
