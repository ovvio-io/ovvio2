import React, { useEffect, useState } from 'react';
import { VertexManager } from '../../../../cfds/client/graph/vertex-manager.ts';
import { Workspace } from '../../../../cfds/client/graph/vertices/workspace.ts';
import { layout, styleguide } from '../../../../styles/index.ts';
import { useTypographyStyles } from '../../../../styles/components/typography.tsx';
import { cn, makeStyles } from '../../../../styles/css-objects/index.ts';
import { brandLightTheme as theme } from '../../../../styles/theme.tsx';
import { createUseStrings } from '../../core/localization/index.tsx';
import { WorkspacesDropdown } from './workspaces-dropdown.tsx';
import localization from './new-workspace.strings.json' assert { type: 'json' };

const useStyles = makeStyles(
  () => ({
    root: {
      alignItems: 'stretch',
      basedOn: [layout.column],
    },
    toggle: {
      position: 'relative',
      cursor: 'pointer',
      height: styleguide.gridbase * 5,
      backgroundColor: theme.colors.secondaryButton,
      borderRadius: styleguide.gridbase * 2.5,
      basedOn: [layout.row],
    },
    option: {
      position: 'relative',
      zIndex: 2,
      flexGrow: 1,
      flexShrink: 0,
      flexBasis: '50%',
      color: theme.secondary.s6,
      basedOn: [layout.column, layout.centerCenter, useTypographyStyles.text],
    },
    selected: {
      color: theme.colors.primaryButton,
    },
    indicator: {
      backgroundColor: theme.colors.background,
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      width: '50%',
      transform: 'translateX(0)',
      borderRadius: styleguide.gridbase * 2.5,
      ...styleguide.transition.standard,
      transitionProperty: 'transform',
      boxShadow: theme.shadows.z1,
    },
    indicatorSelected: {
      transform: 'translateX(100%)',
    },
    selector: {
      marginTop: styleguide.gridbase * 3,
    },
  }),
  'duplicate-workspace_5420c8'
);

const useStrings = createUseStrings(localization);

function DuplicateToggle({
  shouldDuplicate,
  setShouldDuplicate,
}: {
  shouldDuplicate: boolean;
  setShouldDuplicate: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const styles = useStyles();
  const strings = useStrings();

  const onClick = () => setShouldDuplicate((x) => !x);

  return (
    <div className={cn(styles.toggle)} onClick={onClick}>
      <div
        className={cn(
          styles.indicator,
          shouldDuplicate && styles.indicatorSelected
        )}
      />
      <div className={cn(styles.option, !shouldDuplicate && styles.selected)}>
        {strings.fromNew}
      </div>
      <div className={cn(styles.option, shouldDuplicate && styles.selected)}>
        {strings.duplicate}
      </div>
    </div>
  );
}

export interface DuplicateWorkspaceViewProps {
  allWorkspaces: readonly VertexManager<Workspace>[];
  setWorkspace: (ws: VertexManager<Workspace> | undefined) => void;
  workspace: VertexManager<Workspace> | undefined;
  className?: string;
}

export function DuplicateWorkspaceView({
  allWorkspaces,
  setWorkspace,
  workspace,
  className,
}: DuplicateWorkspaceViewProps) {
  const styles = useStyles();
  const strings = useStrings();

  const [shouldDuplicate, setShouldDuplicate] = useState(!!workspace);
  useEffect(() => {
    if (!shouldDuplicate) {
      setWorkspace(undefined);
    }
  }, [shouldDuplicate, setWorkspace]);
  return (
    <div className={cn(styles.root, className)}>
      <DuplicateToggle
        shouldDuplicate={shouldDuplicate}
        setShouldDuplicate={setShouldDuplicate}
      />
      {shouldDuplicate && (
        <WorkspacesDropdown
          className={cn(styles.selector)}
          allWorkspaces={allWorkspaces}
          workspace={workspace}
          setWorkspace={setWorkspace}
          placeholder={strings.chooseDuplicateFrom}
        />
      )}
    </div>
  );
}
