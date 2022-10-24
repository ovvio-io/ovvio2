import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { layout, styleguide } from '@ovvio/styles';
import { useTypographyStyles } from '@ovvio/styles/lib/components/typography';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { brandLightTheme as theme } from '@ovvio/styles/lib/theme';
import { createUseStrings } from 'core/localization';
import React, { useEffect, useState } from 'react';
import { WorkspacesDropdown } from 'shared/invite-form/workspaces-dropdown';
import localization from './new-workspace.strings.json';

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

  const onClick = () => setShouldDuplicate(x => !x);

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
  workspaces: VertexManager<Workspace>[];
  setWorkspace: (ws: VertexManager<Workspace>) => void;
  selectedWorkspace: VertexManager<Workspace>;
  className?: string;
}

export function DuplicateWorkspaceView({
  workspaces,
  setWorkspace,
  selectedWorkspace,
  className,
}: DuplicateWorkspaceViewProps) {
  const styles = useStyles();
  const strings = useStrings();

  const [shouldDuplicate, setShouldDuplicate] = useState(!!selectedWorkspace);
  useEffect(() => {
    if (!shouldDuplicate) {
      setWorkspace(null);
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
          selectedWorkspace={selectedWorkspace}
          workspaces={workspaces}
          setSelectedWorkspace={setWorkspace}
          placeholder={strings.chooseDuplicateFrom}
        />
      )}
    </div>
  );
}
