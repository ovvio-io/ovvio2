import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router';

import * as SetUtils from '../../../../base/set.ts';
import { coreValueCompare } from '../../../../base/core-types/comparable.ts';
import { WorkspaceGrouping } from '../../../../cfds/base/scheme-types.ts';
import { Query, QueryOptions } from '../../../../cfds/client/graph/query.ts';
import { VertexManager } from '../../../../cfds/client/graph/vertex-manager.ts';
import { GroupId } from '../../../../cfds/client/graph/vertex-source.ts';
import { User } from '../../../../cfds/client/graph/vertices/user.ts';
import { Workspace } from '../../../../cfds/client/graph/vertices/workspace.ts';
import { useBackdropStyles } from '../../../../styles/components/backdrop.tsx';
import { Button } from '../../../../styles/components/buttons.tsx';
import Layer from '../../../../styles/components/layer.tsx';
import Menu, { MenuItem } from '../../../../styles/components/menu.tsx';
import { IconPinOff } from '../../../../styles/components/new-icons/icon-pin-off.tsx';
import { IconPinOn } from '../../../../styles/components/new-icons/icon-pin-on.tsx';
import { brandLightTheme as theme } from '../../../../styles/theme.tsx';
import {
  LabelSm,
  TextSm,
  useTypographyStyles,
} from '../../../../styles/components/typography.tsx';
import { cn, makeStyles } from '../../../../styles/css-objects/index.ts';
import { layout } from '../../../../styles/layout.ts';
import { Devices, useCurrentDevice } from '../../../../styles/responsive.ts';
import { styleguide } from '../../../../styles/styleguide.ts';
import { createUniversalPortal } from '../../../../styles/utils/ssr.ts';
import {
  useActiveViewManager,
  useGraphManager,
  usePartialGlobalView,
  usePartialRootUser,
  usePartialUserSettings,
  useRootUser,
} from '../../core/cfds/react/graph.tsx';
import { useQuery2 } from '../../core/cfds/react/query.ts';
import { usePartialVertex } from '../../core/cfds/react/vertex.ts';
import { createUseStrings } from '../../core/localization/index.tsx';
import { Scroller } from '../../core/react-utils/scrolling.tsx';
import { useWorkspaceColor } from '../../shared/workspace-icon/index.tsx';
import { WorkspaceBarActions } from './actions.tsx';
import { IconMore } from '../../../../styles/components/new-icons/icon-more.tsx';
import { useLogger } from '../../core/cfds/react/logger.tsx';
import localization from './workspace-bar.strings.json' assert { type: 'json' };
import { IconGroup } from '../../../../styles/components/new-icons/icon-group.tsx';
import { IconCheck } from '../../../../styles/components/new-icons/icon-check.tsx';
import { IconUngroup } from '../../../../styles/components/new-icons/icon-ungroup.tsx';
import { IndeterminateProgressIndicator } from '../../../../styles/components/progress-indicator.tsx';
import { Repository } from '../../../../repo/repo.ts';
import { IconShow } from '../../../../styles/components/new-icons/icon-show.tsx';
import { IconSettings } from '../../../../styles/components/new-icons/icon-settings.tsx';
import { IconHide } from '../../../../styles/components/new-icons/icon-hide.tsx';
import { IconTemplateSet } from '../../../../styles/components/new-icons/icon-template-set.tsx';
import { IconTemplateUnset } from '../../../../styles/components/new-icons/icon-template-unset.tsx';
import { IconColor } from '../../../../styles/components/new-icons/types.ts';
import { View } from '../../../../cfds/client/graph/vertices/view.ts';
import { resolveWritingDirection } from '../../../../base/string.ts';
import { InfiniteVerticalScroll } from '../workspace-content/workspace-view/cards-display/list-view/infinite-scroll.tsx';
import { LineSeparator } from '../../../../styles/components/menu.tsx';
import { useMaxWidth } from '../index.tsx';

export const DEFAULT_WIDTH = styleguide.gridbase * 21;

const PAGE_SIZE = 30;

const useStyles = makeStyles(
  () => ({
    root: {
      flexShrink: 0,
      height: '100%',
      transitionTimingFunction: 'cubic-bezier(0.85, 0, 0.15, 1)',
      transitionDuration: '400ms',
      transitionProperty: 'width',
      boxShadow: theme.shadows.z4,
      backgroundColor: theme.colors.background,
      basedOn: [layout.column],
    },
    groupBy: {
      color: theme.mono.m10,
      fontFeatureSettings: "'clig' off, 'liga' off",
      padding: '8px 16px 8px 8px',
      backgroundColor: theme.secondary.s0,
      fontSize: '14px',
      fontStyle: 'normal',
      fontFamily: 'PoppinsSemiBold, HeeboSemiBold',
      lineHeight: 'normal',
    },
    backdrop: {
      basedOn: [useBackdropStyles.backdrop],
    },
    separator: {
      height: '1px',
      width: '100%',
      backgroundColor: theme.mono.m1,
      marginBottom: styleguide.gridbase * 0.5,
    },
    header: {
      width: '100%',
      flexShrink: 0,
      height: styleguide.gridbase * 17,
      justifyContent: 'space-between',
      basedOn: [layout.column],
    },
    logoContainer: {
      boxSizing: 'border-box',
      width: '100%',
      marginTop: styleguide.gridbase * 3,
      paddingLeft: styleguide.gridbase * 2,
      paddingRight: styleguide.gridbase * 1,
      alignItems: 'center',
      basedOn: [layout.row],
    },
    logoIcon: {
      flexShrink: 0,
    },
    logoText: {},

    rotated: {
      transform: 'rotate(180deg)',
    },
    workspacesHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      marginLeft: styleguide.gridbase,
    },
    toggleView: {
      padding: '0px 8px',
      boxSizing: 'border-box',
      marginBottom: styleguide.gridbase * 0.5,
      width: '100%',
      whiteSpace: 'nowrap',
      basedOn: [layout.column],
    },
    moreButton: {
      marginRight: styleguide.gridbase * 1,
      marginLeft: styleguide.gridbase * 0.5,
    },
    toggleActions: {
      marginTop: styleguide.gridbase,
      marginLeft: styleguide.gridbase,
      marginRight: styleguide.gridbase * 3.5,
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      basedOn: [layout.row],
    },
    toggleViewButton: {
      cursor: 'pointer',
      textDecoration: 'underline',
      basedOn: [useTypographyStyles.text],
    },
    toggleViewButtonDisabled: {
      cursor: 'not-allowed',
      color: theme.colors.placeholderText,
    },
    list: {
      overflowY: 'auto',
      overflowX: 'hidden',
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: '100%',
    },
    listItem: {
      height: styleguide.gridbase * 4,
      flexShrink: 0,
      marginBottom: styleguide.gridbase * 0.5,
      ':hover': {
        itemMenu: {
          opacity: 1,
        },
        pinButton: {
          opacity: 1,
        },
      },
      basedOn: [layout.row],
    },
    itemTab: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      cursor: 'pointer',
      userSelect: 'none',
      height: '100%',
      width: '100%',
      borderBottomRightRadius: styleguide.gridbase * 2,
      borderTopRightRadius: styleguide.gridbase * 2,
      paddingLeft: styleguide.gridbase * 2,
      paddingRight: styleguide.gridbase,
      boxSizing: 'border-box',
      alignItems: 'center',
      basedOn: [layout.row],
      ':hover': {
        border: `2px solid ${theme.mono.m6}`,
        borderLeft: 'none',
        paddingRight: styleguide.gridbase - 2,
      },
    },
    listItemExpanded: {
      itemTab: {
        borderBottomRightRadius: styleguide.gridbase * 2,
        borderTopRightRadius: styleguide.gridbase * 2,
      },
    },
    listItemSelected: {
      itemTab: {
        backgroundColor: 'var(--ws-background)',
      },
    },
    itemText: {
      overflowX: 'hidden',
      flexGrow: 1,
      flexShrink: 1,
      textOverflow: 'ellipsis',
      basedOn: [useTypographyStyles.text],
      whiteSpace: 'nowrap',
    },
    itemToggle: {
      marginLeft: styleguide.gridbase * 0.5,
      height: styleguide.gridbase * 2,
      width: styleguide.gridbase * 2,
      borderRadius: styleguide.gridbase,
      flexShrink: 0,
      background: 'var(--ws-inactive)',
      basedOn: [layout.column, layout.centerCenter],
    },
    itemToggleChecked: {
      background: 'var(--ws-active)',
    },
    itemMenu: {
      opacity: 0,
      ...styleguide.transition.short,
      transitionProperty: 'opacity',
      marginRight: styleguide.gridbase,
    },
    expander: {
      height: styleguide.gridbase * 4,
      padding: '0 16px',
      boxSizing: 'border-box',
      alignItems: 'left',
      width: '100%',
      basedOn: [layout.row],
      color: theme.colors.text,
      ':disabled': {
        color: theme.colors.grayedText,
      },
    },
    expanderText: {
      color: 'inherit',
      basedOn: [layout.flexSpacer, useTypographyStyles.bold],
      textAlign: 'left',
    },
    expanderIcon: {
      color: 'inherit',
      marginRight: styleguide.gridbase,
      transform: 'rotate(90deg)',
    },
    expanderIconOpen: {
      transform: 'rotate(270deg)',
    },
    pinButton: {
      opacity: 0,
      ...styleguide.transition.short,
      transitionProperty: 'opacity',
      marginLeft: styleguide.gridbase * 0.5,
      marginRight: styleguide.gridbase * 0.5,
    },
    pinButtonPinned: {
      opacity: 1,
    },
    personalIcon: {
      ...styleguide.transition.short,
      transitionProperty: 'opacity',
      marginLeft: styleguide.gridbase * 0.5,
      marginRight: styleguide.gridbase * 0.5,
      paddingRight: '2px',
      cursor: 'default',
    },
    loadingIndicator: {
      marginLeft: styleguide.gridbase,
      marginRight: styleguide.gridbase,
    },
    loadingIndicatorContainer: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    },
    hidden: {
      display: 'none',
    },
    workSpaceMenu: {
      top: '-7px',
    },
    itemMenuOpen: {
      opacity: 1,
      padding: '0px 6px 0px 0px',
    },
    collapsedSettings: {
      display: 'flex',
      justifyContent: 'flex-end',
      padding: '16px',
    },
    rtl: {
      direction: 'rtl',
      textAlign: 'left',
    },
    lastItem: {
      borderBottom: `1px solid #f5ecdc`,
    },
  }),
  'workspaces-bar_881015'
);

const useStrings = createUseStrings(localization);

type WorkspaceSystemGID = 'myWorkspace' | 'pinned' | 'hidden' | 'templates';

type WorkspaceGID = GroupId<VertexManager<User> | WorkspaceSystemGID>;

type GroupByMapping = {
  [key in WorkspaceGrouping]: (ws: Workspace) => WorkspaceGID | WorkspaceGID[];
};

function WorkspaceGIDToString(gid: WorkspaceGID): string {
  if (gid === null) {
    return 'null';
  }
  return typeof gid === 'string' ? gid : gid.key;
}

function systemGIDForWorkspace(ws: Workspace): WorkspaceSystemGID | null {
  const user = ws.graph.getRootVertex<User>();
  const personalWsKey = `${ws.graph.rootKey}-ws`;

  if (user.hiddenWorkspaces?.has(ws.key)) {
    return 'hidden';
  }
  if (user.pinnedWorkspaces?.has(ws.key)) {
    return 'pinned';
  }
  if (ws.isTemplate) {
    return 'templates';
  }
  if (ws.key === personalWsKey) {
    return 'myWorkspace';
  }
  return null;
}

const kWorkspaceGIDOrder: readonly (WorkspaceGID | 'groups')[] = [
  'myWorkspace',
  'pinned',
  null,
  'groups',
  'hidden',
  'templates',
];

function compareWorkspaceGID(gid1: WorkspaceGID, gid2: WorkspaceGID): number {
  if (gid1 === gid2) {
    return 0;
  }
  if (gid1 instanceof VertexManager && gid2 instanceof VertexManager) {
    return coreValueCompare(gid1, gid2);
  }
  const marker1 = gid1 instanceof VertexManager ? 'groups' : gid1;
  const marker2 = gid2 instanceof VertexManager ? 'groups' : gid2;
  let idx1 = kWorkspaceGIDOrder.indexOf(
    typeof marker1 === 'string' && marker1.length > 0 ? marker1 : null
  );
  if (idx1 < 0) {
    idx1 = kWorkspaceGIDOrder.indexOf('groups');
  }
  let idx2 = kWorkspaceGIDOrder.indexOf(
    typeof marker2 === 'string' && marker2.length > 0 ? marker2 : null
  );
  if (idx2 < 0) {
    idx2 = kWorkspaceGIDOrder.indexOf('groups');
  }
  return idx1 - idx2;
}

const GROUP_BY: GroupByMapping = {
  none: systemGIDForWorkspace,
  Employee: (ws: Workspace) => {
    const sysGID = systemGIDForWorkspace(ws);
    if (sysGID) {
      return sysGID;
    }
    const res: WorkspaceGID[] = [];
    for (const u of ws.users) {
      if (!u.isRoot) {
        res.push(u.manager);
      }
    }
    if (res.length === 0) {
      res.push(null);
    }
    return res;
  },

  Team: (ws: Workspace) => {
    const sysGID = systemGIDForWorkspace(ws);
    if (sysGID) {
      return sysGID;
    }
    const allTeams = new Set<string | null>();
    for (const u of ws.users) {
      SetUtils.update(allTeams, u.teams);
    }

    const res = Array.from(allTeams).filter((t) => t!.length > 0);

    if (res.length === 0) {
      res.push(null);
    }
    return res as WorkspaceGID[];
  },
};

function WorkspaceCheckbox({ toggled }: { toggled: boolean }) {
  const styles = useStyles();
  return (
    <div className={cn(styles.itemToggle, toggled && styles.itemToggleChecked)}>
      {toggled && <CheckIcon />}
    </div>
  );
}

export interface WorkspacesBarProps {
  className?: string;
  ofSettings?: boolean;
}

export function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        opacity="0.6"
        d="M6.82617 10.739L11 5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M5 8.13037L6.82605 10.739"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface WorkspaceToggleViewProps {
  onSelectAll: () => void;
  onUnselectAll: () => void;
  ofSettings: boolean | undefined;
  query: Query<Workspace, Workspace, WorkspaceGID>;
}

function WorkspaceToggleView({
  query,
  onSelectAll,
  onUnselectAll,
  ofSettings,
}: WorkspaceToggleViewProps) {
  const strings = useStrings();
  const styles = useStyles();
  const view = usePartialGlobalView(
    'workspaceGrouping',
    'workspaceBarCollapsed',
    'selectedWorkspaces'
  );
  const selectedRatio =
    query.count && view.selectedWorkspaces.size / query.count;

  const moreButtonRef = useRef(null); //ADDED

  return (
    <div className={cn(styles.toggleView)}>
      <div className={cn(styles.workspacesHeader)}>
        <LabelSm>{strings.myWorkspaces}</LabelSm>
        <Menu
          renderButton={() => (
            <div ref={moreButtonRef}>
              <IconMore className={cn(styles.moreButton)} />
            </div>
          )}
          popupClassName={cn(styles.workSpaceMenu)}
          direction="out"
          position="right"
          align="end"
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: theme.secondary.s0,
                padding: '0 4px 0 8px',
              }}
            >
              <IconGroup />
              <LabelSm className={styles.groupBy}>Group By:</LabelSm>
            </div>
          </div>

          <MenuItem
            onClick={() => {
              view.workspaceGrouping = 'Team';
            }}
          >
            {'Team'}
            {view.workspaceGrouping === 'Team' && <IconCheck />}
          </MenuItem>

          <MenuItem
            className={styles.lastItem}
            onClick={() => {
              view.workspaceGrouping = 'Employee';
            }}
          >
            {'Employee'}
            {view.workspaceGrouping === 'Employee' && <IconCheck />}
          </MenuItem>
          <div style={{ marginTop: '8px' }} />
          <LineSeparator height={1} />
          <MenuItem
            onClick={() => {
              view.workspaceGrouping = 'none';
            }}
            icon={(iconProps) => <IconUngroup color="blue" {...iconProps} />}
          >
            {'Ungroup'}
            {view.workspaceGrouping === 'none' && <IconCheck />}
          </MenuItem>
        </Menu>
      </div>
      {!ofSettings && (
        <div className={cn(styles.toggleActions)}>
          <TextSm
            onClick={onSelectAll}
            className={cn(
              styles.toggleViewButton,
              selectedRatio === 1 && styles.toggleViewButtonDisabled
            )}
          >
            Select All
          </TextSm>
          <TextSm
            onClick={onUnselectAll}
            className={cn(
              styles.toggleViewButton,
              selectedRatio === 0 && styles.toggleViewButtonDisabled
            )}
          >
            Unselect All
          </TextSm>
        </div>
      )}
    </div>
  );
}

function WorkspaceListItem({
  workspace,
  groupId,
  ofSettings,
  visible,
}: {
  workspace: VertexManager<Workspace>;
  groupId: WorkspaceGID;
  ofSettings: boolean | undefined;
  visible?: boolean;
}) {
  const color = useWorkspaceColor(workspace);
  const { name, isTemplate } = usePartialVertex(workspace, [
    'name',
    'isTemplate',
  ]);
  const dir = resolveWritingDirection(name);
  const styles = useStyles();
  const strings = useStrings();
  const graph = useGraphManager();
  const mgr = ofSettings
    ? graph.getVertexManager<View>('ViewWsSettings')
    : graph.getVertexManager<View>('ViewGlobal');

  const view = usePartialVertex(mgr, [
    'workspaceBarCollapsed',
    'selectedWorkspaces',
  ]);

  const partialUserSettings = usePartialUserSettings([
    'hiddenWorkspaces',
    'pinnedWorkspaces',
  ]);

  const style = useMemo<any>(
    () => ({
      '--ws-background': color.background,
      '--ws-inactive': color.inactive,
      '--ws-active': color.active,
    }),
    [color]
  );
  const repoId = Repository.id('data', workspace.key);
  const [loaded, setLoaded] = useState(graph.repositoryReady(repoId));
  const isSelected = view.selectedWorkspaces.has(workspace.getVertexProxy());
  const textRef = useRef<HTMLDivElement>(null);
  const { updateMaxWidth, updateMaxWidthSelected } = useMaxWidth();

  function measureTextWidth(
    text: string,
    font: string = '14px HeeboSemiBold'
  ): number {
    const canvas = new OffscreenCanvas(0, 0);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get 2D context from OffscreenCanvas.');
      return 0;
    }
    ctx.font = font;
    return ctx.measureText(text).width;
  }

  const extraPadding = styleguide.gridbase * 9;

  useEffect(() => {
    const measuredWidth = measureTextWidth(name, '14px PoppinsSemiBold');
    updateMaxWidth(measuredWidth + extraPadding);
  }, [name, updateMaxWidth]);

  useEffect(() => {
    if (isSelected) {
      const measuredWidthSelected = measureTextWidth(
        name,
        '14px PoppinsSemiBold'
      );
      updateMaxWidthSelected(measuredWidthSelected + extraPadding);
    }
  }, [name, view.selectedWorkspaces]);

  useEffect(() => {
    if (isSelected) {
      graph.prepareRepositoryForUI(repoId).then(() => setLoaded(true));
    } else {
      graph.stopSyncing(repoId);
    }
  }, [graph, repoId, isSelected]);

  const renderButton = useCallback(
    ({ isOpen }: { isOpen: boolean }) => (
      <div className={isOpen ? styles.itemMenuOpen : styles.itemMenu}>
        <IconMore />
      </div>
    ),
    []
  );

  const setWorkspaceState = useCallback(
    (state: 'template' | 'hidden' | 'pinned' | 'none') => {
      const vert = workspace.getVertexProxy();
      vert.isTemplate = state === 'template';
      partialUserSettings.hiddenWorkspaces[
        state === 'hidden' ? 'add' : 'delete'
      ](vert.key);
      partialUserSettings.pinnedWorkspaces[
        state === 'pinned' ? 'add' : 'delete'
      ](vert.key);
      if (state === 'template' || state === 'hidden') {
        view.selectedWorkspaces.delete(vert);
      }
    },
    [partialUserSettings, workspace, ofSettings]
  );
  const navigate = useNavigate();
  const mgrS = graph.getVertexManager<View>('ViewWsSettings');
  const viewS = usePartialVertex(mgrS, ['selectedWorkspaces']);
  const openWsSettings = useCallback(() => {
    const selectedWorkspaces = viewS.selectedWorkspaces;
    const vertS = workspace.getVertexProxy();
    selectedWorkspaces.clear();
    selectedWorkspaces.add(vertS);
    navigate('/settings/workspaces-info/General');
  }, [navigate, view, workspace]);

  const toggleSelected = useCallback(() => {
    const selectedWorkspaces = view.selectedWorkspaces;
    const vert = workspace.getVertexProxy();

    if (ofSettings) {
      if (!selectedWorkspaces.has(vert)) {
        selectedWorkspaces.clear();
        selectedWorkspaces.add(vert);
      } else {
        selectedWorkspaces.delete(vert);
      }
    } else {
      if (selectedWorkspaces.has(vert)) {
        selectedWorkspaces.delete(vert);
      } else {
        selectedWorkspaces.add(vert);
      }
    }
  }, [view, workspace]);
  return (
    <div
      className={cn(
        styles.listItem,
        !view.workspaceBarCollapsed && styles.listItemExpanded,
        isSelected && styles.listItemSelected
      )}
      style={style}
    >
      <div className={cn(styles.itemTab)} onClick={toggleSelected}>
        <div
          ref={textRef}
          className={cn(styles.itemText, dir === 'rtl' && styles.rtl)}
        >
          {name}
        </div>
        <WorkspaceCheckbox toggled={isSelected} />
      </div>
      {!loaded && visible && isSelected ? (
        <div
          className={cn(
            isSelected ? styles.loadingIndicatorContainer : styles.hidden
          )}
        >
          <IndeterminateProgressIndicator
            className={cn(styles.loadingIndicator)}
          />
        </div>
      ) : (
        <React.Fragment>
          {groupId === 'myWorkspace' && (
            <Button className={cn(styles.personalIcon)}>
              <img
                key="MyWorkspacePersonalIcon"
                src="/icons/settings/Personal.svg"
              />
            </Button>
          )}
          {groupId === 'myWorkspace' && (
            <Button className={cn(styles.personalIcon)}></Button>
          )}

          {groupId !== 'myWorkspace' && (
            <Button
              className={cn(
                styles.pinButton,
                groupId === 'pinned' && styles.pinButtonPinned
              )}
              onClick={() =>
                setWorkspaceState(groupId === 'pinned' ? 'none' : 'pinned')
              }
            >
              {groupId === 'pinned' ? <IconPinOn /> : <IconPinOff />}
            </Button>
          )}
          {groupId !== 'myWorkspace' && (
            <Menu
              renderButton={renderButton}
              direction="out"
              position="right"
              align="start"
            >
              {!isTemplate && (
                <MenuItem
                  onClick={() =>
                    setWorkspaceState(groupId === 'hidden' ? 'none' : 'hidden')
                  }
                >
                  {groupId === 'hidden' ? (
                    <IconShow color={IconColor.Primary} />
                  ) : (
                    <IconHide />
                  )}
                  {groupId === 'hidden'
                    ? strings.showWorkspace
                    : strings.hideWorkspace}
                </MenuItem>
              )}
              {groupId !== 'hidden' && (
                <MenuItem
                  onClick={() =>
                    setWorkspaceState(
                      groupId === 'templates' ? 'none' : 'template'
                    )
                  }
                >
                  {groupId === 'templates' ? (
                    <IconTemplateUnset />
                  ) : (
                    <IconTemplateSet />
                  )}

                  {groupId === 'templates'
                    ? strings.unsetTemplate
                    : strings.setTemplate}
                </MenuItem>
              )}

              <MenuItem onClick={openWsSettings}>
                <IconSettings />
                {strings.workspaceSettings}
              </MenuItem>
            </Menu>
          )}
        </React.Fragment>
      )}
    </div>
  );
}

interface WorkspaceListProps {
  query: Query<Workspace, Workspace, WorkspaceGID>;
  ofSettings: boolean | undefined;
}

function WorkspacesList({ query, ofSettings }: WorkspaceListProps) {
  const graph = useGraphManager();
  const styles = useStyles();
  const strings = useStrings();
  const view = usePartialGlobalView(
    'expandedWorkspaceGroups',
    'workspaceBarCollapsed',
    'selectedWorkspaces',
    'workspaceGrouping'
  );
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (query) {
      query.limit = limit + PAGE_SIZE;
    }
  }, [query, limit]);

  const toggleExpanded = useCallback(
    (gid: WorkspaceGID) => {
      const expandedWorkspaceGroups = view.expandedWorkspaceGroups;
      const key = WorkspaceGIDToString(gid);
      if (expandedWorkspaceGroups.has(key)) {
        expandedWorkspaceGroups.delete(key);
      } else {
        expandedWorkspaceGroups.add(key);
      }
    },
    [view]
  );
  const contents: JSX.Element[] = [];
  const groups = query.groups();
  if (!groups.includes('hidden')) {
    groups.push('hidden');
  }
  let separatorCount = 0;
  for (const gid of query.groups()) {
    if (contents.length > 0) {
      contents.push(
        <div
          className={cn(styles.separator)}
          key={`wsBar/sep/${++separatorCount}`}
        />
      );
    }
    const rows = query.group(gid);
    const expanded = view.expandedWorkspaceGroups.has(
      WorkspaceGIDToString(gid)
    );
    if (gid !== 'pinned' && gid !== null && gid !== 'myWorkspace') {
      const selectedCount = SetUtils.intersectionSize(
        view.selectedWorkspaces,
        query.vertices(gid)
      );

      let groupTitle = '';
      if (view.workspaceGrouping === 'Team') {
        if (typeof gid === 'string') {
          groupTitle = gid as string;
        }
      } else {
        groupTitle =
          typeof gid === 'string'
            ? expanded
              ? strings[gid]
              : strings[`${gid}Short`]
            : gid.getVertexProxy().name;
      }
      contents.push(
        <Button
          key={`wsbar/${gid instanceof VertexManager ? gid.key : gid}/expander`}
          className={cn(styles.expander)}
          disabled={!rows.length}
          onClick={() => toggleExpanded(gid)}
        >
          <div className={cn(styles.expanderText)}>
            {groupTitle}
            {selectedCount > 0 ? ` [${selectedCount}]` : ''}
          </div>
          <ExpanderIcon
            className={cn(
              styles.expanderIcon,
              expanded && styles.expanderIconOpen
            )}
          />
        </Button>
      );
    }

    const personalWsKey = `${graph.rootKey}-ws`;
    if (gid === 'pinned' || gid === 'myWorkspace' || gid === null || expanded) {
      for (const ws of query.group(gid)) {
        if (ofSettings && ws.key === personalWsKey) {
          continue;
        }
        contents.push(
          <WorkspaceListItem
            key={`wsbar/${gid instanceof VertexManager ? gid.key : gid}/${
              ws.key
            }`}
            workspace={ws}
            groupId={gid}
            ofSettings={ofSettings}
            visible={contents.length < limit}
          />
        );
      }
    }
  }

  return (
    <Scroller onScroll={(x, y) => setScrollY(y)}>
      {(ref) => (
        <div ref={ref} className={cn(styles.list)}>
          {contents}
          <InfiniteVerticalScroll
            limit={limit}
            setLimit={setLimit}
            pageSize={PAGE_SIZE}
            recordsLength={query?.count || 0}
            isVisible={false}
          />
        </div>
      )}
    </Scroller>
  );
}
export function ExpanderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        opacity="0.8"
        d="M10 8L6 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.8"
        d="M6 12L10 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
function shouldAutoSelectWorkspace(
  ws: Workspace,
  groups: Iterable<WorkspaceGID>,
  expandedWorkspaceGroups: Set<string>
): boolean {
  if (ws.isTemplate) {
    return false;
  }
  const user = ws.graph.getRootVertex<User>();
  const hiddenWorkspaces = user.hiddenWorkspaces;
  if (hiddenWorkspaces.has(ws.key)) {
    return false;
  }
  if (user.pinnedWorkspaces.has(ws.key)) {
    return true;
  }
  for (const gid of groups) {
    if (
      gid === null ||
      expandedWorkspaceGroups.has(gid instanceof VertexManager ? gid.key : gid)
    ) {
      return true;
    }
  }
  return false;
}

function WorkspaceBarWrapper({ className, ofSettings }: WorkspacesBarProps) {
  const graph = useGraphManager();
  const view = usePartialGlobalView('workspaceGrouping');
  const partialUserSettings = usePartialUserSettings([
    'hiddenWorkspaces',
    'pinnedWorkspaces',
  ]);

  const query = useQuery2(
    useMemo(() => {
      return {
        source: graph.sharedQuery('workspaces'),
        predicate: (ws: Workspace) => true,
        groupBy: view.workspaceGrouping
          ? GROUP_BY[view.workspaceGrouping]
          : undefined,
        groupComparator: compareWorkspaceGID,
        name: 'WorkspaceBar',
        contentSensitive: true,
        contentFields: ['isTemplate'],
      } as QueryOptions<Workspace, Workspace, GroupId<WorkspaceGID>>;
    }, [graph, view, partialUserSettings])
  );

  return (
    <WorkspaceBarInternal
      className={className}
      query={query}
      ofSettings={ofSettings}
    />
  );
}

function findAssetPath(filter: (asset: string) => boolean): string | undefined {
  const assetsList = (self as any).OvvioAssetsList as string[];
  for (const p of assetsList) {
    if (filter(p)) {
      return p;
    }
  }
  return undefined;
}

const LOGO_PATH =
  findAssetPath((path) => path.startsWith('/logo.')) || '/logo.svg';
const LOGO_EXTRA_PATH =
  findAssetPath((path) => path.startsWith('/logo-extra.')) || '/logo-extra.svg';

function WorkspaceBarInternal({
  className,
  query,
  ofSettings,
}: {
  className?: string;
  query: Query<Workspace, Workspace, WorkspaceGID>;
  ofSettings?: boolean;
}) {
  const styles = useStyles();
  const logger = useLogger();
  const activeViewMgr = useActiveViewManager();
  const view = usePartialGlobalView(
    'selectedWorkspaces',
    'expandedWorkspaceGroups',
    'workspaceBarCollapsed',
    'noteType'
  );
  const [isHovered, setIsHovered] = useState(false);
  const { maxWidth } = useMaxWidth();

  const selectAll = useCallback(() => {
    view.selectedWorkspaces = new Set(
      query.transform(
        (ws) =>
          shouldAutoSelectWorkspace(
            ws,
            query.groupsForKey(ws.key),
            view.expandedWorkspaceGroups
          ),
        (mgr) => mgr.getVertexProxy()
      )
    );
    view.selectedWorkspaces.add(
      view.graph.getVertex<Workspace>(`${view.graph.rootKey}-ws`)
    );
    logger.log({
      severity: 'EVENT',
      event: 'FilterChange',
      type: 'workspace',
      source: 'bar:workspace',
      added: 'ALL',
    });
  }, [view, logger, query]);

  const unselectAll = useCallback(() => {
    view.selectedWorkspaces.clear();
    logger.log({
      severity: 'EVENT',
      event: 'FilterChange',
      type: 'workspace',
      source: 'bar:workspace',
      removed: 'ALL',
    });
  }, [logger, view]);

  return (
    <Layer priority={2}>
      {(style) => (
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{ ...style, width: isHovered ? maxWidth : DEFAULT_WIDTH }}
          className={cn(styles.root, className)}
        >
          <div className={cn(styles.header)}>
            {ofSettings ? (
              <div></div>
            ) : (
              <div className={cn(styles.logoContainer)}>
                <img
                  key="LOGO"
                  className={cn(styles.logoIcon)}
                  src={LOGO_PATH}
                />
                <img
                  key="LOGO-EXTRA"
                  className={cn(styles.logoText)}
                  src={LOGO_EXTRA_PATH}
                />
              </div>
            )}
            <WorkspaceToggleView
              query={query}
              onSelectAll={selectAll}
              onUnselectAll={unselectAll}
              ofSettings={ofSettings}
            />
          </div>
          <WorkspacesList query={query} ofSettings={ofSettings} />
          <WorkspaceBarActions ofSettings={ofSettings} />
        </div>
      )}
    </Layer>
  );
}

function MobileBar({ ...rest }: WorkspacesBarProps) {
  const styles = useStyles();
  const view = usePartialGlobalView('workspaceBarCollapsed');

  return createUniversalPortal(
    <Layer priority={3}>
      {(style) => (
        <React.Fragment>
          {!view.workspaceBarCollapsed && (
            <div
              style={style}
              className={cn(styles.backdrop)}
              onClick={() => {
                view.workspaceBarCollapsed = true;
              }}
            />
          )}
          <WorkspaceBarWrapper {...rest} />
        </React.Fragment>
      )}
    </Layer>
  );
}

function DesktopBar(props: WorkspacesBarProps) {
  return <WorkspaceBarWrapper {...props} />;
}

export function WorkspacesBar(props: WorkspacesBarProps) {
  const device = useCurrentDevice();
  const isMobile = device < Devices.Tablet;
  if (isMobile) {
    return <MobileBar {...props} />;
  }
  return <DesktopBar {...props} />;
}
