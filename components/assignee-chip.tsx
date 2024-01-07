import React from 'react';
import { cn, makeStyles } from '../styles/css-objects/index.ts';
import { brandLightTheme as theme } from '../styles/theme.tsx';
import { styleguide } from '../styles/styleguide.ts';
import { VertexManager } from '../cfds/client/graph/vertex-manager.ts';
import { User } from '../cfds/client/graph/vertices/index.ts';
import { usePartialVertex } from '../web-app/src/core/cfds/react/vertex.ts';

const useStyles = makeStyles(() => ({
  Container: {
    borderRadius: styleguide.gridbase * 2,
    padding: '1px 2px',
    border: `1px solid ${theme.mono.m2}`,
    color: theme.mono.m6,
    display: 'inline-block',
  },
}));

export interface AssigneeChipProps {
  user: VertexManager<User>;
  className?: string;
}

export function AssigneeChip({ user, className }: AssigneeChipProps) {
  const styles = useStyles();
  const { name } = usePartialVertex(user, ['name']);
  return <div className={cn(styles.Container, className)}>{name}</div>;
}
