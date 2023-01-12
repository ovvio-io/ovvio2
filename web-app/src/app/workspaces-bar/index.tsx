import React, {
  MouseEvent,
  MouseEventHandler,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'https://esm.sh/react@18.2.0';
import * as SetUtils from '../../../../base/set.ts';
import { VertexManager } from '../../../../cfds/client/graph/vertex-manager.ts';
import { Workspace } from '../../../../cfds/client/graph/vertices/workspace.ts';
import { sortMngStampCompare } from '../../../../cfds/client/sorting.ts';
import { layout, styleguide } from '../../../../styles/index.ts';
import { useBackdropStyles } from '../../../../styles/components/backdrop.tsx';
import { Button } from '../../../../styles/components/buttons.tsx';
import { IconOverflow } from '../../../../styles/components/icons/index.ts';
import Layer from '../../../../styles/components/layer.tsx';
import { LogoIcon, LogoText } from '../../../../styles/components/logo.tsx';
import Menu, { MenuItem } from '../../../../styles/components/menu.tsx';
import { IconPinOff } from '../../../../styles/components/new-icons/icon-pin-off.tsx';
import { IconPinOn } from '../../../../styles/components/new-icons/icon-pin-on.tsx';
import Tooltip from '../../../../styles/components/tooltip/index.tsx';
import {
  LabelSm,
  TextSm,
  useTypographyStyles,
} from '../../../../styles/components/typography.tsx';
import { cn, makeStyles } from '../../../../styles/css-objects/index.ts';
import {
  Devices,
  MediaQueries,
  useCurrentDevice,
} from '../../../../styles/responsive.ts';
import { brandLightTheme as theme } from '../../../../styles/theme.tsx';
import { Scroller } from '../../../../styles/utils/scrolling/index.tsx';
import { createUniversalPortal } from '../../../../styles/utils/ssr.ts';
import { sortWorkspaces } from '../../app/workspace-content/workspace-view/cards-display/card-item/workspace-indicator.tsx';
import {
  useGraphManager,
  usePartialCurrentUser,
  usePartialUserSettings,
  useRootUser,
  useUserSettings,
} from '../../core/cfds/react/graph.tsx';
import {
  useExistingQuery,
  useSharedQuery,
} from '../../core/cfds/react/query.ts';
import {
  usePartialVertex,
  usePartialVertices,
  useVertex,
  useVertices,
} from '../../core/cfds/react/vertex.ts';
import { createUseStrings } from '../../core/localization/index.tsx';
import {
  LOGIN,
  useHistoryStatic,
} from '../../core/react-utils/history/index.tsx';
import { useWorkspaceColor } from '../../shared/workspace-icon/index.tsx';
import { WorkspaceBarActions } from './actions.tsx';
import localization from './workspace-bar.strings.json' assert { type: 'json' };
import WorkspaceSettingsDialog from './workspace-settings-dialog/index.tsx';
import {
  toggleActionFromEvent,
  toggleSelectionItem,
} from './ws-selection-utils.ts';
import { User } from '../../../../cfds/client/graph/vertices/user.ts';
import { UserSettings } from '../../../../cfds/client/graph/vertices/user-settings.ts';
import { useLogger } from '../../core/cfds/react/logger.tsx';
import { Query } from '../../../../cfds/client/graph/query.ts';

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
      padding: [0, styleguide.gridbase * 2],
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
    toggleView: {
      padding: [0, styleguide.gridbase * 2],
      boxSizing: 'border-box',
      marginBottom: styleguide.gridbase * 0.5,
      width: '100%',
      // alignItems: 'center',
      // justifyContent: 'space-between',
      whiteSpace: 'nowrap',
      basedOn: [layout.column],
    },
    toggleActions: {
      marginTop: styleguide.gridbase,
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
      paddingRight: styleguide.gridbase,

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
    },
    expander: {
      height: styleguide.gridbase * 4,
      padding: [styleguide.gridbase, styleguide.gridbase * 2],
      boxSizing: 'border-box',
      alignItems: 'center',
      basedOn: [layout.row],
      color: theme.colors.text,
      ':disabled': {
        color: theme.colors.grayedText,
      },
    },
    expanderText: {
      color: 'inherit',
      basedOn: [layout.flexSpacer, useTypographyStyles.bold],
    },
    expanderIcon: {
      color: 'inherit',
      marginLeft: styleguide.gridbase,
      transform: 'rotate(90deg)',
    },
    expanderIconOpen: {
      transform: 'rotate(270deg)',
    },
    pinButton: {
      opacity: 0,
      ...styleguide.transition.short,
      transitionProperty: 'opacity',
    },
    pinButtonPinned: {
      opacity: 1,
    },
  }),
  'workspaces-bar_881015'
);

const useStrings = createUseStrings(localization);

function WorkspaceCheckbox({ toggled }: { toggled: boolean }) {
  const styles = useStyles();
  return (
    <div className={cn(styles.itemToggle, toggled && styles.itemToggleChecked)}>
      {toggled && <CheckIcon />}
    </div>
  );
}

export interface WorkspacesBarProps {
  expanded: boolean;
  setExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  // selectedWorkspaces: string[];
  // setSelectedWorkspaces: React.Dispatch<React.SetStateAction<string[]>>;
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

interface WorkspaceToggleViewProps {
  expanded: boolean;
  onSelectAll: () => void;
  onUnselectAll: () => void;
  selectedRatio: number;
  className?: string;
}

function WorkspaceToggleView({
  selectedRatio,
  onSelectAll,
  onUnselectAll,
  className,
  expanded,
}: WorkspaceToggleViewProps) {
  const strings = useStrings();
  const styles = useStyles();

  return (
    <div className={cn(styles.toggleView)}>
      {expanded && (
        <div>
          <LabelSm>{strings.myWorkspaces}</LabelSm>
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
  expanded,
  isSelected,
  onClick,
  isHidden,
  setIsHidden,
  isPinned,
  setIsPinned,
}: {
  workspace: VertexManager<Workspace>;
  expanded: boolean;
  isSelected: boolean;
  isHidden: boolean;
  setIsHidden: (hidden?: boolean) => void;
  isPinned: boolean;
  setIsPinned: (pinned?: boolean) => void;
  onClick: MouseEventHandler;
}) {
  const color = useWorkspaceColor(workspace);
  const { name } = usePartialVertex(workspace, ['name']);
  const styles = useStyles();
  const strings = useStrings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const style = useMemo<any>(
    () => ({
      '--ws-background': color.background,
      '--ws-inactive': color.inactive,
      '--ws-active': color.active,
    }),
    [color]
  );

  const textRef = useRef<HTMLDivElement>(null);
  const isOverflowing =
    textRef.current &&
    textRef.current.offsetWidth < textRef.current.scrollWidth;

  const renderButton = useCallback(() => <IconOverflow />, []);

  return (
    <div
      className={cn(
        styles.listItem,
        expanded && styles.listItemExpanded,
        isSelected && styles.listItemSelected
      )}
      style={style}
    >
      <Tooltip text={name} disabled={!isOverflowing} position="right">
        <div
          className={cn(styles.itemTab)}
          onClick={onClick}
          onContextMenu={onClick}
        >
          <div ref={textRef} className={cn(styles.itemText)}>
            {name}
          </div>

          <WorkspaceCheckbox toggled={isSelected} />
        </div>
      </Tooltip>
      <div className={cn(layout.flexSpacer)} />
      {expanded && (
        <React.Fragment>
          <Button
            className={cn(styles.pinButton, isPinned && styles.pinButtonPinned)}
            onClick={() => setIsPinned()}
          >
            {isPinned ? <IconPinOn /> : <IconPinOff />}
          </Button>
          <Menu
            renderButton={renderButton}
            direction="out"
            position="right"
            align="start"
            className={cn(styles.itemMenu)}
          >
            <MenuItem onClick={() => setIsSettingsOpen(true)}>
              {strings.workspaceSettings}
            </MenuItem>
            <MenuItem onClick={() => setIsHidden()}>
              {isHidden ? strings.showWorkspace : strings.hideWorkspace}
            </MenuItem>
          </Menu>
        </React.Fragment>
      )}
      <WorkspaceSettingsDialog
        workspaceManager={workspace}
        isOpen={isSettingsOpen}
        hide={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

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

function WorkspacesList({ expanded }: WorkspacesBarProps) {
  const styles = useStyles();
  const strings = useStrings();
  const [showHidden, setShowHidden] = useState(false);
  const settings = usePartialUserSettings([
    'hiddenWorkspaces',
    'pinnedWorkspaces',
  ]);
  const { hiddenWorkspaces, pinnedWorkspaces } = settings;
  const workspacesQuery = useSharedQuery('workspaces');
  const workspaces = useVertices(workspacesQuery.results);
  const hidden = workspaces.filter((x) => hiddenWorkspaces.has(x.key));

  const visible = workspaces
    .filter((x) => !hiddenWorkspaces.has(x.key))
    .sort((x, y) => sortWorkspaces(x, y, pinnedWorkspaces, hiddenWorkspaces));
  const history = useHistoryStatic();
  const logger = useLogger();
  const lastSelectedKey = useRef<string>();
  const selectedWorkspacesQuery = useSharedQuery('selectedWorkspaces');
  const toggle = (e: MouseEvent, wsMng: VertexManager<Workspace>) => {
    e.preventDefault();
    e.stopPropagation();

    //Route back to / if not there already
    const currentRoute = history.currentRoute;
    if (!currentRoute || currentRoute.url !== '/') {
      history.push(LOGIN);
      logger.log({
        severity: 'INFO',
        event: 'Click',
        uiSource: 'workspace-bar',
        routeInfo: `${currentRoute?.id}:${currentRoute?.url}`,
      });
      return;
    }
    const proxy = wsMng.getVertexProxy();
    const collection = hidden.includes(proxy) ? hidden : visible;

    const toggleAction = toggleActionFromEvent(e);
    const r = toggleSelectionItem(
      collection.map((x) => x.key),
      wsMng.key,
      Array.from(selectedWorkspacesQuery.keys()),
      lastSelectedKey.current,
      toggleAction
    );
    const selectedKeys = new Set<string>(r ? r.allSelectedItems : []);
    const prevSelectedKeys = new Set(selectedWorkspacesQuery.keys());
    workspacesQuery.forEach((ws) => (ws.selected = selectedKeys.has(ws.key)));
    const didSelect = r?.toggleType === 'selected';
    if (didSelect) {
      lastSelectedKey.current = wsMng.key;
    }
    logger.log({
      severity: 'INFO',
      event: 'FilterChange',
      type: 'workspace',
      added: Array.from(SetUtils.subtract(selectedKeys, prevSelectedKeys)),
      removed: Array.from(SetUtils.subtract(prevSelectedKeys, selectedKeys)),
      uiSource: 'workspace-bar',
      action: r.actionType,
    });
  };

  return (
    <Scroller>
      {(ref) => (
        <div ref={ref} className={cn(styles.list)}>
          {visible.map((x) => (
            <WorkspaceListItem
              setIsHidden={(hidden) =>
                hidden
                  ? settings.hiddenWorkspaces.add(x.key)
                  : settings.hiddenWorkspaces.delete(x.key)
              }
              setIsPinned={(pinned) =>
                pinned
                  ? settings.pinnedWorkspaces.add(x.key)
                  : settings.pinnedWorkspaces.delete(x.key)
              }
              isHidden={false}
              isPinned={pinnedWorkspaces.has(x.key)}
              key={x.key}
              workspace={x.manager as VertexManager<Workspace>}
              expanded={expanded}
              onClick={() => (x.selected = !x.selected)}
              isSelected={x.selected}
            />
          ))}
          <Button
            className={cn(styles.expander)}
            disabled={!hidden.length}
            onClick={() => setShowHidden((x) => !x)}
          >
            <div className={cn(styles.expanderText)}>
              {expanded
                ? strings.hiddenWorkspaces
                : strings.hiddenWorkspacesShort}
            </div>
            <ExpanderIcon
              className={cn(
                styles.expanderIcon,
                showHidden && styles.expanderIconOpen
              )}
            />
          </Button>
          {showHidden &&
            hidden.map((x) => (
              <WorkspaceListItem
                setIsHidden={(hidden) =>
                  hidden
                    ? settings.hiddenWorkspaces.add(x.key)
                    : settings.hiddenWorkspaces.delete(x.key)
                }
                setIsPinned={(pinned) =>
                  pinned
                    ? settings.pinnedWorkspaces.add(x.key)
                    : settings.pinnedWorkspaces.delete(x.key)
                }
                isHidden={true}
                isPinned={false}
                key={x.key}
                workspace={x.manager as VertexManager<Workspace>}
                expanded={expanded}
                onClick={(e) => (x.selected = !x.selected)}
                isSelected={x.selected}
              />
            ))}
        </div>
      )}
    </Scroller>
  );
}

function WorkspaceBarInternal({
  expanded,
  setExpanded,
  className,
}: WorkspacesBarProps) {
  const styles = useStyles();
  const { hiddenWorkspaces, pinnedWorkspaces } = usePartialUserSettings([
    'hiddenWorkspaces',
    'pinnedWorkspaces',
  ]);

  const workspacesQuery = useSharedQuery('workspaces');
  const logger = useLogger();
  const selectAll = useCallback(() => {
    workspacesQuery.forEach(
      (ws) => (ws.selected = !hiddenWorkspaces.has(ws.key))
    );
    logger.log({
      severity: 'INFO',
      event: 'FilterChange',
      uiSource: 'workspace-bar',
      added: 'ALL',
    });
  }, [workspacesQuery, logger, hiddenWorkspaces]);
  const unselectAll = useCallback(() => {
    workspacesQuery.forEach((ws) => (ws.selected = false));
    logger.log({
      severity: 'INFO',
      event: 'FilterChange',
      uiSource: 'workspace-bar',
      removed: 'ALL',
    });
  }, [workspacesQuery, logger]);

  const pinWorkspace = (ws: VertexManager<Workspace>, pinned?: boolean) => {
    pinned ? pinnedWorkspaces.add(ws.key) : pinnedWorkspaces.delete(ws.key);
    logger.log({
      severity: 'INFO',
      event: 'MetadataChanged',
      type: 'pin',
      flag: pinned,
      vertex: ws.key,
      uiSource: 'workspace-bar',
    });
  };

  const hideWorkspace = (ws: VertexManager<Workspace>, hidden?: boolean) => {
    hidden ? hiddenWorkspaces.add(ws.key) : hiddenWorkspaces.delete(ws.key);
    logger.log({
      severity: 'INFO',
      event: 'MetadataChanged',
      type: 'hide',
      flag: hidden,
      vertex: ws.key,
      uiSource: 'workspace-bar',
    });
    if (hidden) {
      ws.getVertexProxy().selected = false;
    }
  };

  return (
    <Layer priority={2}>
      {(style) => (
        <div
          style={style}
          className={cn(styles.root, !expanded && styles.collapsed, className)}
        >
          <div className={cn(styles.header)}>
            <div className={cn(styles.logoContainer)}>
              <LogoIcon className={cn(styles.logoIcon)} />
              {expanded && <LogoText className={cn(styles.logoText)} />}
              <div className={cn(layout.flexSpacer)} />
              <Button
                className={cn(styles.openBarButton)}
                onClick={() => setExpanded((x) => !x)}
              >
                <CollapseIcon className={!expanded && styles.rotated} />
              </Button>
            </div>
            <WorkspaceToggleView
              expanded={expanded}
              selectedRatio={
                workspaces.length &&
                selectedWorkspaces.length / workspaces.length
              }
              onSelectAll={selectAll}
              onUnselectAll={unselectAll}
            />
          </div>
          <WorkspacesList
            expanded={expanded}
            setExpanded={setExpanded}
            workspaces={workspaces}
            hiddenWorkspaces={hiddenWorkspaces}
            pinnedWorkspaces={pinnedWorkspaces}
            togglePinWorkspace={pinWorkspace}
            toggleHideWorkspace={hideWorkspace}
            selectedWorkspaces={selectedWorkspaces}
            setSelectedWorkspaces={setSelectedWorkspaces}
          />
          <WorkspaceBarActions expanded={expanded} />
        </div>
      )}
    </Layer>
  );
}

function MobileBar({ expanded, setExpanded, ...rest }: WorkspacesBarProps) {
  const styles = useStyles();

  return createUniversalPortal(
    <Layer priority={3}>
      {(style) => (
        <React.Fragment>
          {expanded && (
            <div
              style={style}
              className={cn(styles.backdrop)}
              onClick={() => setExpanded(false)}
            />
          )}
          <WorkspaceBarInternal
            {...rest}
            expanded={expanded}
            setExpanded={setExpanded}
          />
        </React.Fragment>
      )}
    </Layer>
  );
}

function DesktopBar(props: WorkspacesBarProps) {
  return <WorkspaceBarInternal {...props} />;
}

export function WorkspacesBar(props: WorkspacesBarProps) {
  const device = useCurrentDevice();
  const isMobile = device < Devices.Tablet;
  if (isMobile) {
    return <MobileBar {...props} />;
  }
  return <DesktopBar {...props} />;
}
