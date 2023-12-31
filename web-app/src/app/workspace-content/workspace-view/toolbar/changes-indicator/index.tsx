import React, { useEffect, useState } from 'react';
import { styleguide } from '../../../../../../../styles/styleguide.ts';
import { Text } from '../../../../../../../styles/components/texts.tsx';
import {
  cn,
  makeStyles,
} from '../../../../../../../styles/css-objects/index.ts';
import {
  ErrorType,
  typeFromCode,
} from '../../../../../../../cfds/base/errors.ts';
import { useQuery2 } from '../../../../../core/cfds/react/query.ts';
import { useGraphManager } from '../../../../../core/cfds/react/graph.tsx';
import localization from '../strings.json' assert { type: 'json' };
import { createUseStrings } from '../../../../../core/localization/index.tsx';

const useStrings = createUseStrings(localization);

const useStyles = makeStyles((theme) => ({
  indicator: {
    color: theme.background.placeholderText,
    whiteSpace: 'nowrap',
    marginLeft: styleguide.gridbase * 3,
    marginRight: styleguide.gridbase * 3,
  },
}));

export default function ChangesIndicator() {
  const styles = useStyles();
  const graph = useGraphManager();
  const [status, setStatus] = useState(graph.status);
  const strings = useStrings();
  // const saving = useQuery2({
  //   source: graph,
  //   predicate: (x) => !x.isLocal && !x.isDemoData && x.hasPendingChanges,
  //   name: 'ChangesIndicator',
  // });

  // const hasPendingChanges = saving.results.length > 0;
  // if (hasPendingChanges) {
  //   debugger;
  // }
  // console.log('Pending vertices: ' + saving.results);

  useEffect(() => {
    return graph.attach('status-changed', () => setStatus(graph.status));
  }, [graph, setStatus]);

  return (
    <div className={cn(styles.indicator)}>
      <Text>{strings[status]}</Text>
    </div>
  );
}
