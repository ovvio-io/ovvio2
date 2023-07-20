import { Vertex } from '@ovvio/cfds/lib/client/graph/vertex';
import { Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { RaisedButton } from '@ovvio/styles/lib/components/buttons';
import { useGraphManager } from 'core/cfds/react/graph';
import { isWorkspace, useExistingQuery, useQuery } from 'core/cfds/react/query';
import { createUseStrings } from 'core/localization';
import React, { useState } from 'react';
import InvitationDialog from 'shared/invitation-dialog';
import localization from './strings.json';

const useStrings = createUseStrings(localization);

export function InviteButton({ className }: { className?: string }) {
  const strings = useStrings();
  const graph = useGraphManager();
  const { results } = useExistingQuery(graph.sharedQueriesManager.workspaces);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <React.Fragment>
      <RaisedButton onClick={() => setIsOpen(true)} className={className}>
        {strings.invite}
      </RaisedButton>
      <InvitationDialog
        workspaces={results}
        open={isOpen}
        hide={() => setIsOpen(false)}
        source="global-share"
      />
    </React.Fragment>
  );
}
