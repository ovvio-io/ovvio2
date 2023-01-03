import { useMemo } from 'https://esm.sh/react@18.2.0';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import { Workspace } from '../../../../../../../cfds/client/graph/vertices/workspace.ts';
import {
  Note,
  NoteType,
} from '../../../../../../../cfds/client/graph/vertices/note.ts';
import { layout, styleguide } from '../../../../../../../styles/index.ts';
import {
  cn,
  makeStyles,
} from '../../../../../../../styles/css-objects/index.ts';
import { usePartialVertices } from '../../../../../core/cfds/react/vertex.ts';
import { Scroller } from '../../../../../core/react-utils/scrolling.tsx';
import { GroupBy } from '../display-bar/index.tsx';
import { AssigneesBoardView } from './assignees-board-view.tsx';
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
  const source = useMemo(() => new UnionQuery(q.map((x) => x.notesQuery)), [q]);
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
      {(ref) => (
        <div ref={ref} className={cn(styles.boardRoot, className)}>
          {content}
        </div>
      )}
    </Scroller>
  );
}
