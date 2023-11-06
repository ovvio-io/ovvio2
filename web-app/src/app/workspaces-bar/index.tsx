import React, {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from 'react';
import * as SetUtils from '../../../../base/set.ts';
import { coreValueCompare } from '../../../../base/core-types/comparable.ts';
import { WorkspaceGrouping } from '../../../../cfds/base/scheme-types.ts';
import { Query, QueryOptions } from '../../../../cfds/client/graph/query.ts';
import { VertexManager } from '../../../../cfds/client/graph/vertex-manager.ts';
import { GroupId } from '../../../../cfds/client/graph/vertex-source.ts';
import { Role } from '../../../../cfds/client/graph/vertices/role.ts';
import { User } from '../../../../cfds/client/graph/vertices/user.ts';
import { Workspace } from '../../../../cfds/client/graph/vertices/workspace.ts';
import { useBackdropStyles } from '../../../../styles/components/backdrop.tsx';
import { Button } from '../../../../styles/components/buttons.tsx';
import Layer from '../../../../styles/components/layer.tsx';
import Menu, { MenuItem } from '../../../../styles/components/menu.tsx';
import { IconPinOff } from '../../../../styles/components/new-icons/icon-pin-off.tsx';
import { IconPinOn } from '../../../../styles/components/new-icons/icon-pin-on.tsx';
import Tooltip from '../../../../styles/components/tooltip/index.tsx';
import { brandLightTheme as theme } from '../../../../styles/theme.tsx';
import {
  useTypographyStyles,
  LabelSm,
  TextSm,
} from '../../../../styles/components/typography.tsx';
import { makeStyles, cn } from '../../../../styles/css-objects/index.ts';
import { layout } from '../../../../styles/layout.ts';
import {
  MediaQueries,
  useCurrentDevice,
  Devices,
} from '../../../../styles/responsive.ts';
import { styleguide } from '../../../../styles/styleguide.ts';
import { createUniversalPortal } from '../../../../styles/utils/ssr.ts';
import {
  usePartialGlobalView,
  useRootUser,
  useGraphManager,
  usePartialRootUser,
  useActiveViewManager,
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
import { LogoText } from '../../../../styles/components/logo.tsx';
import { LogoIcon } from '../../../../styles/components/logo.tsx';
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

const EXPANDED_WIDTH = styleguide.gridbase * 25;
const COLLAPSED_WIDTH = styleguide.gridbase * 14;

const useStyles = makeStyles(
  () => ({
    root: {
      flexShrink: 0,
      width: '90vw',
      maxWidth: EXPANDED_WIDTH,
      // overflowY: 'hidden',
      // overflowX: 'visible',
      height: '100%',
      ...styleguide.transition.standard,
      transitionProperty: 'width',
      [MediaQueries.Mobile]: {
        position: 'absolute',
        top: 0,
        left: 0,
        transitionProperty: 'transform',
        transform: 'translateX(0)',
      },
      boxShadow: theme.shadows.z4,
      backgroundColor: theme.colors.background,
      basedOn: [layout.column],
    },
    groupBy: {
      color: theme.colors['monochrom-m-10'] || '#262626',
      fontFeatureSettings: "'clig' off, 'liga' off",
      padding: '8px 16px 8px 8px',
      backgroundColor: theme.secondary.s0,
      fontFamily: 'Poppins',
      fontSize: '14px',
      fontStyle: 'normal',
      fontWeight: '500',
      lineHeight: 'normal',
    },

    collapsed: {
      [MediaQueries.Tablet]: {
        width: COLLAPSED_WIDTH,
      },
      [MediaQueries.Mobile]: {
        transform: 'translateX(-100%)',
        boxShadow: 'none',
        openBarButton: {
          boxShadow: theme.shadows.z4,
        },
      },
    },
    backdrop: {
      basedOn: [useBackdropStyles.backdrop],
    },
    mobileTabButton: {
      [MediaQueries.Tablet]: {
        display: 'none !important',
      },
      position: 'absolute',
      top: styleguide.gridbase,
      left: 0,
      width: styleguide.gridbase * 6,
      height: styleguide.gridbase * 5,
      backgroundColor: theme.colors.background,
      ...styleguide.transition.standard,
      transitionProperty: 'transform',
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
    openBarButton: {
      [MediaQueries.Mobile]: {
        position: 'absolute',
        left: '100%',
        transform: 'translateX(-16px)',
        backgroundColor: theme.colors.background,
        width: styleguide.gridbase * 6,
        height: styleguide.gridbase * 5,
        borderRadius: `0 ${styleguide.gridbase * 2.5}px ${
          styleguide.gridbase * 2.5
        }px 0`,
      },
    },
    rotated: {
      transform: 'rotate(180deg)',
    },
    workspacesHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      // marginRight: styleguide.gridbase,
      marginLeft: styleguide.gridbase,
    },
    toggleView: {
      padding: [0, styleguide.gridbase * 1],
      boxSizing: 'border-box',
      marginBottom: styleguide.gridbase * 0.5,
      width: '100%',
      // alignItems: 'center',
      // justifyContent: 'space-between',
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
      cursor: 'pointer',
      userSelect: 'none',
      height: '100%',
      width: '100%',
      minWidth: COLLAPSED_WIDTH + styleguide.gridbase * 3,
      borderBottomRightRadius: styleguide.gridbase * 2,
      borderTopRightRadius: styleguide.gridbase * 2,
      maxWidth: styleguide.gridbase * 20.5,
      paddingLeft: styleguide.gridbase * 2,
      paddingRight: styleguide.gridbase * 0.5,

      boxSizing: 'border-box',
      alignItems: 'center',
      whiteSpace: 'nowrap',
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
      padding: [0, styleguide.gridbase * 2],
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
  }),

  'workspaces-bar_881015'
);

const useStrings = createUseStrings(localization);

type WorkspaceSystemGID = 'pinned' | 'hidden' | 'templates';

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
  if (user.hiddenWorkspaces.has(ws.key)) {
    return 'hidden';
  }
  if (user.pinnedWorkspaces.has(ws.key)) {
    return 'pinned';
  }
  if (ws.isTemplate) {
    return 'templates';
  }
  return null;
}

const kWorkspaceGIDOrder: readonly (WorkspaceGID | 'groups')[] = [
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
  const idx1 = kWorkspaceGIDOrder.indexOf(
    typeof marker1 === 'string' ? marker1 : null
  );
  const idx2 = kWorkspaceGIDOrder.indexOf(
    typeof marker2 === 'string' ? marker2 : null
  );
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
    for (const u of ws.assignees) {
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
    const res: WorkspaceGID[] = [];
    // const role = ws.graph.getVertex<Role>('RoleTeamLeader');
    // const teamLeaders = role.assignees;
    const teamLeaders = new Set<User>();
    for (const u of ws.assignees) {
      if (teamLeaders.has(u) && !u.isRoot) {
        res.push(u.manager);
      }
    }
    if (res.length === 0) {
      res.push(null);
    }
    return res;
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
}

function CheckIcon() {
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

function CollapseIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_591_1399)">
        <path
          opacity="0.6"
          d="M9 12L15 18"
          stroke="#3184DD"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.6"
          d="M15 6L9 12"
          stroke="#1960CF"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_591_1399">
          <rect width="24" height="24" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

function IconUngroupWithColor(props) {
  const { color, ...otherProps } = props;
  return <IconUngroup color={color} {...otherProps} />;
}

interface WorkspaceToggleViewProps {
  onSelectAll: () => void;
  onUnselectAll: () => void;
  query: Query<Workspace, Workspace, WorkspaceGID>;
}

function WorkspaceToggleView({
  query,
  onSelectAll,
  onUnselectAll,
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
      {!view.workspaceBarCollapsed && (
        <div className={cn(styles.workspacesHeader)}>
          <LabelSm>{strings.myWorkspaces}</LabelSm>
          <Menu
            renderButton={() => (
              <div ref={moreButtonRef}>
                <IconMore className={cn(styles.moreButton)} />
              </div>
            )}
            popupClassName={cn(styles.workSpaceMenu)}
            anchor={moreButtonRef.current}
            placement="auto-end"
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
                }}
              >
                <div
                  style={{
                    padding: '0 4px',
                  }}
                ></div>
                <IconGroup style={{ marginRight: '8px' }} color="blue" />
                <LabelSm className={styles.groupBy}>Group By:</LabelSm>
              </div>
            </div>

            <MenuItem
              onClick={() => {
                view.workspaceGrouping = 'Team';
              }}
            >
              {'Team'}
              {view.workspaceGrouping === 'Team' && (
                <IconCheck color={'blue'} />
              )}
            </MenuItem>

            <MenuItem
              onClick={() => {
                view.workspaceGrouping = 'Employee';
              }}
            >
              {'Employee'}
              {view.workspaceGrouping === 'Employee' && (
                <IconCheck color={'blue'} />
              )}
            </MenuItem>
            <div style={{ marginTop: '8px' }} />

            <MenuItem
              onClick={() => {
                view.workspaceGrouping = 'none';
              }}
              icon={(iconProps) => (
                <IconUngroupWithColor color="blue" {...iconProps} />
              )}
            >
              {'Ungroup'}
              {view.workspaceGrouping === 'none' && (
                <IconCheck color={'blue'} />
              )}
            </MenuItem>
          </Menu>
        </div>
      )}
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
    </div>
  );
}

function WorkspaceListItem({
  workspace,
  groupId,
}: {
  workspace: VertexManager<Workspace>;
  groupId: WorkspaceGID;
}) {
  const color = useWorkspaceColor(workspace);
  const { name, isTemplate } = usePartialVertex(workspace, [
    'name',
    'isTemplate',
  ]);
  const styles = useStyles();
  const strings = useStrings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const view = usePartialGlobalView(
    'workspaceBarCollapsed',
    'selectedWorkspaces'
  );
  const user = usePartialVertex(useRootUser(), [
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
  const graph = useGraphManager();
  const repoId = Repository.id('data', workspace.key);
  const [loaded, setLoaded] = useState(graph.repositoryIsActive(repoId));
  const isSelected = view.selectedWorkspaces.has(workspace.getVertexProxy());

  useEffect(() => {
    if (isSelected) {
      graph.loadRepository(repoId).then(() => setLoaded(true));
    }
  }, [graph, repoId, isSelected]);

  const textRef = useRef<HTMLDivElement>(null);
  const isOverflowing =
    textRef.current &&
    textRef.current.offsetWidth < textRef.current.scrollWidth;

  // const renderButton = useCallback(() => <IconMore />, []);
  const renderButton = useCallback(
    ({ isOpen }) => (
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
      user.hiddenWorkspaces[state === 'hidden' ? 'add' : 'delete'](vert.key);
      user.pinnedWorkspaces[state === 'pinned' ? 'add' : 'delete'](vert.key);
      if (state === 'template' || state === 'hidden') {
        view.selectedWorkspaces.delete(vert);
      }
    },
    [
      user.hiddenWorkspaces,
      user.pinnedWorkspaces,
      view.selectedWorkspaces,
      workspace,
    ]
  );

  const toggleSelected = useCallback(() => {
    const selectedWorkspaces = view.selectedWorkspaces;
    const vert = workspace.getVertexProxy();
    if (selectedWorkspaces.has(vert)) {
      selectedWorkspaces.delete(vert);
    } else {
      selectedWorkspaces.add(vert);
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
      <Tooltip text={name} disabled={!isOverflowing} position="right">
        <div
          className={cn(styles.itemTab)}
          onClick={toggleSelected}
          // onContextMenu={toggleSelected}
        >
          <div ref={textRef} className={cn(styles.itemText)}>
            {name}
          </div>

          <WorkspaceCheckbox toggled={isSelected} />
        </div>
      </Tooltip>
      <div /*className={cn(layout.flexSpacer)}*/ />
      {!view.workspaceBarCollapsed &&
        (!loaded ? (
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
            <Menu
              renderButton={renderButton}
              direction="out"
              position="right"
              align="start"
              // className={cn(styles.itemMenu)}
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
              <MenuItem onClick={() => setIsSettingsOpen(true)}>
                <IconSettings />
                {strings.workspaceSettings}
              </MenuItem>
            </Menu>
          </React.Fragment>
        ))}
      {/* <WorkspaceSettingsDialog
        workspaceManager={workspace}
        isOpen={isSettingsOpen}
        hide={() => setIsSettingsOpen(false)}
      /> */}
    </div>
  );
}

//   return (
//     <div
//       className={cn(
//         styles.listItem,
//         !view.workspaceBarCollapsed && styles.listItemExpanded,
//         isSelected && styles.listItemSelected
//       )}
//       style={style}
//     >
//       <Tooltip text={name} disabled={!isOverflowing} position="right">
//         <div
//           className={cn(styles.itemTab)}
//           onClick={toggleSelected}
//           // onContextMenu={toggleSelected}
//         >
//           <div ref={textRef} className={cn(styles.itemText)}>
//             {name}
//           </div>

//           <WorkspaceCheckbox toggled={isSelected} />
//         </div>
//       </Tooltip>
//       <div /*className={cn(layout.flexSpacer)}*/ />
//       {!view.workspaceBarCollapsed && (
//         <React.Fragment>
//           <Button
//             className={cn(
//               styles.pinButton,
//               groupId === "pinned" && styles.pinButtonPinned
//             )}
//             onClick={() =>
//               setWorkspaceState(groupId === "pinned" ? "none" : "pinned")
//             }
//           >
//             {groupId === "pinned" ? <IconPinOn /> : <IconPinOff />}
//           </Button>
//           <Menu
//             renderButton={renderButton}
//             direction="out"
//             position="right"
//             align="start"
//             className={cn(styles.itemMenu)}
//           >
//             <MenuItem
//               onClick={() => setIsSettingsOpen(true)}
//               icon={IconSettings}
//             >
//               {strings.workspaceSettings}
//             </MenuItem>
//             {!isTemplate && (
//               <MenuItem
//                 onClick={() =>
//                   setWorkspaceState(groupId === "hidden" ? "none" : "hidden")
//                 }
//                 icon={IconAdd}
//               >
//                 {groupId === "hidden"
//                   ? strings.showWorkspace
//                   : strings.hideWorkspace}
//               </MenuItem>
//             )}
//             {groupId !== "hidden" && (
//               <MenuItem
//                 onClick={() =>
//                   setWorkspaceState(
//                     groupId === "templates" ? "none" : "template"
//                   )
//                 }
//                 icon={IconAttachment}
//               >
//                 {groupId === "templates"
//                   ? strings.unsetTemplate
//                   : strings.setTemplate}
//               </MenuItem>
//             )}
//           </Menu>
//         </React.Fragment>
//       )}
//       {/* <WorkspaceSettingsDialog
//         workspaceManager={workspace}
//         isOpen={isSettingsOpen}
//         hide={() => setIsSettingsOpen(false)}
//       /> */}
//     </div>
//   );
// }

function ExpanderIcon({ className }: { className?: string }) {
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

interface WorkspaceListProps {
  query: Query<Workspace, Workspace, WorkspaceGID>;
}

function WorkspacesList({ query }: WorkspaceListProps) {
  const styles = useStyles();
  const strings = useStrings();
  const view = usePartialGlobalView(
    'expandedWorkspaceGroups',
    'workspaceBarCollapsed',
    'selectedWorkspaces'
  );

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
  for (const gid of query.groups()) {
    if (contents.length > 0) {
      contents.push(<div className={cn(styles.separator)} />);
    }
    const rows = query.group(gid);
    const expanded = view.expandedWorkspaceGroups.has(
      WorkspaceGIDToString(gid)
    );
    if (gid !== 'pinned' && gid !== null) {
      const selectedCount = SetUtils.intersectionSize(
        view.selectedWorkspaces,
        query.vertices(gid)
      );
      contents.push(
        <Button
          key={`wsbar/${gid instanceof VertexManager ? gid.key : gid}/expander`}
          className={cn(styles.expander)}
          disabled={!rows.length}
          onClick={() => toggleExpanded(gid)}
        >
          <div className={cn(styles.expanderText)}>
            {typeof gid === 'string'
              ? expanded
                ? strings[gid]
                : strings[`${gid}Short`]
              : gid.getVertexProxy().name}
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
    if (gid === 'pinned' || gid === null || expanded) {
      for (const ws of rows) {
        contents.push(
          <WorkspaceListItem
            key={`wsbar/${gid instanceof VertexManager ? gid.key : gid}/${
              ws.key
            }`}
            workspace={ws}
            groupId={gid}
          />
        );
      }
    }
  }

  return (
    <Scroller>
      {(ref) => (
        <div ref={ref} className={cn(styles.list)}>
          {contents}
        </div>
      )}
    </Scroller>
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
      (gid instanceof VertexManager && expandedWorkspaceGroups.has(gid.key))
    ) {
      return true;
    }
  }
  return false;
}

function WorkspaceBarWrapper({ className }: WorkspacesBarProps) {
  const graph = useGraphManager();
  const view = usePartialGlobalView('workspaceGrouping');
  const partialUser = usePartialRootUser(
    'hiddenWorkspaces',
    'pinnedWorkspaces'
  );

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
    }, [
      graph,
      view.workspaceGrouping,
      partialUser.hiddenWorkspaces,
      partialUser.pinnedWorkspaces,
    ])
  );

  return <WorkspaceBarInternal className={className} query={query} />;
}

function WorkspaceBarInternal({
  className,
  query,
}: {
  className?: string;
  query: Query<Workspace, Workspace, WorkspaceGID>;
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
    logger.log({
      severity: 'INFO',
      event: 'FilterChange',
      type: 'workspace',
      source: 'bar:workspace',
      added: 'ALL',
    });
  }, [view, logger, query]);

  // Clear view settings when no workspace is selected
  useEffect(() => {
    if (view.selectedWorkspaces.size === 0) {
      const activeView = activeViewMgr.getVertexProxy();
      activeView.clearFilters();
      activeView.clearContentsDisplaySettings();
    }
  }, [activeViewMgr, view.selectedWorkspaces]);

  const unselectAll = useCallback(() => {
    view.clear();
    logger.log({
      severity: 'INFO',
      event: 'FilterChange',
      type: 'workspace',
      source: 'bar:workspace',
      removed: 'ALL',
    });
  }, [logger, view]);

  // const pinWorkspace = (ws: VertexManager<Workspace>, pinned?: boolean) => {
  //   const proxy = user.getVertexProxy();
  //   const current = new Set(proxy.pinnedWorkspaces);
  //   const hidden = new Set(proxy.hiddenWorkspaces);
  //   pinned = typeof pinned === 'undefined' ? !current.has(ws.key) : pinned;
  //   if (pinned) {
  //     current.add(ws.key);
  //     if (hidden.has(ws.key)) {
  //       hidden.delete(ws.key);
  //       proxy.hiddenWorkspaces = hidden;
  //     }
  //   } else if (current.has(ws.key)) {
  //     current.delete(ws.key);
  //   }
  //   eventLogger.wsAction(pinned ? 'PIN_WORKSPACE' : 'UNPIN_WORKSPACE', ws, {});
  //   proxy.pinnedWorkspaces = current;
  // };

  // const hideWorkspace = (ws: VertexManager<Workspace>, hidden?: boolean) => {
  //   const proxy = user.getVertexProxy();
  //   const current = new Set(proxy.hiddenWorkspaces);
  //   const pinned = new Set(proxy.pinnedWorkspaces);
  //   hidden = typeof hidden === 'undefined' ? !current.has(ws.key) : hidden;
  //   if (hidden) {
  //     current.add(ws.key);
  //     if (pinned.has(ws.key)) {
  //       pinned.delete(ws.key);
  //       proxy.pinnedWorkspaces = pinned;
  //     }
  //   } else if (current.has(ws.key)) {
  //     current.delete(ws.key);
  //   }
  //   eventLogger.wsAction(hidden ? 'HIDE_WORKSPACE' : 'SHOW_WORKSPACE', ws, {});
  //   proxy.hiddenWorkspaces = current;
  //   if (hidden && view.selectedWorkspaces.has(ws.getVertexProxy())) {
  //     view.selectedWorkspaces.delete(ws.getVertexProxy());
  //     setView({
  //       ...view,
  //       selectedWorkspaces: view.selectedWorkspaces,
  //     });
  //   }
  // };

  return (
    <Layer priority={2}>
      {(style) => (
        <div
          style={style}
          className={cn(
            styles.root,
            view.workspaceBarCollapsed && styles.collapsed,
            className
          )}
        >
          <div className={cn(styles.header)}>
            <div className={cn(styles.logoContainer)}>
              <LogoIcon className={cn(styles.logoIcon)} />
              {/* <img src="/Logo_precise_fold.png" alt="logo-small" /> */}
              {!view.workspaceBarCollapsed && (
                <LogoText className={cn(styles.logoText)} />
              )}
              {/* {!view.workspaceBarCollapsed && (
                <img src="/Logo_precise_open.png" alt="logo-ful" />
              )} */}
              <div className={cn(layout.flexSpacer)} />
              <Button
                className={cn(styles.openBarButton)}
                onClick={() => {
                  view.workspaceBarCollapsed = !view.workspaceBarCollapsed;
                }}
              >
                <CollapseIcon
                  className={
                    view.workspaceBarCollapsed ? styles.rotated : undefined
                  }
                />
              </Button>
            </div>
            <WorkspaceToggleView
              // selectedRatio={
              //   query.count && view.selectedWorkspaces.size / query.count
              // }
              query={query}
              onSelectAll={selectAll}
              onUnselectAll={unselectAll}
            />
          </div>
          <WorkspacesList query={query} />
          <WorkspaceBarActions />
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
