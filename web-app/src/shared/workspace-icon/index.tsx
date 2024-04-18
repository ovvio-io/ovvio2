import React, { useMemo } from 'react';
import { VertexManager } from '../../../../cfds/client/graph/vertex-manager.ts';
import { Workspace } from '../../../../cfds/client/graph/vertices/index.ts';
import { layout, styleguide } from '../../../../styles/index.ts';
import { cn, makeStyles } from '../../../../styles/css-objects/index.ts';
import { brandLightTheme } from '../../../../styles/theme.tsx';
import {
  useGraphManager,
  usePartialUserSettings,
} from '../../core/cfds/react/graph.tsx';
import { usePartialVertex } from '../../core/cfds/react/vertex.ts';
import { useSharedQuery } from '../../core/cfds/react/query.ts';
import {
  VertexId,
  VertexIdGetKey,
} from '../../../../cfds/client/graph/vertex.ts';
import { assert } from '../../../../base/error.ts';

const useStyles = makeStyles((theme) => ({
  ws: {
    overflow: 'hidden',
    flexShrink: 0,
    boxSizing: 'content-box',
    backgroundColor: '#9cb2cd',
    color: theme.background[0],
    fontFamily: 'PoppinsBold, HeeboBold',
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

const PERSONAL_WS_COLOR: WorkspaceColor = {
  background: brandLightTheme.mono.m1,
  inactive: brandLightTheme.mono.m3,
  active: brandLightTheme.mono.m5,
};

export function useWorkspaceColor(
  workspaceId: VertexId<Workspace> | null,
): WorkspaceColor {
  const graph = useGraphManager();
  const partialSettings = usePartialUserSettings(['workspaceColors']);
  const colorMap = partialSettings.workspaceColors;
  const workspacesQuery = useSharedQuery('workspaces');

  return useMemo(() => {
    if (!workspaceId) {
      return COLOR_MAP[0];
    }

    if (VertexIdGetKey(workspaceId) === `${graph.rootKey}-ws`) {
      return PERSONAL_WS_COLOR;
    }

    const workspaceKey = VertexIdGetKey(workspaceId);

    // Return the saved color only if it's valid within the current theme
    const existingColor = colorMap.get(workspaceKey);
    if (
      existingColor &&
      existingColor >= 0 &&
      existingColor < COLOR_MAP.length
    ) {
      return COLOR_MAP[existingColor];
    }
    // Prevent color tagging for demo workspaces
    for (const key of workspacesQuery.keys()) {
      if (graph.getVertex<Workspace>(key).isDemoData) {
        colorMap.delete(key);
      }
    }

    // Find the least used color and use that for our workspace
    const colorCounts: number[] = [];
    for (let i = 0; i < COLOR_MAP.length; ++i) {
      colorCounts.push(0);
    }
    for (const color of colorMap.values()) {
      if (color >= 0 && color < COLOR_MAP.length) {
        ++colorCounts[color];
      }
    }
    const nextColor = colorCounts.indexOf(Math.min(...colorCounts));
    assert(nextColor >= 0 && nextColor < COLOR_MAP.length);
    colorMap.set(workspaceKey, nextColor);
    return COLOR_MAP[nextColor];
  }, [workspaceId, workspacesQuery, partialSettings, graph]);
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
