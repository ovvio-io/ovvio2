import React, { useRef, useEffect } from 'https://esm.sh/react@18.2.0';
import {
  Editable,
  RenderElementProps,
  Slate,
} from 'https://esm.sh/slate-react@0.87.1';
import {
  makeStyles,
  cn,
} from '../../../../../../../styles/css-objects/index.ts';
import { styleguide, layout } from '../../../../../../../styles/index.ts';
import { H1 } from '../../../../../../../styles/components/texts.tsx';
import { Note } from '../../../../../../../cfds/client/graph/vertices/note.ts';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import { useTitleEditor } from '../../../../../core/slate/index.tsx';
import { EditableCardContext } from '../../../../../core/slate/elements/card.element/index.tsx';
import {
  CreateTagContext,
  useCreateTag,
} from '../../../../../shared/tags/create-tag-context.tsx';
import CardMenuView from '../../../../../shared/item-menu/index.tsx';
// import { useEventLogger } from '../../../../../core/analytics';
import { FocusReporter } from '../focus-reporter.tsx';
import { CardFooter } from '../../cards-display/card-item/card-footer.tsx';
import { CardHeader, CardSize } from '../../cards-display/card-item/index.tsx';

const useStyles = makeStyles((theme) => ({
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
      backgroundColor: theme.background[100],
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

function Title({ children, attributes }: RenderElementProps): JSX.Element {
  return <H1 {...attributes}>{children}</H1>;
}

interface TitleEditorProps {
  cardManager: VertexManager<Note>;
  className?: string;
  isRtl?: boolean;
  focusNext?: () => void;
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
    Title,
    'title',
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
          source="title"
          isExpanded={true}
          hideMenu={true}
        />
        <div className={cn(styles.textContainer)}>
          <div className={cn(layout.flex, styles.noteEditor)}>
            <EditableCardContext cardManager={cardManager}>
              <FocusReporter cardManager={cardManager} source="editor:title" />
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
            source="title"
            position="bottom"
            editorRootKey={cardManager.key}
          />
        </div>
        <CardFooter
          className={cn(styles.footer)}
          card={cardManager}
          source="title"
        />
      </Slate>
    </div>
  );
}
