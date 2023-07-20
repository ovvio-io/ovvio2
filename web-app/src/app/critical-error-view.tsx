import { RaisedButton } from '@ovvio/styles/lib/components/buttons';
import Dialog, {
  DialogActions,
  DialogContent,
} from '@ovvio/styles/lib/components/dialog';
import { H3, Text } from '@ovvio/styles/lib/components/texts';
import { useState } from 'react';
import { useEventLogger } from '../core/analytics';
import { useOnCriticalError } from '../core/cfds/react/graph-use';

export function CriticalErrorDialog() {
  const [open, setOpen] = useState(false);
  const eventLogger = useEventLogger();

  useOnCriticalError(() => {
    setOpen(true);
    eventLogger.action('CRITICAL_ERROR_POPUP_RAISED', {});
  });

  const onRefreshClick = () => {
    eventLogger.action('CRITICAL_ERROR_REFRESH_CLICKED', {});

    // eslint-disable-next-line no-self-assign
    window.location.href = window.location.href;
  };

  return (
    <Dialog open={open}>
      <DialogContent>
        <H3>OOPS, an unexpected error occurred</H3>
        <Text>We apologize for the inconvenience.</Text>
        <br />
        <Text>Just refresh and get back to work (:</Text>
      </DialogContent>
      <DialogActions>
        <RaisedButton onClick={onRefreshClick}>Refresh</RaisedButton>
      </DialogActions>
    </Dialog>
  );
}
