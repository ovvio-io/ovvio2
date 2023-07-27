import React from 'react';
import { NS_NOTES } from '../../../../../../../cfds/base/scheme-types.ts';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import {
  Note,
  Workspace,
} from '../../../../../../../cfds/client/graph/vertices/index.ts';
import { NoteType } from '../../../../../../../cfds/client/graph/vertices/note.ts';
import { styleguide } from '../../../../../../../styles/styleguide.ts';
import {
  Button,
  useButtonStyles,
} from '../../../../../../../styles/components/buttons.tsx';
import { IconNewTask } from '../../../../../../../styles/components/new-icons/icon-new-task.tsx';
import { Text } from '../../../../../../../styles/components/typography.tsx';
import {
  cn,
  makeStyles,
} from '../../../../../../../styles/css-objects/index.ts';
import { brandLightTheme as theme } from '../../../../../../../styles/theme.tsx';
import {
  useGraphManager,
  useRootUser,
} from '../../../../../core/cfds/react/graph.tsx';
import { createUseStrings } from '../../../../../core/localization/index.tsx';
import localization from './list.strings.json' assert { type: 'json' };
import { Row } from './table/index.tsx';
import { DraftItemRow, ROW_HEIGHT } from './table/item.tsx';

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
  setDraft: (note: VertexManager<Note> | null) => void;
}

export function InlineTaskButton({ draft, setDraft }: InlineTaskButtonProps) {
  const styles = useStyles();
  const strings = useStrings();
  const graph = useGraphManager();
  const rootUser = useRootUser();
  const onClick = () => {
    const wss = Array.from(
      rootUser.getVertexProxy().settings.workspaces
    ).filter((x) => x instanceof Workspace);
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
    proxy.tags = new Map(proxy.workspace.taskTags);
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
