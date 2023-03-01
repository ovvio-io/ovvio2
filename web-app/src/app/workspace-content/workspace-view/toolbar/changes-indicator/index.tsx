import React from 'https://esm.sh/react@18.2.0';
import { styleguide } from '../../../../../../../styles/index.ts';
import { Text } from '../../../../../../../styles/components/texts.tsx';
import {
  cn,
  makeStyles,
} from '../../../../../../../styles/css-objects/index.ts';
import { useSharedQuery } from '../../../../../core/cfds/react/query.ts';

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
  const hasPendingChangesQuery = useSharedQuery('hasPendingChanges');
  const hasPendingChanges = hasPendingChangesQuery.count > 0;

  return (
    <div className={cn(styles.indicator)}>
      <Text>{hasPendingChanges ? 'Syncing...' : 'Updated Just Now'}</Text>
    </div>
  );
}
