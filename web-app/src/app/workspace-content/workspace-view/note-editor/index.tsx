import { Note } from '@ovvio/cfds/lib/client/graph/vertices';
import { ErrorType, typeFromCode } from '@ovvio/cfds/lib/server/errors';
import { layout } from '@ovvio/styles/lib';
import SpinnerView from '@ovvio/styles/lib/components/spinner-view';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { useVertex } from 'core/cfds/react/vertex';
import config from 'core/config';
import React from 'react';
import { Redirect } from 'react-router-dom';
import FloatingBackButton from 'shared/components/floating-back-button';
import { useGraphManager } from '../../../../core/cfds/react/graph';
import CardContentView from './content';

const useStyles = makeStyles(theme => ({
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

function NoteNotFound({ match }) {
  return <Redirect to={match.url.substr(0, match.url.indexOf('/notes/'))} />;
}

class ErrorBoundary extends React.Component<
  { match: any },
  { hasError: boolean }
> {
  constructor(props: { match: any }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    if (config.allowEditorCrashes) {
      return { hasError: false };
    }
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Redirect
          to={this.props.match.url.substr(
            0,
            this.props.match.url.indexOf('/notes/')
          )}
        />
      );
    }

    return this.props.children;
  }
}

interface NotesViewProps {
  match: any;
}
export default function NotesView({ match }: NotesViewProps) {
  const styles = useStyles();
  const key = match.params.noteId;
  const graph = useGraphManager();

  const cardManager = graph.getVertexManager<Note>(key);

  const card = useVertex(cardManager);

  let content = null;
  if (
    card.isDeleted ||
    (card.errorCode !== undefined &&
      typeFromCode(card.errorCode) === ErrorType.NoAccess)
  ) {
    return <NoteNotFound match={match} />;
  } else if (card.isLoading) {
    content = (
      <div className={cn(styles.loader)}>
        <SpinnerView />
      </div>
    );
  } else {
    content = <CardContentView cardManager={cardManager} />;
  }

  return (
    <ErrorBoundary match={match}>
      <div className={cn(styles.root)}>
        <div className={cn(styles.relative)}>
          <FloatingBackButton />
          {content}
        </div>
      </div>
    </ErrorBoundary>
  );
}
