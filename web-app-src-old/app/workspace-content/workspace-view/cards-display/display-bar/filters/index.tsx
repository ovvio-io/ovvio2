import React, { MouseEvent, useState, useCallback } from 'react';
import {
  Filter,
  Tag,
  User,
} from '../../../../../../../../cfds/client/graph/vertices/index.ts';
import { layout, styleguide } from '../../../../../../../../styles/index.ts';
import Layer from '../../../../../../../../styles/components/layer.tsx';
import { useTypographyStyles } from '../../../../../../../../styles/components/typography.tsx';
import {
  cn,
  makeStyles,
} from '../../../../../../../../styles/css-objects/index.ts';
import { brandLightTheme as theme } from '../../../../../../../../styles/theme.tsx';
import { createUniversalPortal } from '../../../../../../../../styles/utils/ssr.ts';
import {
  usePartialVertex,
  useVertex,
  useVertices,
} from '../../../../../../core/cfds/react/vertex.ts';
import { createUseStrings } from '../../../../../../core/localization/index.tsx';
import { FilterCheckbox, FilterCheckboxState } from './filter-checkbox.tsx';
import localization from './filters.strings.json' assert { type: 'json' };
import {
  useExistingQuery,
  useSharedQuery,
} from '../../../../../../core/cfds/react/query.ts';
import * as SetUtils from '../../../../../../../../base/set.ts';
import { coreValueCompare } from '../../../../../../../../base/core-types/comparable.ts';
import { useFilter } from '../../../../../index.tsx';
import { VertexId } from '../../../../../../../../cfds/client/graph/vertex.ts';

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
  user: VertexId<User>;
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

  const click = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (onClick) {
        onClick();
      }
    },
    [onClick]
  );

  return createUniversalPortal(
    <div style={style} className={styles.backdrop} onClick={click} />
  );
}

export function FiltersView({
  className,
  isVisible,
  setIsVisible,
}: FiltersViewProps) {
  const styles = useStyles();
  return (
    <div className={cn(styles.root)}>
      <Layer>
        {(style) => (
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
              <InternalFiltersView />
            </div>
          </React.Fragment>
        )}
      </Layer>
    </div>
  );
}

const SECTION_SIZE = 5;

function toggleTag(filter: Filter, tag: Tag): void {
  if (tag.parent) {
    if (filter.tags.has(tag)) {
      filter.tags.delete(tag);
    } else {
      filter.tags.add(tag);
    }
  } else {
    for (const t of tag.childTagsQuery.results) {
      const childTag = t.getVertexProxy();
      if (filter.tags.has(childTag)) {
        filter.tags.delete(childTag);
      } else {
        filter.tags.add(childTag);
      }
    }
  }
}

function getTagState(filter: Filter, tag: Tag): FilterCheckboxState {
  const filterTags = filter.tags;
  if (filterTags.has(tag)) {
    return FilterCheckboxState.On;
  }
  if (!tag.parentTag) {
    for (const childMgr of tag.childTagsQuery.results) {
      if (filterTags.has(childMgr.getVertexProxy())) {
        return FilterCheckboxState.Partial;
      }
    }
  }
  return FilterCheckboxState.Off;
}

function TagSection({ tag }: { tag: VertexId<Tag> }) {
  const styles = useStyles();
  const strings = useStrings();
  const [showMore, setShowMore] = useState(false);
  const parentTag = useVertex(tag);
  const childTagsQuery = useExistingQuery(parentTag.childTagsQuery);
  const filter = useFilter();

  let visibleTags = useVertices(childTagsQuery.results);
  const hasMore = visibleTags.length > SECTION_SIZE;
  if (!showMore) {
    visibleTags = visibleTags.slice(0, SECTION_SIZE);
  }

  return (
    <div className={cn(styles.section)}>
      <div className={cn(styles.sectionHeader)}>
        <RadioCheckBox
          checked={getTagState(filter, parentTag)}
          onChecked={() => toggleTag(filter, parentTag)}
        />
        {parentTag.name}
      </div>
      {visibleTags.map((childTag) => (
        <div
          className={cn(styles.sectionOption)}
          key={childTag.key}
          onClick={() => toggleTag(filter, childTag)}
        >
          <RadioCheckBox
            checked={getTagState(filter, childTag)}
            onChecked={() => toggleTag(filter, childTag)}
          />
          {childTag.name}
        </div>
      ))}
      {hasMore && (
        <div
          onClick={() => setShowMore((x) => !x)}
          className={cn(styles.showMore)}
        >
          {showMore ? strings.showLess : strings.showMore}
        </div>
      )}
    </div>
  );
}

function InternalFiltersView() {
  const styles = useStyles();
  const strings = useStrings();
  const filter = useFilter();
  const selectedWorkspacesQuery = useSharedQuery('selectedWorkspaces');
  const selectedWorkspaces = useVertices(selectedWorkspacesQuery.results);
  const parentTagsQuery = useSharedQuery('parentTags');
  const assigneesSet = new Set<User>();
  for (const ws of selectedWorkspaces) {
    SetUtils.update(assigneesSet, ws.users);
  }
  let assignees = Array.from(assigneesSet).sort(coreValueCompare);

  const [showMore, setShowMore] = useState(false);

  const hasMore = assignees.length > SECTION_SIZE;
  if (!showMore) {
    assignees = assignees.slice(0, SECTION_SIZE);
  }

  return (
    <div className={cn(styles.filtersView)}>
      <div className={cn(styles.section)}>
        <div className={cn(styles.sectionHeader)}>{strings.assignees}</div>
        {assignees.map((user) => (
          <AssigneeView
            user={user}
            {...user}
            onToggle={() => SetUtils.toggleMembership(filter.assignees, user)}
          />
        ))}
        {hasMore && (
          <div
            onClick={() => setShowMore((x) => !x)}
            className={cn(styles.showMore)}
          >
            {showMore ? strings.showLess : strings.showMore}
          </div>
        )}
      </div>
      {parentTagsQuery.map((tag) => (
        <TagSection tag={tag} />
      ))}
    </div>
  );
}

function RadioCheckBox({
  checked,
  onChecked,
}: {
  checked: boolean | FilterCheckboxState;
  onChecked: () => void;
}) {
  const styles = useStyles();
  return (
    <div className={cn(styles.checkbox)}>
      <FilterCheckbox checked={checked} onChecked={onChecked} />
    </div>
  );
}
