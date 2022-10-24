import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Tag, User } from '@ovvio/cfds/lib/client/graph/vertices';
import { layout, styleguide } from '@ovvio/styles';
import Layer from '@ovvio/styles/lib/components/layer';
import { useTypographyStyles } from '@ovvio/styles/lib/components/typography';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { brandLightTheme as theme } from '@ovvio/styles/lib/theme';
import { createUniversalPortal } from '@ovvio/styles/lib/utils/ssr';
import { useRootUser } from 'core/cfds/react/graph';
import { usePartialVertex } from 'core/cfds/react/vertex';
import { createUseStrings } from 'core/localization';
import React, { MouseEvent, useState } from 'react';
import { FilterCheckbox } from './filter-checkbox';
import localization from './filters.strings.json';
import {
  FiltersStateController,
  ParentTagState,
  SharedParentTag,
  SharedTag,
} from './state';

const useStyles = makeStyles(
  () => ({
    root: {
      position: 'relative',
      overflow: 'visible',
    },
    animator: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      opacity: 1,
      transform: 'translateY(0)',
      overflow: 'hidden',
      ...styleguide.transition.standard,

      transitionProperty: 'all',
      background: theme.secondary.s2,
      boxShadow: theme.shadows.z1,
    },
    hide: {
      pointerEvents: 'none',
      boxShadow: 'none',
      opacity: 0,
      transform: `translateY(${styleguide.gridbase * -2}px)`,
    },
    container: {},
    filtersView: {
      width: '100%',
      maxHeight: styleguide.gridbase * 30,
      overflowY: 'auto',
      boxSizing: 'border-box',
      padding: [styleguide.gridbase * 2, 0],
      flexWrap: 'wrap',
      basedOn: [layout.row],
    },
    section: {
      width: styleguide.gridbase * 22,
      marginRight: styleguide.gridbase * 4,
      marginBottom: styleguide.gridbase * 2,
    },
    sectionHeader: {
      marginBottom: styleguide.gridbase,
      alignItems: 'center',
      cursor: 'pointer',
      userSelect: 'none',
      basedOn: [useTypographyStyles.bold, layout.row],
    },
    sectionOption: {
      height: styleguide.gridbase * 2.5,
      marginBottom: styleguide.gridbase * 0.5,
      alignItems: 'center',
      cursor: 'pointer',
      userSelect: 'none',
      basedOn: [useTypographyStyles.text, layout.row],
    },
    showMore: {
      height: styleguide.gridbase * 2.5,
      marginBottom: styleguide.gridbase * 0.5,
      textDecoration: 'underline',
      alignItems: 'center',
      cursor: 'pointer',
      userSelect: 'none',
      basedOn: [useTypographyStyles.text, layout.row],
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      right: 0,
      left: 0,
      bottom: 0,
    },
    checkbox: {
      marginRight: styleguide.gridbase,
      basedOn: [layout.column, layout.centerCenter],
    },
  }),
  'filters_965b1f'
);

const useStrings = createUseStrings(localization);

function AssigneeView({
  selected,
  user,
  onToggle,
}: {
  selected: boolean;
  user: VertexManager<User>;
  onToggle: () => void;
}) {
  const u = usePartialVertex(user, ['name']);
  const styles = useStyles();
  return (
    <div className={cn(styles.sectionOption)} onClick={onToggle}>
      <RadioCheckBox checked={selected} onChecked={onToggle} /> {u.name}
    </div>
  );
}

export interface FiltersViewProps {
  className?: string;
  filters: FiltersStateController;
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
}

function FilterBackdrop({
  style,
  onClick,
}: {
  style: {};
  onClick?: () => void;
}) {
  const styles = useStyles();

  const click = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClick();
  };

  return createUniversalPortal(
    <div style={style} className={styles.backdrop} onClick={click} />
  );
}

export function FiltersView({
  className,
  filters,
  isVisible,
  setIsVisible,
}: FiltersViewProps) {
  const styles = useStyles();
  return (
    <div className={cn(styles.root)}>
      <Layer>
        {style => (
          <React.Fragment>
            {isVisible && (
              <FilterBackdrop
                style={style}
                onClick={() => setIsVisible(false)}
              />
            )}

            <div
              className={cn(
                className,
                styles.animator,
                !isVisible && styles.hide
              )}
              style={{ zIndex: style.zIndex + 1 }}
            >
              <InternalFiltersView filters={filters} />
            </div>
          </React.Fragment>
        )}
      </Layer>
    </div>
  );
}

const SECTION_SIZE = 5;

function TagSection({
  tag,
  toggleTag,
}: {
  tag: Readonly<SharedParentTag>;
  toggleTag: (tag: Tag | SharedTag) => void;
}) {
  const styles = useStyles();
  const strings = useStrings();
  const [showMore, setShowMore] = useState(false);

  let visibleTags = Object.entries(tag.childTags);
  const hasMore = visibleTags.length > SECTION_SIZE;
  if (!showMore) {
    visibleTags = visibleTags.slice(0, SECTION_SIZE);
  }

  return (
    <div className={cn(styles.section)}>
      <div className={cn(styles.sectionHeader)}>
        <RadioCheckBox checked={tag.status} onChecked={() => toggleTag(tag)} />
        {tag.displayName}
      </div>
      {visibleTags.map(([childKey, child]) => (
        <div
          className={cn(styles.sectionOption)}
          key={childKey}
          onClick={() => toggleTag(child)}
        >
          <RadioCheckBox
            checked={child.selected}
            onChecked={() => toggleTag(child)}
          />
          {child.displayName}
        </div>
      ))}
      {hasMore && (
        <div
          onClick={() => setShowMore(x => !x)}
          className={cn(styles.showMore)}
        >
          {showMore ? strings.showLess : strings.showMore}
        </div>
      )}
    </div>
  );
}

function InternalFiltersView({ filters }: { filters: FiltersStateController }) {
  const styles = useStyles();
  const strings = useStrings();
  const rootUser = useRootUser();
  let assignees = filters.assignees
    .slice()
    .sort((a, b) =>
      a.user.key === rootUser.key
        ? -1
        : b.user.key === rootUser.key
        ? 1
        : b.user.displayName.localeCompare(a.user.displayName)
    );

  const [showMore, setShowMore] = useState(false);

  const hasMore = assignees.length > SECTION_SIZE;
  if (!showMore) {
    assignees = assignees.slice(0, SECTION_SIZE);
  }

  return (
    <div className={cn(styles.filtersView)}>
      <div className={cn(styles.section)}>
        <div className={cn(styles.sectionHeader)}>{strings.assignees}</div>
        {assignees.map(assignee => (
          <AssigneeView
            key={assignee.user.key}
            {...assignee}
            onToggle={() => filters.toggleAssignee(assignee.user)}
          />
        ))}
        {hasMore && (
          <div
            onClick={() => setShowMore(x => !x)}
            className={cn(styles.showMore)}
          >
            {showMore ? strings.showLess : strings.showMore}
          </div>
        )}
      </div>
      {Object.entries(filters.tags).map(([key, parent]) => (
        <TagSection key={key} tag={parent} toggleTag={filters.toggleTag} />
      ))}
    </div>
  );
}

function RadioCheckBox({
  checked,
  onChecked,
}: {
  checked: boolean | ParentTagState;
  onChecked: () => void;
}) {
  const styles = useStyles();
  return (
    <div className={cn(styles.checkbox)}>
      <FilterCheckbox checked={checked} onChecked={onChecked} />
    </div>
  );
}
