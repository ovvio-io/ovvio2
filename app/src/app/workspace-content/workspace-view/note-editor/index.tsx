import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Note } from '../../../../../../cfds/client/graph/vertices/note.ts';
import { layout } from '../../../../../../styles/layout.ts';
import SpinnerView from '../../../../../../styles/components/spinner-view.tsx';
import { cn, makeStyles } from '../../../../../../styles/css-objects/index.ts';
import { useVertex } from '../../../../core/cfds/react/vertex.ts';
import FloatingBackButton from '../../../../shared/components/floating-back-button.tsx';
import { useGraphManager } from '../../../../core/cfds/react/graph.tsx';
import CardContentView from './content.tsx';

const kAllowEditorCrashes = false;

const useStyles = makeStyles((theme) => ({
  root: {
    position: 'relative',
    height: '100%',
    width: '100%',
    flexShrink: 1,
    basedOn: [layout.column, layout.flex],
  },
  relative: {
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 1,
    basedOn: [layout.flex, layout.column],
  },
  loader: {
    basedOn: [layout.column, layout.flex, layout.centerCenter],
  },
}));

function NoteNotFound() {
  return <Navigate to="/" replace={true} />;
}

type ErrorBoundaryProps<T> = React.PropsWithChildren<T>;

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps<{}>,
  { hasError: boolean }
> {
  constructor(props: ErrorBoundaryProps<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    if (kAllowEditorCrashes) {
      return { hasError: false };
    }
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <Navigate to="/" />;
    }

    return this.props.children;
  }
}

interface NotesViewProps {
  noteId?: string;
}

export default function NoteView({ noteId }: NotesViewProps) {
  const routeNoteId = useParams().noteId;
  if (!noteId && routeNoteId) {
    noteId = routeNoteId;
  }

  return noteId ? <InnerNoteView noteId={noteId} /> : <NoteNotFound />;
}

interface InnerNotesViewProps {
  noteId?: string;
}

export function InnerNoteView({ noteId }: InnerNotesViewProps) {
  const styles = useStyles();
  const params = useParams<Required<InnerNotesViewProps>>();
  if (!noteId) {
    noteId = params.noteId;
  }
  const graph = useGraphManager();
  const cardManager = graph.getVertexManager<Note>(noteId!);
  const card = useVertex(cardManager);

  let content = null;
  if (card.isDeleted) {
    return <NoteNotFound />;
    // } else if (card.isLoading) {
    //   content = (
    //     <div className={cn(styles.loader)}>
    //       <SpinnerView />
    //     </div>
    //   );
  } else {
    content = <CardContentView cardManager={cardManager} />;
  }

  return (
    // <ErrorBoundary>
    <div className={cn(styles.root)}>
      <div className={cn(styles.relative)}>
        <FloatingBackButton />
        {content}
      </div>
    </div>
    // </ErrorBoundary>
  );
}
