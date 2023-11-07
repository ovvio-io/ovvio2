import React, { useCallback } from 'react';
import Layer from '../../../../../styles/components/layer.tsx';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { layout } from '../../../../../styles/layout.ts';
import { styleguide } from '../../../../../styles/styleguide.ts';
import { brandLightTheme as theme } from '../../../../../styles/theme.tsx';
import {
  LabelSm,
  useTypographyStyles,
} from '../../../../../styles/components/typography.tsx';
import { useNavigate } from 'react-router';
import { IconPersonalInfo } from '../../../../../styles/components/new-icons/icon-personal-info.tsx';
import { IconArchive } from '../../../../../styles/components/new-icons/icon-archive.tsx';
import { IconOrg } from '../../../../../styles/components/new-icons/icon-org.tsx';
import { IconMenuClose } from '../../../../../styles/components/new-icons/icon-menu-close.tsx';

const EXPANDED_WIDTH = styleguide.gridbase * 25;

const useStyles = makeStyles(() => ({
  root: {
    flexShrink: 0,
    width: '90vw',
    maxWidth: EXPANDED_WIDTH,
    height: '100%',
    ...styleguide.transition.standard,
    transitionProperty: 'width',
    boxShadow: theme.shadows.z4,
    backgroundColor: theme.colors.background,
    basedOn: [layout.column],
  },
  header: {
    width: '100%',
    flexShrink: 0,
    height: '85px',
    justifyContent: 'space-between',
    basedOn: [layout.column],
    padding: '16px 0px 51px 16px',
  },
  action: {
    cursor: 'pointer',
    userSelect: 'none',
    height: styleguide.gridbase * 5,
    boxSizing: 'border-box',
    width: '100%',
    backgroundColor: theme.colors.secondaryButton,
    color: theme.colors.barActionText,
    alignItems: 'center',
    padding: styleguide.gridbase * 2,
    marginBottom: styleguide.gridbase * 0.5,
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
  back: {
    display: 'flex',
    width: '85px',
    // gap: '4px',
    padding: '5px 0px 5px 14px',
    background: theme.colors.primaryButton,
    height: styleguide.gridbase * 4,
    boxSizing: 'border-box',
    borderRadius: '37px',
    ...styleguide.transition.short,
    transitionProperty: 'box-shadow',
    ':hover': {
      boxShadow: theme.shadows.z2,
    },
    alignItems: 'center',
    basedOn: [layout.row],
  },
  text: {
    color: theme.colors.primaryButtonText,
    padding: [0, styleguide.gridbase],
    basedOn: [useTypographyStyles.button],
  },
}));

const BackButton = React.forwardRef(
  (
    { className }: { className?: string },
    ref: React.ForwardedRef<HTMLDivElement>
  ) => {
    const styles = useStyles();
    return (
      <div className={cn(styles.back, className)} ref={ref}>
        <IconMenuClose />
        <span className={cn(styles.text)}>Back</span>
      </div>
    );
  }
);

export interface SettingsBarActionsProps {
  className?: string;
}

function SettingsBarActions({ className }: SettingsBarActionsProps) {
  const styles = useStyles();
  const navigate = useNavigate();

  const userSettings = useCallback(() => {
    navigate('/settings/me');
  }, [navigate]);

  const workspacesSettings = useCallback(() => {
    navigate('/settings/myWorkspaces');
  }, [navigate]);

  const organizationSettings = useCallback(() => {
    navigate('/settings/organization');
  }, [navigate]);

  return (
    <div className={cn(styles.root, className)}>
      <div className={cn(styles.action)} onClick={userSettings}>
        <div className={cn(styles.actionIcon)}>
          <IconPersonalInfo />
        </div>
        <div className={cn(styles.actionText)}>Personal Info</div>
      </div>
      <div className={cn(styles.action)} onClick={workspacesSettings}>
        <div className={cn(styles.actionIcon)}>
          <IconArchive />
        </div>
        <div className={cn(styles.actionText)}>My Workspaces</div>
      </div>
      <div className={cn(styles.action)} onClick={organizationSettings}>
        <div className={cn(styles.actionIcon)}>
          <IconOrg />
        </div>
        <div className={cn(styles.actionText)}>Organization</div>
      </div>
    </div>
  );
}

export function SettingsBar({ className }: { className?: string }) {
  const styles = useStyles();
  //TODO: check how to go back to the prev page

  return (
    <Layer priority={2}>
      {(style) => (
        <div style={style} className={cn(styles.root, className)}>
          <div className={cn(styles.header)}>
            <BackButton />

            <LabelSm>Settings</LabelSm>
          </div>
          <SettingsBarActions />
        </div>
      )}
    </Layer>
  );
}
