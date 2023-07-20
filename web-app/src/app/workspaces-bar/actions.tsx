import { layout, styleguide } from '@ovvio/styles';
import Tooltip from '@ovvio/styles/lib/components/tooltip';
import { useTypographyStyles } from '@ovvio/styles/lib/components/typography';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { brandLightTheme as theme } from '@ovvio/styles/lib/theme';
import { useEventLogger } from 'core/analytics';
import { usePartialView } from 'core/cfds/react/graph';
import { useSharedQuery } from 'core/cfds/react/query';
import { createUseStrings } from 'core/localization';
import { CREATE_WORKSPACE, useHistoryStatic } from 'core/react-utils/history';
import { useCallback, useState } from 'react';
import { useDemoInfo } from 'shared/demo';
import InvitationDialog from 'shared/invitation-dialog';
import localization from './workspace-bar.strings.json';

const useStyles = makeStyles(
  () => ({
    root: {
      width: '100%',
      flexShrink: 0,
    },
    action: {
      cursor: 'pointer',
      userSelect: 'none',
      height: styleguide.gridbase * 5,
      boxSizing: 'border-box',
      width: '100%',
      backgroundColor: theme.colors.secondaryButton,
      color: theme.colors.barActionText,
      padding: styleguide.gridbase * 2,
      alignItems: 'center',
      marginBottom: styleguide.gridbase,
      ':last-child': {
        marginBottom: 0,
      },
      ':hover': {
        backgroundColor: theme.colors.secondaryButtonActive,
        color: theme.colors.text,
      },
      basedOn: [layout.row],
    },
    disabled: {
      cursor: 'not-allowed',
    },
    actionIcon: {
      marginRight: styleguide.gridbase,
      basedOn: [layout.column, layout.centerCenter],
    },
    actionText: {
      whiteSpace: 'nowrap',
      color: 'currentColor',
      basedOn: [useTypographyStyles.button, layout.column, layout.centerCenter],
    },
  }),
  'actions_2eb8a6'
);

const useStrings = createUseStrings(localization);

export interface WorkspaceBarActionsProps {
  className?: string;
}

export function WorkspaceBarActions({ className }: WorkspaceBarActionsProps) {
  const { isInDemo } = useDemoInfo();
  const styles = useStyles();
  const strings = useStrings();
  const history = useHistoryStatic();
  const eventLogger = useEventLogger();
  const workspaces = useSharedQuery('workspaces').results;
  const [isShareOpen, setIsShareOpen] = useState(false);
  const view = usePartialView('workspaceBarCollapsed');

  const createNew = useCallback(() => {
    if (isInDemo) {
      return;
    }
    eventLogger.action('ADD_WORKSPACE_CLICKED', {});
    history.push(CREATE_WORKSPACE);
  }, [history, eventLogger, isInDemo]);

  const openInvite = useCallback(() => {
    if (isInDemo) {
      return;
    }
    setIsShareOpen(true);
  }, [isInDemo]);

  return (
    <div className={cn(styles.root, className)}>
      <Tooltip text={strings.inDemo} disabled={!isInDemo}>
        <div
          className={cn(styles.action, isInDemo && styles.disabled)}
          onClick={createNew}
        >
          <div className={cn(styles.actionIcon)}>
            <IconPlus />
          </div>
          <div className={cn(styles.actionText)}>
            {view.workspaceBarCollapsed ? strings.addShort : strings.add}
          </div>
        </div>
      </Tooltip>
      <Tooltip text={strings.inDemo} disabled={!isInDemo}>
        <div
          className={cn(styles.action, isInDemo && styles.disabled)}
          onClick={openInvite}
        >
          <div className={cn(styles.actionIcon)}>
            <IconInvite />
          </div>
          <div className={cn(styles.actionText)}>
            {view.workspaceBarCollapsed ? strings.inviteShort : strings.invite}
          </div>
        </div>
      </Tooltip>
      <InvitationDialog
        workspaces={workspaces}
        open={isShareOpen}
        hide={() => setIsShareOpen(false)}
        source="workspace-bar"
      />
    </div>
  );
}

function IconPlus() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        opacity="0.6"
        d="M8 13L8 3"
        stroke="#945A52"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M3 8L13 8"
        stroke="#6C2C23"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconInvite() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        opacity="0.7"
        d="M11 5C11 6.65685 9.65685 8 8 8C6.34315 8 5 6.65685 5 5"
        stroke="#6C2C23"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M11 5C11 3.34315 9.65685 2 8 2C6.34315 2 5 3.34315 5 5"
        stroke="#6C2C23"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M2 15V14C2 10.6863 4.68629 8 8 8V8"
        stroke="#6C2C23"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M9.12602 14H2C1.44772 14 1 14.4477 1 15C1 15.5523 1.44772 16 2 16H10.3542C9.76377 15.4789 9.32838 14.7862 9.12602 14Z"
        fill="#6C2C23"
      />
      <path
        opacity="0.7"
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M12.9002 9.00122C11.6376 7.76331 9.90793 7 8 7V9C8.97444 9 9.88377 9.27875 10.6526 9.76086C11.2868 9.30045 12.0615 9.02175 12.9002 9.00122Z"
        fill="#6C2C23"
      />
      <path
        opacity="0.6"
        d="M13 15L13 11"
        stroke="#945A52"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M11 13L15 13"
        stroke="#6C2C23"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
