import React from "react";
import { Workspace } from "../cfds/client/graph/vertices/workspace.ts";
import { VertexManager } from "../cfds/client/graph/vertex-manager.ts";
import { cn, makeStyles } from "../styles/css-objects/index.ts";
import { brandLightTheme as theme } from "../styles/theme.tsx";
import { styleguide } from "../styles/styleguide.ts";
import { usePartialVertex } from "../web-app/src/core/cfds/react/vertex.ts";
import { useWorkspaceColor } from "../web-app/src/shared/workspace-icon/index.tsx";

const useStyles = makeStyles(() => ({
  workspaceIndicator: {
    display: "flex",
    alignItems: "center",
  },
  background: {
    height: styleguide.gridbase * 3,
    minWidth: styleguide.gridbase * 9,
    borderRadius: "2px 60px 60px 2px",
    color: theme.mono.m6,
    padding: styleguide.gridbase / 2,
    paddingRight: styleguide.gridbase * 1.5,
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
  },
}));

export interface WorkspaceIndicatorProps {
  workspace: VertexManager<Workspace>;
}

export function WorkspaceIndicator({ workspace }: WorkspaceIndicatorProps) {
  const styles = useStyles();
  const { name } = usePartialVertex(workspace, ["name"]);
  const color = useWorkspaceColor(workspace)?.background || "transparent";
  return (
    <div className={cn(styles.workspaceIndicator)}>
      <div className={cn(styles.background)} style={{ backgroundColor: color }}>
        <span>{name}</span>
      </div>
      <img src="/icons/editor/breadcrumbs/icon/arrow-small.svg" />
    </div>
  );
}
