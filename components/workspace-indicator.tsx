import React, { CSSProperties } from 'react';
import { Workspace } from '../cfds/client/graph/vertices/workspace.ts';
import { VertexManager } from '../cfds/client/graph/vertex-manager.ts';
import { cn, makeStyles } from '../styles/css-objects/index.ts';
import { brandLightTheme as theme } from '../styles/theme.tsx';
import { styleguide } from '../styles/styleguide.ts';
import { usePartialVertex } from '../web-app/src/core/cfds/react/vertex.ts';
import { useWorkspaceColor } from '../web-app/src/shared/workspace-icon/index.tsx';
import { VertexId } from '../cfds/client/graph/vertex.ts';
import { resolveWritingDirection } from '../base/string.ts';

const useStyles = makeStyles(() => ({
  workspaceIndicator: {
    display: 'flex',
    alignItems: 'center',
  },
  background: {
    height: styleguide.gridbase * 3,
    minWidth: styleguide.gridbase * 12,
    borderRadius: '2px 60px 60px 2px',
    color: theme.mono.m6,
    padding: styleguide.gridbase / 2,
    paddingRight: styleguide.gridbase * 1.5,
    paddingLeft: styleguide.gridbase * 1,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
  },
  text: {
    // fontFamily: 'Poppins';
    fontSize: '10px',
    // font-style: normal;
    // font-weight: 400;
    lineHight: '14px' /* 140% */,
    textOverflow: 'ellipsis',
    height: '100%',
    whiteSpace: 'nowrap',
    display: 'inline-block',
    overflow: 'hidden',
  },
  colorIndicator: {
    width: styleguide.gridbase * 2,
    height: styleguide.gridbase * 2,
    borderRadius: styleguide.gridbase * 2,
  },
  rtl: {
    direction: 'rtl',
    textAlign: 'left',
  },
}));

export type WorkspaceIndicatorType = 'color' | 'full';

export interface WorkspaceIndicatorProps {
  workspace: VertexManager<Workspace>;
  type?: WorkspaceIndicatorType;
  editable?: boolean;
  className?: string;
  style?: CSSProperties;
  ofSettings?: boolean;
}

export function WorkspaceIndicator({
  workspace,
  type,
  editable,
  className,
  style,
  ofSettings,
}: WorkspaceIndicatorProps) {
  const styles = useStyles();
  const { name } = usePartialVertex(workspace, ['name']);
  const color = useWorkspaceColor(workspace)?.background || 'transparent';
  const color2 = useWorkspaceColor(workspace)?.inactive || 'transparent';

  if (!type) {
    type = 'full';
  }
  const rtl = resolveWritingDirection(name) === 'rtl';
  return (
    <div
      className={cn(styles.workspaceIndicator, className)}
      style={{
        ...(ofSettings ? { paddingTop: '8px' } : {}),
      }}
    >
      {type === 'full' ? (
        <div
          className={cn(styles.background, className)}
          style={{
            backgroundColor: color,
            ...(ofSettings ? { height: '32px' } : {}),
          }}
        >
          <span
            className={cn(styles.text, rtl && styles.rtl)}
            style={{
              ...(ofSettings ? { fontSize: '13px' } : {}),
            }}
          >
            {name}
          </span>
        </div>
      ) : (
        <div
          className={cn(styles.colorIndicator)}
          style={{ backgroundColor: color2 }}
        ></div>
      )}
      {editable && <img src="/icons/editor/breadcrumbs/icon/arrow-small.svg" />}
    </div>
  );
}
