import * as SetUtils from '@ovvio/base/lib/utils/set';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Tag, User } from '@ovvio/cfds/lib/client/graph/vertices';
import { layout, styleguide } from '@ovvio/styles';
import Layer from '@ovvio/styles/lib/components/layer';
import { useTypographyStyles } from '@ovvio/styles/lib/components/typography';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { brandLightTheme as theme } from '@ovvio/styles/lib/theme';
import { createUniversalPortal } from '@ovvio/styles/lib/utils/ssr';
import {
  useGraphManager,
  usePartialView,
  useRootUser,
} from 'core/cfds/react/graph';
import { usePartialVertex } from 'core/cfds/react/vertex';
import { createUseStrings } from 'core/localization';
import React, {
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { FilterCheckbox, FilterCheckboxState } from './filter-checkbox';
import localization from './filters.strings.json';
import { coreValueCompare } from '@ovvio/cfds/lib/core-types';
import { VertexId } from '@ovvio/cfds/lib/client/graph/vertex';
import { useSharedQuery } from 'core/cfds/react/query';
import { notReached } from '@ovvio/base/lib/utils/error';
import { decodeTagId, encodeTagId } from '@ovvio/cfds/lib/base/scheme-types';
import { mapIterable } from '@ovvio/base/lib/utils/common';

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

function AssigneeView({ user: userId }: { user: VertexId<User> }) {
  const user = usePartialVertex(userId, ['name']);
  const styles = useStyles();
  const view = usePartialView('selectedAssignees');
  const toggleSelected = useCallback(() => {
    const u = user as User;
    if (view.selectedAssignees.has(u)) {
      view.selectedAssignees.delete(u);
    } else {
      view.selectedAssignees.add(u);
    }
  }, [view, user]);
  return (
    <div className={cn(styles.sectionOption)} onClick={toggleSelected}>
      <RadioCheckBox
        checked={view.selectedAssignees.has(user as User)}
        onChecked={toggleSelected}
      />{' '}
      {user.name}
    </div>
  );
}

export interface FiltersViewProps {
  className?: string;
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

export function FiltersView({ className }: FiltersViewProps) {
  const styles = useStyles();
  const view = usePartialView('showFilters');

  return (
    <div className={cn(styles.root)}>
      <Layer>
        {style => (
          <React.Fragment>
            {view.showFilters && (
              <FilterBackdrop
                style={style}
                onClick={() => {
                  view.showFilters = false;
                }}
              />
            )}

            <div
              className={cn(
                className,
                styles.animator,
                !view.showFilters && styles.hide
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

function useUnifiedTagCategory(name: string): UnifiedTagDisplay {
  const unifiedTags = useUnifiedTags();
  for (const cat of unifiedTags) {
    if (cat[0] === name) {
      return cat;
    }
  }
  notReached('Unexpected tag category');
}

function useTagSectionState(
  parentName: string
): [FilterCheckboxState, () => void] {
  const view = usePartialView('selectedTagIds');
  let [, ...values] = useUnifiedTagCategory(parentName);
  return useMemo(() => {
    let selectedCount = 0;
    for (const v of values) {
      if (view.selectedTagIds.has(encodeTagId(parentName, v))) {
        ++selectedCount;
      }
    }
    const state: FilterCheckboxState =
      selectedCount === values.length
        ? 'on'
        : selectedCount === 0
        ? 'off'
        : 'partial';
    return [
      state,
      () => {
        for (const v of values) {
          if (state === 'on') {
            view.selectedTagIds.delete(encodeTagId(parentName, v));
          } else {
            view.selectedTagIds.add(encodeTagId(parentName, v));
          }
        }
      },
    ];
  }, [parentName, values, view]);
}

function TagSection({ parentTagName }: { parentTagName: string }) {
  const styles = useStyles();
  const strings = useStrings();
  const view = usePartialView('selectedTagIds');
  const [showMore, setShowMore] = useState(false);
  const [sectionState, toggleSection] = useTagSectionState(parentTagName);
  let [, ...values] = useUnifiedTagCategory(parentTagName);

  const hasMore = values.length > SECTION_SIZE;
  if (!showMore) {
    values = values.slice(0, SECTION_SIZE);
  }

  const toggleTag = useCallback(
    name => {
      const id = encodeTagId(parentTagName, name);
      if (view.selectedTagIds.has(id)) {
        view.selectedTagIds.delete(id);
      } else {
        view.selectedTagIds.add(id);
      }
    },
    [view, parentTagName]
  );

  return (
    <div className={cn(styles.section)}>
      <div className={cn(styles.sectionHeader)}>
        <RadioCheckBox checked={sectionState} onChecked={toggleSection} />
        {parentTagName}
      </div>
      {values.map(child => (
        <div
          className={cn(styles.sectionOption)}
          onClick={() => toggleTag(child)}
        >
          <RadioCheckBox
            checked={view.selectedTagIds.has(encodeTagId(parentTagName, child))}
            onChecked={() => toggleTag(child)}
          />
          {child}
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

type UnifiedAssignees = [assignees: readonly User[], hasMore: boolean];

function useUnifiedAssignees(showMore: boolean): UnifiedAssignees {
  const rootUser = useRootUser();
  const view = usePartialView('selectedWorkspaces');
  const [result, assignees]: [UnifiedAssignees, User[]] = useMemo(() => {
    const uniqueAssignees = new Set<User>();
    for (const ws of view.selectedWorkspaces) {
      SetUtils.update(uniqueAssignees, ws.assignees);
    }
    const assignees = Array.from(uniqueAssignees).sort((a, b) =>
      a.key === rootUser.key
        ? -1
        : b.key === rootUser.key
        ? 1
        : b.name.localeCompare(a.name)
    );
    const hasMore = assignees.length > SECTION_SIZE;
    return [
      [!showMore ? assignees.slice(0, SECTION_SIZE) : assignees, hasMore],
      assignees,
    ];
  }, [showMore, view.selectedWorkspaces, rootUser]);

  // Clear selected assignees that are no longer relevant
  useEffect(
    () => view.deleteFromSet('selectedAssignees', u => !assignees.includes(u)),
    [assignees, view]
  );

  return result;
}

// function canUnifyParentTags(t1: Tag, t2: Tag): boolean {
//   if (
//     t1.name !== t2.name ||
//     t1.childTags.length !== t2.childTags.length ||
//     t1.childTags.length <= 0
//   ) {
//     return false;
//   }
//   const names = t1.childTags.map(t => t.name);
//   for (const child of t2.childTags) {
//     if (!names.includes(child.name)) {
//       return false;
//     }
//   }
//   return true;
// }

type UnifiedTagDisplay = [name: string, ...value: string[]];

function useUnifiedTags(): UnifiedTagDisplay[] {
  const view = usePartialView('selectedWorkspaces');
  const parentTagsByName = useSharedQuery('parentTagsByName');
  const result = useMemo(() => {
    const result: UnifiedTagDisplay[] = [];
    const selectedWorkspaces = view.selectedWorkspaces;
    for (const name of parentTagsByName.groups()) {
      const values = new Set<string>();
      for (const parent of parentTagsByName.group(name)) {
        const t = parent.getVertexProxy();
        if (selectedWorkspaces.has(t.workspace)) {
          SetUtils.update(
            values,
            mapIterable(t.childTags, tag => tag.name)
          );
        }
      }
      if (values.size > 0) {
        result.push([name, ...Array.from(values).sort(coreValueCompare)]);
      }
    }
    return result;
  }, [view.selectedWorkspaces, parentTagsByName]);

  useEffect(() => {
    view.deleteFromSet('selectedTagIds', id => {
      const [parent, child] = decodeTagId(id);
      for (const [cat, ...values] of result) {
        if (cat === parent && values.includes(child)) {
          return false;
        }
      }
      return true;
    });
  }, [result, view]);
  return result;
}

function InternalFiltersView() {
  const styles = useStyles();
  const strings = useStrings();
  const [showMore, setShowMore] = useState(false);
  const [assignees, hasMore] = useUnifiedAssignees(showMore);
  const unifiedTags = useUnifiedTags();

  return (
    <div className={cn(styles.filtersView)}>
      <div className={cn(styles.section)}>
        <div className={cn(styles.sectionHeader)}>{strings.assignees}</div>
        {assignees.map(assignee => (
          <AssigneeView user={assignee} />
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
      {unifiedTags.map(([title, ...values]) =>
        title === 'Status' ? null : <TagSection parentTagName={title} />
      )}
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
