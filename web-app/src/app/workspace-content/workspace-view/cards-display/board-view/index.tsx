import React from 'react';
import {
  makeStyles,
  cn,
} from '../../../../../../../styles/css-objects/index.ts';
import { layout } from '../../../../../../../styles/layout.ts';
import { styleguide } from '../../../../../../../styles/styleguide.ts';
import {
  FilteredNotes,
  useFilteredNotes,
} from '../../../../../core/cfds/react/filter.ts';
import { usePartialView } from '../../../../../core/cfds/react/graph.tsx';
import { Scroller } from '../../../../../core/react-utils/scrolling.tsx';
import { AssigneesBoardView } from './assignees-board-view.tsx';
import { DueDateBoardView } from './dates-board-view.tsx';
import { TitleBoardView } from './title-board-view.tsx';
import { TagBoardView } from './tag-board-view.tsx';
import { WorkspaceBoardView } from './workspace-board-view.tsx';

const useStyles = makeStyles((theme) => ({
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
  const filteredNotes = useFilteredNotes('BoardView'); // ask ofri
  let content: React.ReactNode = null;
  const groupBy = view.groupBy;
  if (groupBy === 'workspace') {
    content = <WorkspaceBoardView filteredNotes={filteredNotes} />;
  } else if (groupBy === 'tag') {
    content = <TagBoardView filteredNotes={filteredNotes} />;
  } else if (groupBy === 'dueDate') {
    content = <DueDateBoardView filteredNotes={filteredNotes} />;
  } else if (groupBy === 'note' || groupBy === 'team') {
    content = <TitleBoardView filteredNotes={filteredNotes} />;
  } else {
    content = <AssigneesBoardView filteredNotes={filteredNotes} />;
  }

  return (
    <Scroller>
      {(ref) => (
        <div ref={ref} className={cn(styles.boardRoot, className)}>
          {content}
        </div>
      )}
    </Scroller>
  );
}
