import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { sortMngStampCompare } from '@ovvio/cfds/lib/client/sorting';
import { layout, styleguide } from '@ovvio/styles';
import { useBackdropStyles } from '@ovvio/styles/lib/components/backdrop';
import { Button } from '@ovvio/styles/lib/components/buttons';
import { IconOverflow } from '@ovvio/styles/lib/components/icons';
import Layer from '@ovvio/styles/lib/components/layer';
import { LogoIcon, LogoText } from '@ovvio/styles/lib/components/logo';
import Menu, { MenuItem } from '@ovvio/styles/lib/components/menu';
import { IconPinOff } from '@ovvio/styles/lib/components/new-icons/icon-pin-off';
import { IconPinOn } from '@ovvio/styles/lib/components/new-icons/icon-pin-on';
import Tooltip from '@ovvio/styles/lib/components/tooltip';
import {
  LabelSm,
  TextSm,
  useTypographyStyles,
} from '@ovvio/styles/lib/components/typography';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import {
  Devices,
  MediaQueries,
  useCurrentDevice,
} from '@ovvio/styles/lib/responsive';
import { brandLightTheme as theme } from '@ovvio/styles/lib/theme';
import { Scroller } from '@ovvio/styles/lib/utils/scrolling';
import { createUniversalPortal } from '@ovvio/styles/lib/utils/ssr';
import { sortWorkspaces } from 'app/workspace-content/workspace-view/cards-display/card-item/workspace-indicator';
import { EventCategory, useEventLogger } from 'core/analytics';
import { useGraphManager, useRootUser } from 'core/cfds/react/graph';
import { useExistingQuery } from 'core/cfds/react/query';
import { usePartialVertex } from 'core/cfds/react/vertex';
import { createUseStrings } from 'core/localization';
import { LOGIN, useHistoryStatic } from 'core/react-utils/history';
import React, {
  MouseEvent,
  MouseEventHandler,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useWorkspaceColor } from 'shared/workspace-icon';
import { WorkspaceBarActions } from './actions';
import localization from './workspace-bar.strings.json';
import WorkspaceSettingsDialog from './workspace-settings-dialog';
import {
  toggleActionFromEvent,
  toggleSelectionItem,
} from './ws-selection-utils';

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
  selectedWorkspaces: string[];
  setSelectedWorkspaces: React.Dispatch<React.SetStateAction<string[]>>;
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

  const textRef = useRef<HTMLDivElement>();
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

interface WorkspacesListProps extends WorkspacesBarProps {
  workspaces: VertexManager<Workspace>[];
  pinnedWorkspaces: Set<string>;
  togglePinWorkspace(ws: VertexManager<Workspace>, pinned?: boolean): void;
  hiddenWorkspaces: Set<string>;
  toggleHideWorkspace(ws: VertexManager<Workspace>, hidden?: boolean): void;
}

function WorkspacesList({
  workspaces,
  selectedWorkspaces,
  setSelectedWorkspaces,
  expanded,
  pinnedWorkspaces,
  togglePinWorkspace,
  hiddenWorkspaces,
  toggleHideWorkspace,
}: WorkspacesListProps) {
  const styles = useStyles();
  const strings = useStrings();
  const [showHidden, setShowHidden] = useState(false);
  const hidden = workspaces
    .filter(x => hiddenWorkspaces.has(x.key))
    .sort(sortMngStampCompare);
  const visible = workspaces
    .filter(x => !hiddenWorkspaces.has(x.key))
    .sort((x, y) =>
      sortWorkspaces(
        x.getVertexProxy(),
        y.getVertexProxy(),
        pinnedWorkspaces,
        hiddenWorkspaces
      )
    );
  const history = useHistoryStatic();
  const eventLogger = useEventLogger();
  const lastSelectedKey = useRef<string>();
  const toggle = (e: MouseEvent, wsMng: VertexManager<Workspace>) => {
    e.preventDefault();
    e.stopPropagation();

    //Route back to / if not there already
    const currentRoute = history.currentRoute;
    if (!currentRoute || currentRoute.url !== '/') {
      history.push(LOGIN);
      eventLogger.action('WORKSPACE_CLICKED', {
        source: `${currentRoute.id}:${currentRoute.url}`,
      });
      return;
    }
    const collection = hidden.includes(wsMng) ? hidden : visible;

    const proxy = wsMng.getVertexProxy();
    const toggleAction = toggleActionFromEvent(e);
    const r = toggleSelectionItem(
      collection.map(x => x.key),
      wsMng.key,
      selectedWorkspaces,
      lastSelectedKey.current,
      toggleAction
    );
    setSelectedWorkspaces(r.allSelectedItems);
    const didSelect = r.toggleType === 'selected';
    if (didSelect) {
      lastSelectedKey.current = wsMng.key;
    }
    eventLogger.wsAction(
      didSelect ? 'WORKSPACE_UNSELECTED' : 'WORKSPACE_SELECTED',
      proxy,
      {
        category: EventCategory.WS_BAR,
        data: {
          toggleType: r.actionType,
        },
      }
    );
  };

  return (
    <Scroller>
      {ref => (
        <div ref={ref} className={cn(styles.list)}>
          {visible.map(x => (
            <WorkspaceListItem
              setIsHidden={hidden => toggleHideWorkspace(x, hidden)}
              setIsPinned={pinned => togglePinWorkspace(x, pinned)}
              isHidden={false}
              isPinned={pinnedWorkspaces.has(x.key)}
              key={x.key}
              workspace={x}
              expanded={expanded}
              onClick={e => toggle(e, x)}
              isSelected={selectedWorkspaces.includes(x.key)}
            />
          ))}
          <Button
            className={cn(styles.expander)}
            disabled={!hidden.length}
            onClick={() => setShowHidden(x => !x)}
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
            hidden.map(x => (
              <WorkspaceListItem
                setIsHidden={hidden => toggleHideWorkspace(x, hidden)}
                setIsPinned={pinned => togglePinWorkspace(x, pinned)}
                isHidden={true}
                isPinned={false}
                key={x.key}
                workspace={x}
                expanded={expanded}
                onClick={e => toggle(e, x)}
                isSelected={selectedWorkspaces.includes(x.key)}
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
  selectedWorkspaces,
  setSelectedWorkspaces,
  className,
}: WorkspacesBarProps) {
  const styles = useStyles();

  const user = useRootUser();
  const { hiddenWorkspaces, pinnedWorkspaces } = usePartialVertex(user, [
    'hiddenWorkspaces',
    'pinnedWorkspaces',
  ]);

  const graph = useGraphManager();
  const { results: workspaces } = useExistingQuery(
    graph.sharedQueriesManager.workspacesQuery
  );
  const eventLogger = useEventLogger();
  const selectAll = useCallback(() => {
    setSelectedWorkspaces(
      workspaces.filter(x => !hiddenWorkspaces.has(x.key)).map(x => x.key)
    );
    eventLogger.action('WORKSPACES_ALL_SELECTED', {});
  }, [workspaces, setSelectedWorkspaces, eventLogger, hiddenWorkspaces]);
  const unselectAll = useCallback(() => {
    setSelectedWorkspaces([]);
    eventLogger.action('WORKSPACES_ALL_UNSELECTED', {});
  }, [eventLogger, setSelectedWorkspaces]);

  const pinWorkspace = (ws: VertexManager<Workspace>, pinned?: boolean) => {
    const proxy = user.getVertexProxy();
    const current = new Set(proxy.pinnedWorkspaces);
    const hidden = new Set(proxy.hiddenWorkspaces);
    pinned = typeof pinned === 'undefined' ? !current.has(ws.key) : pinned;
    if (pinned) {
      current.add(ws.key);
      if (hidden.has(ws.key)) {
        hidden.delete(ws.key);
        proxy.hiddenWorkspaces = hidden;
      }
    } else if (current.has(ws.key)) {
      current.delete(ws.key);
    }
    eventLogger.wsAction(pinned ? 'PIN_WORKSPACE' : 'UNPIN_WORKSPACE', ws, {});
    proxy.pinnedWorkspaces = current;
  };

  const hideWorkspace = (ws: VertexManager<Workspace>, hidden?: boolean) => {
    const proxy = user.getVertexProxy();
    const current = new Set(proxy.hiddenWorkspaces);
    const pinned = new Set(proxy.pinnedWorkspaces);
    hidden = typeof hidden === 'undefined' ? !current.has(ws.key) : hidden;
    if (hidden) {
      current.add(ws.key);
      if (pinned.has(ws.key)) {
        pinned.delete(ws.key);
        proxy.pinnedWorkspaces = pinned;
      }
    } else if (current.has(ws.key)) {
      current.delete(ws.key);
    }
    eventLogger.wsAction(hidden ? 'HIDE_WORKSPACE' : 'SHOW_WORKSPACE', ws, {});
    proxy.hiddenWorkspaces = current;
    if (hidden && selectedWorkspaces.includes(ws.key)) {
      setSelectedWorkspaces(selected => selected.filter(x => x !== ws.key));
    }
  };

  return (
    <Layer priority={2}>
      {style => (
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
                onClick={() => setExpanded(x => !x)}
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
      {style => (
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
