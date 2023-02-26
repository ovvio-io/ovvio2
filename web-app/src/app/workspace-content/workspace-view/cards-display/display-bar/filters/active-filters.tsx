import React from 'https://esm.sh/react@18.2.0';
import { VertexManager } from '../../../../../../../../cfds/client/graph/vertex-manager.ts';
import { User } from '../../../../../../../../cfds/client/graph/vertices/user.ts';
import { layout, styleguide } from '../../../../../../../../styles/index.ts';
import { Button } from '../../../../../../../../styles/components/buttons.tsx';
import { useTypographyStyles } from '../../../../../../../../styles/components/typography.tsx';
import {
  cn,
  makeStyles,
} from '../../../../../../../../styles/css-objects/index.ts';
import {
  useTheme,
  brandLightTheme as theme,
} from '../../../../../../../../styles/theme.tsx';
import { usePartialVertex } from '../../../../../../core/cfds/react/vertex.ts';
import { Tag } from '../../../../../../../../cfds/client/graph/vertices/tag.ts';
import { useFilter } from '../../../../../index.tsx';
import { coreValueCompare } from '../../../../../../../../base/core-types/comparable.ts';

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

function CloseIcon({ onClick }: { onClick?: () => void }) {
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

function AssigneePill({
  user,
  onDelete,
}: {
  user: VertexManager<User>;
  onDelete: (user: VertexManager<User>) => void;
}) {
  const styles = useStyles();
  const { name } = usePartialVertex(user, ['name']);

  return (
    <div className={cn(styles.filterPill)}>
      <span className={cn(styles.filterText)}>{name}</span>
      <CloseIcon onClick={() => onDelete(user)} />
    </div>
  );
}

function TagPill({
  tag,
  onDelete,
}: {
  tag: Tag;
  onDelete: (tag: Tag) => void;
}) {
  const styles = useStyles();
  return (
    <div className={cn(styles.filterPill)}>
      <span className={cn(styles.filterText)}>{tag.name}</span>
      <CloseIcon onClick={() => onDelete(tag)} />
    </div>
  );
}

export function ActiveFiltersView({ className }: ActiveFiltersViewProps) {
  const styles = useStyles();
  const filter = useFilter();
  const showClear = filter.tags.size + filter.assignees.size > 0;

  return (
    <div className={className}>
      <div className={cn(styles.filtersView)}>
        {Array.from(filter.assignees)
          .sort(coreValueCompare)
          .map((user) => (
            <AssigneePill
              key={user.key}
              user={user.manager}
              onDelete={() => filter.assignees.delete(user)}
            />
          ))}
        {Array.from(filter.tags)
          .sort(coreValueCompare)
          .map((tag) => (
            <TagPill
              key={tag.key}
              tag={tag}
              onDelete={() => filter.tags.delete(tag)}
            />
          ))}
        {showClear && (
          <Button
            onClick={() => {
              filter.assignees.clear();
              filter.tags.clear();
            }}
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
