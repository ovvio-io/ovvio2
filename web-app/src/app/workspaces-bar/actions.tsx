import React, { useCallback, useState } from 'https://esm.sh/react@18.2.0';
import { useNavigate } from 'https://esm.sh/react-router@6.7.0';
import { layout, styleguide } from '../../../../styles/index.ts';
import { useTypographyStyles } from '../../../../styles/components/typography.tsx';
import { cn, makeStyles } from '../../../../styles/css-objects/index.ts';
import { brandLightTheme as theme } from '../../../../styles/theme.tsx';
import { createUseStrings } from '../../core/localization/index.tsx';
// import InvitationDialog from '../../shared/invitation-dialog/index.tsx';
import { useLogger } from '../../core/cfds/react/logger.tsx';
import localization from './workspace-bar.strings.json' assert { type: 'json' };

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
  expanded: boolean;
  className?: string;
}

export function WorkspaceBarActions({
  expanded,
  className,
}: WorkspaceBarActionsProps) {
  const styles = useStyles();
  const strings = useStrings();
  const logger = useLogger();
  const navigate = useNavigate();
  const [isShareOpen, setIsShareOpen] = useState(false);

  const createNew = useCallback(() => {
    logger.log({
      severity: 'INFO',
      event: 'Start',
      flow: 'create',
      type: 'workspace',
      source: 'bar:workspace',
    });
    navigate('/new');
  }, [history, logger]);

  return (
    <div className={cn(styles.root, className)}>
      <div className={cn(styles.action)} onClick={createNew}>
        <div className={cn(styles.actionIcon)}>
          <IconPlus />
        </div>
        <div className={cn(styles.actionText)}>
          {expanded ? strings.add : strings.addShort}
        </div>
      </div>
      <div className={cn(styles.action)} onClick={() => setIsShareOpen(true)}>
        <div className={cn(styles.actionIcon)}>
          <IconInvite />
        </div>
        <div className={cn(styles.actionText)}>
          {expanded ? strings.invite : strings.inviteShort}
        </div>
      </div>
      {/* <InvitationDialog
        open={isShareOpen}
        hide={() => setIsShareOpen(false)}
        source="workspace-bar"
      /> */}
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
