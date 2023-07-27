import React, { useMemo } from 'react';
import { useGraphManager } from '../../core/cfds/react/graph.tsx';
import WorkspaceContentView from './workspace-view/index.tsx';

interface WorkspaceSelectorProps {
  className?: string;
}
export default function WorkspaceSelectorView({
  className,
}: WorkspaceSelectorProps) {
  const graph = useGraphManager();

  return <WorkspaceContentView className={className} />;
}
