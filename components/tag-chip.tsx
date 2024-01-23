import React from 'react';
import { cn, makeStyles } from '../styles/css-objects/index.ts';
import { brandLightTheme as theme } from '../styles/theme.tsx';
import { styleguide } from '../styles/styleguide.ts';
import { VertexManager } from '../cfds/client/graph/vertex-manager.ts';
import { usePartialVertex } from '../web-app/src/core/cfds/react/vertex.ts';
import { Tag } from '../cfds/client/graph/vertices/tag.ts';

const useStyles = makeStyles(() => ({
  Container: {
    borderRadius: styleguide.gridbase * 2,
    padding: `1px 6px`,
    border: `1px solid ${theme.mono.m1}`,
    backgroundColor: theme.mono.m1,
    color: theme.mono.m10,
    display: 'inline-block',
  },
}));

export interface TagChipProps {
  tag: VertexManager<Tag>;
  className?: string;
}

export function TagChip({ tag, className }: TagChipProps) {
  const styles = useStyles();
  const { name } = usePartialVertex(tag, ['name']);
  return <div className={cn(styles.Container, className)}>{name}</div>;
}
