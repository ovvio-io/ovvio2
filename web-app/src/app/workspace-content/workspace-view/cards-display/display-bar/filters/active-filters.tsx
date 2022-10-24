import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { User } from '@ovvio/cfds/lib/client/graph/vertices';
import { layout, styleguide } from '@ovvio/styles';
import { Button } from '@ovvio/styles/lib/components/buttons';
import { useTypographyStyles } from '@ovvio/styles/lib/components/typography';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { useTheme } from '@ovvio/styles/lib/theme';
import { usePartialVertex } from 'core/cfds/react/vertex';
import { FiltersStateController, SharedTag } from './state';
import { brandLightTheme as theme } from '@ovvio/styles/lib/theme';

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
  filters: FiltersStateController;
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
  tag: SharedTag;
  onDelete: (tag: SharedTag) => void;
}) {
  const styles = useStyles();
  return (
    <div className={cn(styles.filterPill)}>
      <span className={cn(styles.filterText)}>{tag.displayName}</span>
      <CloseIcon onClick={() => onDelete(tag)} />
    </div>
  );
}

export function ActiveFiltersView({
  filters,
  className,
}: ActiveFiltersViewProps) {
  const styles = useStyles();
  const showClear = !!(
    filters.activeAssignees.length || filters.activeTags.length
  );
  return (
    <div className={className}>
      <div className={cn(styles.filtersView)}>
        {filters.activeAssignees.map(user => (
          <AssigneePill
            key={user.key}
            user={user}
            onDelete={filters.toggleAssignee}
          />
        ))}
        {filters.activeTags.map(tag => (
          <TagPill key={tag.key} tag={tag} onDelete={filters.toggleTag} />
        ))}
        {showClear && (
          <Button onClick={() => filters.setActiveFilters([])}>Clear</Button>
        )}
      </div>
    </div>
  );
}
