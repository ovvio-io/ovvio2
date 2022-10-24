import { Tag, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import React, { useContext, useState, useMemo } from 'react';
import CreateTagDialog from './create-tag-dialog';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';

type OnTagCreatedCallback = (tag: Tag) => void;

export interface CreateTagRequest {
  workspaceManager: VertexManager<Workspace>;
  initialName?: string;
  onTagCreated?: OnTagCreatedCallback;
  logSource?: string;
}

export interface CreateTagContext {
  requestCreateTag(request: CreateTagRequest): void;
}

const createTagContext = React.createContext<CreateTagContext>({
  requestCreateTag: (request: CreateTagRequest) => { },
});

export function useCreateTag() {
  return useContext(createTagContext);
}

export function CreateTagProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [request, setRequest] = useState<CreateTagRequest>(undefined);
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
        request={request}
        onClose={() => {
          setIsOpen(false);
        }}
      />
    </createTagContext.Provider>
  );
}
