import { UnionQuery } from '@ovvio/cfds/lib/client/graph/query';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { Note, NoteType } from '@ovvio/cfds/lib/client/graph/vertices/note';
import { layout, styleguide } from '@ovvio/styles/lib';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { isNote, useQuery } from 'core/cfds/react/query';
import { usePartialVertices } from 'core/cfds/react/vertex';
import { Scroller } from 'core/react-utils/scrolling';
import { useMemo } from 'react';
import { GroupBy } from '../display-bar';
import {
  FiltersStateController,
  isCardInFilter,
} from '../display-bar/filters/state';
import { AssigneesBoardView } from './assignees-board-view';
import { TagBoardView } from './tag-board-view';
import { WorkspaceBoardView } from './workspace-board-view';

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

export interface BoardViewProps {
  groupBy: GroupBy;
  noteType: NoteType;
  selectedWorkspaces: VertexManager<Workspace>[];
  className?: string;
  filters: FiltersStateController;
}

// type PartialTaskData = Partial<TypeOfScheme<typeof NOTE_SCHEME>>;
// type TaskData = PartialTaskData & Required<Pick<PartialTaskData, 'workspace'>>;

export function BoardView({
  groupBy,
  selectedWorkspaces,
  noteType,
  className,
  filters,
}: BoardViewProps) {
  const styles = useStyles();
  const q = usePartialVertices(selectedWorkspaces, ['notesQuery']);
  const source = useMemo(() => new UnionQuery(q.map(x => x.notesQuery)), [q]);
  const cards = useQuery<Note>(
    (x: Note) =>
      x.type === noteType &&
      x.parentType !== NoteType.Task &&
      isCardInFilter(filters, x),
    [noteType, filters],
    {
      name: 'BoardView',
      source,
    }
  );
  // const cards = useQueryProvider(ListCardsQueryProvider, {
  //   selectedWorkspaces: selectedWorkspaces.map(x => x.key),
  //   noteType,
  // });
  // const docRouter = useDocumentRouter();
  if (cards.loading) {
    return null;
  }
  let content = null;
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

  if (groupBy.type === 'workspace') {
    content = (
      <WorkspaceBoardView
        cardManagers={cards.results}
        selectedWorkspaces={selectedWorkspaces}
      />
    );
  } else if (groupBy.type === 'tag') {
    content = (
      <TagBoardView
        cardManagers={cards.results}
        selectedWorkspaces={selectedWorkspaces}
        parentTag={groupBy.tag}
      />
    );
  } else {
    content = (
      <AssigneesBoardView
        filters={filters}
        cardManagers={cards.results}
        selectedWorkspaces={selectedWorkspaces}
      />
    );
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
