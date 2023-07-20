import React, { useContext, useState, useMemo } from 'react';
import { VertexManager } from '../../../../cfds/client/graph/vertex-manager.ts';
import { Tag } from '../../../../cfds/client/graph/vertices/tag.ts';
import { Workspace } from '../../../../cfds/client/graph/vertices/workspace.ts';
import CreateTagDialog from './create-tag-dialog/index.tsx';
import { UISource } from '../../../../logging/client-events.ts';

type OnTagCreatedCallback = (tag: Tag) => void;

export interface CreateTagRequest {
  workspaceManager: VertexManager<Workspace>;
  initialName?: string;
  onTagCreated?: OnTagCreatedCallback;
  logSource?: UISource;
}

export interface CreateTagContext {
  requestCreateTag(request: CreateTagRequest): void;
}

const createTagContext = React.createContext<CreateTagContext>({
  requestCreateTag: (request: CreateTagRequest) => {},
});

export function useCreateTag() {
  return useContext(createTagContext);
}

export function CreateTagProvider({ children }: React.PropsWithChildren<{}>) {
  const [isOpen, setIsOpen] = useState(false);
  const [request, setRequest] = useState<CreateTagRequest | undefined>(
    undefined
  );
  const ctx = useMemo(() => {
    return {
      requestCreateTag(request: CreateTagRequest) {
        setIsOpen(true);
        setRequest(request);
      },
    };
  }, []);
  return (
    <createTagContext.Provider value={ctx}>
      {children}
      <CreateTagDialog
        open={isOpen}
        request={request!}
        onClose={() => {
          setIsOpen(false);
        }}
      />
    </createTagContext.Provider>
  );
}
