import { NS_NOTES } from '@ovvio/cfds';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Note, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { NoteType } from '@ovvio/cfds/lib/client/graph/vertices/note';
import { COWMap } from '@ovvio/cfds/lib/collections/cow-map';
import { styleguide } from '@ovvio/styles';
import { Button, useButtonStyles } from '@ovvio/styles/lib/components/buttons';
import { IconNewTask } from '@ovvio/styles/lib/components/new-icons/icon-new-task';
import { Text } from '@ovvio/styles/lib/components/typography';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { brandLightTheme as theme } from '@ovvio/styles/lib/theme';
import { useGraphManager, useRootUser } from 'core/cfds/react/graph';
import { createUseStrings } from 'core/localization';
import localization from './list.strings.json';
import { Row } from './table';
import { DraftItemRow, ROW_HEIGHT } from './table/item';

const useStyles = makeStyles(
  () => ({
    row: {
      borderBottom: `1px solid ${theme.primary.p3}`,
    },
    icon: {
      marginRight: styleguide.gridbase,
    },
    button: {
      height: ROW_HEIGHT,
      boxShadow: theme.shadows.z2,
      boxSizing: 'border-box',
      padding: [0, styleguide.gridbase],
      backgroundColor: theme.colors.background,
      basedOn: [useButtonStyles.button],
    },
  }),
  'inline-task-button_8162e3'
);

const useStrings = createUseStrings(localization);

export interface InlineTaskButtonProps {
  draft: VertexManager<Note>;
  setDraft: (note: VertexManager<Note>) => void;
}

export function InlineTaskButton({ draft, setDraft }: InlineTaskButtonProps) {
  const styles = useStyles();
  const strings = useStrings();
  const graph = useGraphManager();
  const rootUser = useRootUser();
  const onClick = () => {
    const wss = Array.from(rootUser.getVertexProxy().workspaces).filter(
      x => x instanceof Workspace
    );
    const ws = wss[0];

    const v = graph.createVertex<Note>(
      NS_NOTES,
      {
        createdBy: rootUser.key,
        body: {
          root: { children: [{ tagName: 'p', children: [{ text: '' }] }] },
        },
        title: {
          root: { children: [{ tagName: 'p', children: [{ text: '' }] }] },
        },
        type: NoteType.Task,
        assignees: new Set([rootUser.key]),
        workspace: ws.key,
      },
      undefined,
      true
    );
    setDraft(v.manager as VertexManager<Note>);
  };
  const onSave = (note: VertexManager<Note>) => {
    const proxy = note.getVertexProxy();
    proxy.tags = new COWMap(proxy.workspace.taskTags);
    proxy.isLocal = false;
    setDraft(null);
  };
  const onCancel = () => {
    const proxy = draft.getVertexProxy();
    proxy.isDeleted = 1;
    setDraft(null);
  };
  if (!draft) {
    return (
      <Row className={cn(styles.row)}>
        <Button className={cn(styles.button)} onClick={onClick}>
          <IconNewTask className={styles.icon} />
          <Text>{strings.newTask}</Text>
        </Button>
      </Row>
    );
  }

  return (
    <DraftItemRow onWorkspaceMoved={onSave} note={draft} onCancel={onCancel} />
  );
}
