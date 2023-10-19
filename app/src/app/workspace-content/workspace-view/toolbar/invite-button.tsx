import React, { useState } from 'react';
import { RaisedButton } from '../../../../../../styles/components/buttons.tsx';
import { useGraphManager } from '../../../../core/cfds/react/graph.tsx';
import { useExistingQuery } from '../../../../core/cfds/react/query.ts';
import { createUseStrings } from '../../../../core/localization/index.tsx';
import localization from './strings.json' assert { type: 'json' };

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
      {/* <InvitationDialog
        workspaces={results}
        open={isOpen}
        hide={() => setIsOpen(false)}
        source="global-share"
      /> */}
    </React.Fragment>
  );
}
