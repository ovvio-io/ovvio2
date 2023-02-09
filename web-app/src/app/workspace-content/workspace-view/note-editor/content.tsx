import React, {
  useCallback,
  useReducer,
  useRef,
} from 'https://esm.sh/react@18.2.0';
import { Note } from '../../../../../../cfds/client/graph/vertices/note.ts';
import { VertexManager } from '../../../../../../cfds/client/graph/vertex-manager.ts';
import { makeStyles, cn } from '../../../../../../styles/css-objects/index.ts';
import { layout, styleguide } from '../../../../../../styles/index.ts';
import { MediaQueries } from '../../../../../../styles/responsive.ts';
import BodyEditor, { EditorHandle } from './body-editor/index.tsx';
import { Scroller } from '../../../../core/react-utils/scrolling.tsx';
import LegendButton from './legend-view.tsx';
import reducer, { initialState } from './editor-reducer.ts';
import TitleEditorView from './title-editor/index.tsx';

const useStyles = makeStyles((theme) => ({
  container: {
    flexShrink: 1,
    overflowY: 'auto',
    width: '100%',
    paddingTop: styleguide.gridbase * 10,
    margin: [0, 'auto'],
    basedOn: [layout.flex],
  },
  headerContainer: {
    paddingTop: styleguide.gridbase * 4,
    paddingBottom: styleguide.gridbase * 4,
    [MediaQueries.TabletAndMobile]: {
      paddingTop: styleguide.gridbase * 3,
      paddingBottom: styleguide.gridbase * 3,
    },
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    margin: '0 auto',
    '::selection': {
      backgroundColor: theme.primary[500],
    },
    '& *': {
      '::selection': {
        backgroundColor: theme.primary[400],
      },
    },
    outline: 'none',
    border: 'none',
    background: 'transparent',
    color: theme.background.text,
  },
  contained: {
    width: '100%',
    maxWidth: styleguide.gridbase * 100,
    padding: [styleguide.gridbase * 16, styleguide.gridbase * 8],
    paddingTop: 0,
    [MediaQueries.Tablet]: {
      padding: [styleguide.gridbase * 3, styleguide.gridbase * 2],
      paddingTop: 0,
    },
    [MediaQueries.Mobile]: {
      padding: [styleguide.gridbase * 3, styleguide.gridbase],
      paddingTop: 0,
    },
  },
}));
// const plainTextSerializer = new PlainTextSerializer();

interface CardEditorProps {
  cardManager: VertexManager<Note>;
  showWS?: boolean;
}

export default function CardEditorContent({
  cardManager,
  showWS = false,
}: CardEditorProps) {
  const styles = useStyles();
  // const rtl = useMemo(() => {
  //   const str = plainTextSerializer.deserialize(title);

  //   return isRTL(str);
  // }, [title]);
  const rtl = false;
  const bodyEditorRef = useRef<EditorHandle>(null);
  const focusNext = useCallback(() => {
    bodyEditorRef.current?.focus();
  }, []);
  // const focusBody = () => {
  //   //bodyEditorRef.current && (bodyEditorRef.current as any).focus();
  // };

  return (
    <Scroller>
      {(ref) => (
        <div className={cn(styles.container)} ref={ref}>
          <div
            className={cn(styles.headerContainer)}
            onClick={(e) => e.stopPropagation()}
          >
            <TitleEditorView
              cardManager={cardManager}
              isRtl={rtl}
              className={cn(styles.header, styles.contained)}
              showWS={showWS}
              focusNext={focusNext}
            />
          </div>
          {/* <RichtextContext card={card} field="body" fieldType={FieldTypes.body}>
            {props => ( */}
          <BodyEditor
            className={cn(styles.contained)}
            cardManager={cardManager}
            isRtl={rtl}
            ref={bodyEditorRef}
          />
          {/* )}
          </RichtextContext> */}
          <LegendButton />
          {/* <InvitationDialog
            workspace={workspace}
            open={state.inviteOpen}
            hide={() => dispatch({ type: EditorActions.CLOSE })}
          /> */}
        </div>
      )}
    </Scroller>
  );
}
