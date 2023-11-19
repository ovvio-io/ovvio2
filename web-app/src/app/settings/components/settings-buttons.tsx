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

// const useStrings = createUseStrings(localization);

const ComposeInternalButton = React.forwardRef(
  (
    { className }: { className?: string },
    ref: React.ForwardedRef<HTMLDivElement>
  ) => {
    const styles = useStyles();
    // const strings = useStrings();

    return (
      <div className={cn(styles.compose, className)} ref={ref}>
        <IconArchive />
        <span className={cn(styles.text)}>{'Assign to Workspaces'}</span>
      </div>
    );
  }
);

export function AssignButton() {
  //   const styles = useStyles();
  //   const logger = useLogger();
  //   const docRouter = useDocumentRouter();
  //   const view = usePartialView('selectedWorkspaces');
  //   const workspaces = useVertices(view.selectedWorkspaces);
  const [container, setContainer] = useState<HTMLDivElement | null>();

  return (
    <Button onClick={() => ''}>
      <ComposeInternalButton ref={(div) => setContainer(div)} />
    </Button>
  );
}
