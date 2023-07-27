import React from 'react';
import { styleguide } from '../../../../../../../styles/styleguide.ts';
import { Text } from '../../../../../../../styles/components/texts.tsx';
import {
  cn,
  makeStyles,
} from '../../../../../../../styles/css-objects/index.ts';
import {
  typeFromCode,
  ErrorType,
} from '../../../../../../../cfds/base/errors.ts';
import { useQuery } from '../../../../../core/cfds/react/query.ts';

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
  const saving = useQuery(
    (x) => !x.isLocal && !x.isDemoData && x.hasPendingChanges,
    [],
    {
      name: 'ChangesIndicator',
    }
  );
  const hasPendingChanges = saving.results.length > 0;
  console.log(saving.results);

  return (
    <div className={cn(styles.indicator)}>
      <Text>{hasPendingChanges ? 'Saving...' : 'Updated Just Now'}</Text>
    </div>
  );
}
