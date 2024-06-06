import React, {
  MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { mapIterable, unionIter } from '../../../../../../../../base/common.ts';
import * as SetUtils from '../../../../../../../../base/set.ts';
import { coreValueCompare } from '../../../../../../../../base/core-types/comparable.ts';
import { notReached } from '../../../../../../../../base/error.ts';
import {
  decodeTagId,
  encodeTagId,
} from '../../../../../../../../cfds/base/scheme-types.ts';
import { VertexId } from '../../../../../../../../cfds/client/graph/vertex.ts';
import { User } from '../../../../../../../../cfds/client/graph/vertices/user.ts';
import Layer from '../../../../../../../../styles/components/layer.tsx';
import { brandLightTheme as theme } from '../../../../../../../../styles/theme.tsx';
import { useTypographyStyles } from '../../../../../../../../styles/components/typography.tsx';
import {
  cn,
  makeStyles,
} from '../../../../../../../../styles/css-objects/index.ts';
import { layout } from '../../../../../../../../styles/layout.ts';
import { styleguide } from '../../../../../../../../styles/styleguide.ts';
import { createUniversalPortal } from '../../../../../../../../styles/utils/ssr.ts';
import {
  useGraphManager,
  usePartialView,
  useRootUser,
} from '../../../../../../core/cfds/react/graph.tsx';
import { useSharedQuery } from '../../../../../../core/cfds/react/query.ts';
import {
  usePartialVertex,
  usePartialVertices,
} from '../../../../../../core/cfds/react/vertex.ts';
import { createUseStrings } from '../../../../../../core/localization/index.tsx';
import { FilterCheckbox, FilterCheckboxState } from './filter-checkbox.tsx';
import localization from './filters.strings.json' assert { type: 'json' };
import { VertexManager } from '../../../../../../../../cfds/client/graph/vertex-manager.ts';
import { Tag } from '../../../../../../../../cfds/client/graph/vertices/index.ts';
import { Query } from '../../../../../../../../cfds/client/graph/query.ts';

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
    const u = (user.manager as VertexManager<User>).getVertexProxy();
    if (view.selectedAssignees.has(u)) {
      view.selectedAssignees.delete(u);
    } else {
      view.selectedAssignees.add(u);
    }
  }, [view, user]);

  return (
    <div className={cn(styles.sectionOption)} onClick={toggleSelected}>
      <RadioCheckBox
        checked={view.selectedAssignees.has(user.manager.getVertexProxy())}
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

  const click: MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
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

export function FiltersView({ className }: FiltersViewProps) {
  const styles = useStyles();
  const view = usePartialView('showFilters');

  return (
    <div className={cn(styles.root)}>
      <Layer>
        {(style) => (
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
              <InternalFiltersView hidden={!view.showFilters} />
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
  debugger;
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
    (name: string) => {
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
      {values.map((child) => (
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
          onClick={() => setShowMore((x) => !x)}
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
      SetUtils.update(uniqueAssignees, ws.users);
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
    () =>
      view.deleteFromSet('selectedAssignees', (u) => !assignees.includes(u)),
    [assignees, view]
  );

  return result;
}

export function canUnifyParentTags(t1: Tag, t2: Tag): boolean {
  if (
    t1.name !== t2.name ||
    t1.childTags.length !== t2.childTags.length ||
    t1.childTags.length <= 0
  ) {
    return false;
  }
  const names = t1.childTags.map((t) => t.name);
  for (const child of t2.childTags) {
    if (!names.includes(child.name)) {
      return false;
    }
  }
  return true;
}

type UnifiedTagDisplay = [name: string, ...value: string[]];

function useUnifiedTags(): UnifiedTagDisplay[] {
  const view = usePartialView('selectedWorkspaces');
  const parentTagsByName = useSharedQuery('parentTagsByName');
  const childTagsByWs = useSharedQuery('childTags');
  const childTags = usePartialVertices(
    childTagsByWs.transform((t) => view.selectedWorkspaces.has(t.workspace)),
    ['name', 'parentTag']
  );
  const result = useMemo(() => {
    const result: UnifiedTagDisplay[] = [];
    const selectedWorkspaces = view.selectedWorkspaces;
    for (const name of parentTagsByName.groups()) {
      if (!name) {
        continue;
      }
      const values = new Set<string>();
      for (const parent of parentTagsByName.group(name)) {
        const t = parent.getVertexProxy();
        if (selectedWorkspaces.has(t.workspace)) {
          SetUtils.update(
            values,
            childTags
              .filter((child) => child.parentTag === t)
              .map((t) => t.name)
          );
        }
      }
      if (values.size > 0) {
        result.push([name!, ...Array.from(values).sort(coreValueCompare)]);
      }
    }
    return result;
  }, [view, parentTagsByName]);

  useEffect(() => {
    view.deleteFromSet('selectedTagIds', (id) => {
      const [parent, child] = decodeTagId(id);
      for (const [cat, ...values] of result) {
        if (cat === parent && values.includes(child!)) {
          return false;
        }
      }
      return true;
    });
  }, [result, view]);
  return result;
}

function UnifiedTagsFilterViewSection() {
  const unifiedTags = useUnifiedTags();
  return (
    <>
      {unifiedTags.map(([title, ...values]) =>
        title === 'Status' ? null : <TagSection parentTagName={title} />
      )}
    </>
  );
}

interface InternalFiltersViewProps {
  hidden?: boolean;
}

function InternalFiltersView({ hidden }: InternalFiltersViewProps) {
  const styles = useStyles();
  const strings = useStrings();
  const [showMore, setShowMore] = useState(false);
  const [assignees, hasMore] = useUnifiedAssignees(showMore);

  return (
    <div className={cn(styles.filtersView)}>
      {hidden !== true && (
        <div className={cn(styles.section)}>
          <div className={cn(styles.sectionHeader)}>{strings.assignees}</div>
          {...assignees.map((assignee) => (
            <AssigneeView user={assignee.manager} />
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
      )}
      {hidden !== true && <UnifiedTagsFilterViewSection />}
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
