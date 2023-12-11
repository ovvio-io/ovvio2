import React from 'react';
import { coreValueCompare } from '../../../../../../../../base/core-types/comparable.ts';
import {
  TagId,
  decodeTagId,
} from '../../../../../../../../cfds/base/scheme-types.ts';
import { VertexManager } from '../../../../../../../../cfds/client/graph/vertex-manager.ts';
import { User } from '../../../../../../../../cfds/client/graph/vertices/user.ts';
import { Button } from '../../../../../../../../styles/components/buttons.tsx';
import { useTypographyStyles } from '../../../../../../../../styles/components/typography.tsx';
import {
  makeStyles,
  cn,
} from '../../../../../../../../styles/css-objects/index.ts';
import { layout } from '../../../../../../../../styles/layout.ts';
import { styleguide } from '../../../../../../../../styles/styleguide.ts';
import { useTheme } from '../../../../../../../../styles/theme.tsx';
import { brandLightTheme as theme } from '../../../../../../../../styles/theme.tsx';
import { usePartialView } from '../../../../../../core/cfds/react/graph.tsx';
import { usePartialVertex } from '../../../../../../core/cfds/react/vertex.ts';

const useStyles = makeStyles(
  () => ({
    filtersView: {
      alignItems: 'center',
      basedOn: [layout.row],
    },
    filterPill: {
      height: styleguide.gridbase * 2,
      borderRadius: styleguide.gridbase,
      background: theme.mono.m1,
      marginRight: styleguide.gridbase,
      alignItems: 'center',
      justifyContent: 'space-between',
      basedOn: [layout.row],
    },
    filterText: {
      marginLeft: styleguide.gridbase * 0.5,
      fontSize: '10px',
      lineHeight: '14px',
      basedOn: [useTypographyStyles.text],
    },
    closeIcon: {
      cursor: 'pointer',
      marginLeft: styleguide.gridbase * 0.5,
      height: '100%',
      basedOn: [layout.column, layout.centerCenter],
    },
  }),
  'active-filters_347c3d'
);

export interface ActiveFiltersViewProps {
  className?: string;
}

export function CloseIcon({ onClick }: { onClick?: () => void }) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <div onClick={onClick} className={cn(styles.closeIcon)}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          opacity="0.6"
          d="M9.41436 9.41436L6.58594 6.58594"
          stroke={theme.background.text}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.6"
          d="M6.58594 9.41406L9.41436 6.58564"
          stroke={theme.background.text}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function AssigneePill({ user }: { user: VertexManager<User> }) {
  const styles = useStyles();
  const { name } = usePartialVertex(user, ['name']);
  const view = usePartialView('selectedAssignees');

  return (
    <div className={cn(styles.filterPill)}>
      <span className={cn(styles.filterText)}>{name}</span>
      <CloseIcon
        onClick={() => view.selectedAssignees.delete(user.getVertexProxy())}
      />
    </div>
  );
}

export function TagPill({ tagId }: { tagId: TagId }) {
  const styles = useStyles();
  const view = usePartialView('selectedTagIds');
  const [parent, child] = decodeTagId(tagId);
  return (
    <div className={cn(styles.filterPill)}>
      <span className={cn(styles.filterText)}>{child}</span>
      <CloseIcon onClick={() => view.selectedTagIds.delete(tagId)} />
    </div>
  );
}

export function ActiveFiltersView({ className }: ActiveFiltersViewProps) {
  const styles = useStyles();
  const view = usePartialView('selectedAssignees', 'selectedTagIds');
  const showClear =
    view.selectedAssignees.size > 0 || view.selectedTagIds.size > 0;
  const sortedAssignees = Array.from(view.selectedAssignees).sort(
    coreValueCompare
  );
  const sortedTagIds = Array.from(view.selectedTagIds).sort(coreValueCompare);

  return (
    <div className={className}>
      <div className={cn(styles.filtersView)}>
        {sortedAssignees.map((user) => (
          <AssigneePill key={user.key} user={user.manager} />
        ))}
        {sortedTagIds.map((tag) => (
          <TagPill tagId={tag} />
        ))}
        {showClear && (
          <Button
            onClick={() => {
              view.selectedAssignees.clear();
              view.selectedTagIds.clear();
            }}
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
