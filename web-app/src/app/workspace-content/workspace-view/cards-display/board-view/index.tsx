import React from 'https://esm.sh/react@18.2.0';
import { layout, styleguide } from '../../../../../../../styles/index.ts';
import {
  cn,
  makeStyles,
} from '../../../../../../../styles/css-objects/index.ts';
import { Scroller } from '../../../../../core/react-utils/scrolling.tsx';
import { AssigneesBoardView } from './assignees-board-view.tsx';
import { TagBoardView } from './tag-board-view.tsx';
import { WorkspaceBoardView } from './workspace-board-view.tsx';
import { useQuery2 } from '../../../../../core/cfds/react/query.ts';
import { useFilter } from '../../../../index.tsx';

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

export interface BoardViewProps {
  className?: string;
}

// type PartialTaskData = Partial<TypeOfScheme<typeof NOTE_SCHEME>>;
// type TaskData = PartialTaskData & Required<Pick<PartialTaskData, 'workspace'>>;

export function BoardView({ className }: BoardViewProps) {
  const styles = useStyles();
  const filter = useFilter();
  const query = useQuery2(filter.buildQuery('BoardView'));

  let content: React.ReactNode = null;
  // const onCreateCard = (data: TaskData) => {
  //   const workspace = selectedWorkspaces.find(x => x.key === data.workspace);
  //   if (!workspace) {
  //     return;
  //   }
  //   const ws = workspace.getVertexProxy();
  //   const tagsMap = new COWMap(
  //     Array.from(noteType === NoteType.Note ? ws.noteTags : ws.taskTags).map(
  //       ([p, t]) => [p.key, t.key]
  //     )
  //   );

  //   const baseData: PartialTaskData = {
  //     createdBy: graph.rootKey,
  //     title: emptyDoc(),
  //     body: emptyDoc(),
  //     type: noteType,
  //     assignees: new Set<string>([graph.rootKey]),
  //     tags: tagsMap,
  //     creationDate: new Date(),
  //   };
  //   const card = graph.createVertex<Note>(NS_NOTES, {
  //     ...baseData,
  //     ...data,
  //   });

  //   docRouter.goTo(card);
  // };

  const groupBy = filter.groupBy;

  if (groupBy === 'workspace') {
    content = <WorkspaceBoardView query={query} />;
  } else if (groupBy === 'tag') {
    content = <TagBoardView query={query} />;
  } else {
    content = <AssigneesBoardView query={query} />;
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
