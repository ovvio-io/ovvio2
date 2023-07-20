import { Vertex } from '@ovvio/cfds/lib/client/graph/vertex';
import { Workspace } from '@ovvio/cfds/lib/client/graph/vertices/workspace';
import { useGraphManager } from 'core/cfds/react/graph';
import { isWorkspace, useExistingQuery, useQuery } from 'core/cfds/react/query';
import { useMemo } from 'react';
import { CreateTagProvider } from 'shared/tags/create-tag-context';
import WorkspaceContentView from './workspace-view';

interface WorkspaceSelectorProps {
  className?: string;
}
export default function WorkspaceSelectorView({
  className,
}: WorkspaceSelectorProps) {
  return (
    <CreateTagProvider>
      <WorkspaceContentView className={className} />
    </CreateTagProvider>
  );
}
