import React, { useMemo } from 'https://esm.sh/react@18.2.0';
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
