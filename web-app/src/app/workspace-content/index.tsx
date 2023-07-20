import React from 'react';
import WorkspaceContentView from './workspace-view/index.tsx';
import { CreateTagProvider } from '../../shared/tags/create-tag-context.tsx';

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
