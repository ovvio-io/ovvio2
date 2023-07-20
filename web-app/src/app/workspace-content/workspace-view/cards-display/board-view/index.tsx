import { layout, styleguide } from '@ovvio/styles/lib';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { Scroller } from 'core/react-utils/scrolling';
import { AssigneesBoardView } from './assignees-board-view';
import { TagBoardView } from './tag-board-view';
import { WorkspaceBoardView } from './workspace-board-view';
import { DueDateBoardView } from './dates-board-view';
import { NoteBoardView } from './note-board-view';
import { usePartialView } from 'core/cfds/react/graph';
import { FilteredNotes, useFilteredNotes } from 'core/cfds/react/filter';

const useStyles = makeStyles(theme => ({
  boardRoot: {
    overflowY: 'auto',
    height: '100%',
    paddingBottom: styleguide.gridbase * 2,
    boxSizing: 'border-box',
    alignItems: 'flex-start',
    basedOn: [layout.row],
  },
}));

export interface BoardViewInternalProps {
  filteredNotes: FilteredNotes;
}

export function BoardView({ className }: { className?: string }) {
  const styles = useStyles();
  const view = usePartialView('groupBy');
  const filteredNotes = useFilteredNotes('BoardView');
  let content = null;
  const groupBy = view.groupBy;
  if (groupBy === 'workspace') {
    content = <WorkspaceBoardView filteredNotes={filteredNotes} />;
  } else if (groupBy === 'tag') {
    content = <TagBoardView filteredNotes={filteredNotes} />;
  } else if (groupBy === 'dueDate') {
    content = <DueDateBoardView filteredNotes={filteredNotes} />;
  } else if (groupBy === 'note') {
    content = <NoteBoardView filteredNotes={filteredNotes} />;
  } else {
    content = <AssigneesBoardView filteredNotes={filteredNotes} />;
  }

  return (
    <Scroller>
      {ref => (
        <div ref={ref} className={cn(styles.boardRoot, className)}>
          {content}
        </div>
      )}
    </Scroller>
  );
}
