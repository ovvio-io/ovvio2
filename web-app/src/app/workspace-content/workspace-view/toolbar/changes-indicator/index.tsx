import { ErrorType, typeFromCode } from '@ovvio/cfds/lib/server/errors';
import { styleguide } from '@ovvio/styles/lib';
import { Text } from '@ovvio/styles/lib/components/texts';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { useQuery } from 'core/cfds/react/query';

const useStyles = makeStyles(theme => ({
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
    x =>
      !x.isLocal &&
      !x.isDemoData &&
      x.hasPendingChanges &&
      (x.errorCode === undefined ||
        typeFromCode(x.errorCode) !== ErrorType.NoAccess),
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
