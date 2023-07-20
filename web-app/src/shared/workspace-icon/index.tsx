import { Query } from '@ovvio/cfds/lib/client/graph/query';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { User, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { layout, styleguide } from '@ovvio/styles/lib';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { brandLightTheme } from '@ovvio/styles/lib/theme';
import { useRootUser } from 'core/cfds/react/graph';
import { usePartialVertex, useVertex } from 'core/cfds/react/vertex';
import React, { useMemo } from 'react';

const useStyles = makeStyles(theme => ({
  ws: {
    overflow: 'hidden',
    flexShrink: 0,
    boxSizing: 'content-box',
    backgroundColor: '#9cb2cd',
    color: theme.background[0],
    fontFamily: 'Roboto',
    fontWeight: '900',
    borderRadius: '50%',
    textDecoration: 'none',
    border: `1px solid ${theme.background[0]}`,
    cursor: 'pointer',
    textTransform: 'uppercase',
    pointerEvents: 'none',
    basedOn: [layout.column, layout.centerCenter],
  },
  wsIcon: {
    width: '100%',
    height: '100%',
  },
}));
interface WorkspaceIconProps {
  className?: string;
  workspaceManager: VertexManager<Workspace>;
  size?: number;
}

export type WorkspaceColor = {
  background: string;
  inactive: string;
  active: string;
};

const COLOR_MAP: WorkspaceColor[] = [
  {
    background: brandLightTheme.mono.m1,
    inactive: brandLightTheme.mono.m3,
    active: brandLightTheme.mono.m5,
  },
  {
    background: brandLightTheme.supporting.G1,
    inactive: brandLightTheme.supporting.G2,
    active: brandLightTheme.supporting.G4,
  },
  {
    background: brandLightTheme.supporting.T1,
    inactive: brandLightTheme.supporting.T2,
    active: brandLightTheme.supporting.T4,
  },
  {
    background: brandLightTheme.primary.p3,
    inactive: brandLightTheme.primary.p4,
    active: brandLightTheme.primary.p9,
  },
  {
    background: brandLightTheme.supporting.V1,
    inactive: brandLightTheme.supporting.V2,
    active: brandLightTheme.supporting.V4,
  },
  {
    background: brandLightTheme.supporting.L1,
    inactive: brandLightTheme.supporting.L2,
    active: brandLightTheme.supporting.L4,
  },
  {
    background: brandLightTheme.supporting.B1,
    inactive: brandLightTheme.supporting.B2,
    active: brandLightTheme.supporting.B4,
  },
  {
    background: brandLightTheme.supporting.O1,
    inactive: brandLightTheme.supporting.O2,
    active: brandLightTheme.supporting.O4,
  },
  {
    background: brandLightTheme.supporting.C1,
    inactive: brandLightTheme.supporting.C2,
    active: brandLightTheme.supporting.C4,
  },
  {
    background: brandLightTheme.secondary.s3,
    inactive: brandLightTheme.secondary.s4,
    active: brandLightTheme.secondary.s7,
  },
  {
    background: brandLightTheme.supporting.R1,
    inactive: brandLightTheme.supporting.R2,
    active: brandLightTheme.supporting.R4,
  },
];

export function getColorForWorkspace(user: User, workspace: Workspace): number {
  if (!workspace) {
    return 0;
  }
  const colorMap = user.workspaceColors;
  if (colorMap.has(workspace.key)) {
    return colorMap.get(workspace.key);
  }

  // const graph = workspace.graph;
  // const keys = Array.from(colorMap.keys());
  // const availableKeys = user.graph.sharedQueriesManager.workspaces.map(x => x.key);
  // for (const key of keys) {
  //   if (
  //     !availableKeys.includes(key) &&
  //     !graph.getVertex<Workspace>(key).isDemoData
  //   ) {
  //     colorMap.delete(key);
  //   }
  // }

  const colorCount: { [index in number]: number } = {};

  for (let i = 0; i < COLOR_MAP.length; i++) {
    colorCount[i] = 0;
  }

  const count = Array.from(colorMap.values()).reduce((accum, color) => {
    accum[color]++;
    return accum;
  }, colorCount);

  const [nextColor] = Object.entries(count).sort(([, x], [, y]) => x - y)[0];

  const colorIndex = parseInt(nextColor);

  colorMap.set(workspace.key, colorIndex);
  user.workspaceColors = colorMap;
  return colorIndex;
}

export function useWorkspaceColor(
  workspace: VertexManager<Workspace>
): WorkspaceColor {
  const ws = useVertex(workspace);
  const userManager = useRootUser();
  const user = usePartialVertex(userManager, ['workspaceColors', 'workspaces']);

  return useMemo(() => {
    const colorIndex = getColorForWorkspace(user as User, ws);
    return COLOR_MAP[colorIndex];
  }, [user, ws]);
}

export default function WorkspaceIcon({
  className,
  workspaceManager,
  size = styleguide.gridbase * 4,
}: WorkspaceIconProps) {
  const styles = useStyles();
  const ws = usePartialVertex(workspaceManager, ['name', 'icon']);
  const icon = ws.icon;

  const color = useWorkspaceColor(workspaceManager);
  return (
    <div
      className={cn(styles.ws, className)}
      style={{
        width: size,
        height: size,
        lineHeight: size + 'px',
        fontSize: size * 0.625 + 'px',
        backgroundColor: icon ? '#4f8df9' : color.active,
      }}
    >
      {icon ? (
        <img src={icon} className={cn(styles.wsIcon)} alt={ws.name} />
      ) : (
        (ws.name || '')[0]
      )}
    </div>
  );
}
