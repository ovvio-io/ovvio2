import { useCallback, useReducer, useRef } from 'react';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { layout, styleguide } from '@ovvio/styles/lib';
import BodyEditor, { EditorHandle } from './body-editor';
import { Scroller } from 'core/react-utils/scrolling';
import LegendButton from './legend-view';
import reducer, { initialState } from './editor-reducer';
import { UserStore } from 'stores/user';
import { useScopedObservable } from 'core/state';
import { Note } from '@ovvio/cfds/lib/client/graph/vertices';
import TitleEditorView from './title-editor';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { MediaQueries } from '@ovvio/styles/lib/responsive';

const useStyles = makeStyles(theme => ({
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
  const currentUser = useScopedObservable(UserStore);
  // const rtl = useMemo(() => {
  //   const str = plainTextSerializer.deserialize(title);

  //   return isRTL(str);
  // }, [title]);
  const rtl = false;
  const bodyEditorRef = useRef<EditorHandle>();
  const [, dispatch] = useReducer(reducer, initialState);
  const focusNext = useCallback(() => {
    bodyEditorRef.current?.focus();
  }, []);
  // const focusBody = () => {
  //   //bodyEditorRef.current && (bodyEditorRef.current as any).focus();
  // };

  return (
    <Scroller>
      {ref => (
        <div className={cn(styles.container)} ref={ref}>
          <div
            className={cn(styles.headerContainer)}
            onClick={e => e.stopPropagation()}
          >
            <TitleEditorView
              cardManager={cardManager}
              isRtl={rtl}
              dispatch={dispatch}
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
            dispatch={dispatch}
            currentUser={currentUser}
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
