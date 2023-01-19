import React, { useState } from 'https://esm.sh/react@18.2.0';
import { RaisedButton } from '../../../styles/components/buttons.tsx';
import Dialog, {
  DialogActions,
  DialogContent,
} from '../../../styles/components/dialog/index.tsx';
import { H3, Text } from '../../../styles/components/texts.tsx';
import { useOnCriticalError } from '../core/cfds/react/graph-use.ts';
// import { useLogger } from '../core/cfds/react/logger.tsx';

export function CriticalErrorDialog() {
  const [open, setOpen] = useState(false);
  // const logger = useLogger();

  useOnCriticalError(() => {
    setOpen(true);
    // eventLogger.action('CRITICAL_ERROR_POPUP_RAISED', {});
  });

  const onRefreshClick = () => {
    // eventLogger.action('CRITICAL_ERROR_REFRESH_CLICKED', {});

    // eslint-disable-next-line no-self-assign
    // deno-lint-ignore no-self-assign
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
