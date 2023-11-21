import React, { useState } from 'react';
import { styleguide } from '../../../../../styles/styleguide.ts';
import { brandLightTheme as theme } from '../../../../../styles/theme.tsx';
import { cn, makeStyles } from '../../../../../styles/css-objects/index.ts';
import { useTypographyStyles } from '../../../../../styles/components/typography.tsx';
import { layout } from '../../../../../styles/layout.ts';
import { MediaQueries } from '../../../../../styles/responsive.ts';
import { createUseStrings } from '../../../core/localization/index.tsx';
import { IconArchive } from '../../../../../styles/components/new-icons/icon-archive.tsx';
import { Button } from '../../../../../styles/components/buttons.tsx';
import { IconEdit } from '../../../../../styles/components/icons/index.ts';
import { IconExportMail } from '../../../../../styles/components/new-icons/icon-export-mail.tsx';

const useStyles = makeStyles(() => ({
  compose: {
    background: theme.colors.primaryButton,
    height: styleguide.gridbase * 4,
    boxSizing: 'border-box',
    padding: [0, styleguide.gridbase],
    borderRadius: styleguide.gridbase * 2,
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
    [MediaQueries.TabletAndMobile]: {
      display: 'none',
    },
  },
  workspacesList: {
    maxHeight: styleguide.gridbase * 30,
    overflowY: 'auto',
  },
}));

const ComposeInternalButtonAssign = React.forwardRef(
  (
    { className }: { className?: string },
    ref: React.ForwardedRef<HTMLDivElement>
  ) => {
    const styles = useStyles();
    return (
      <div className={cn(styles.compose, className)} ref={ref}>
        <IconArchive />
        <span className={cn(styles.text)}>{'Assign to Workspaces'}</span>
      </div>
    );
  }
);

interface AssignButtonProps {
  onAssignClick?: () => void;
}

export function AssignButton({ onAssignClick }: AssignButtonProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>();

  return (
    <Button onClick={onAssignClick}>
      <ComposeInternalButtonAssign ref={(div) => setContainer(div)} />
    </Button>
  );
}

const ComposeInternalButtonEdit = React.forwardRef(
  (
    { className }: { className?: string },
    ref: React.ForwardedRef<HTMLDivElement>
  ) => {
    const styles = useStyles();
    // const strings = useStrings();

    return (
      <div className={cn(styles.compose, className)} ref={ref}>
        <IconExportMail />
        <span className={cn(styles.text)}>{'Edit'}</span>
      </div>
    );
  }
);
export function EditButton() {
  //   const styles = useStyles();
  //   const logger = useLogger();
  //   const docRouter = useDocumentRouter();
  //   const view = usePartialView('selectedWorkspaces');
  //   const workspaces = useVertices(view.selectedWorkspaces);
  const [container, setContainer] = useState<HTMLDivElement | null>();

  return (
    <Button onClick={() => ''}>
      <ComposeInternalButtonEdit ref={(div) => setContainer(div)} />
    </Button>
  );
}
