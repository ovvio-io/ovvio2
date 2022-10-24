import React from 'react';
import { LOGIN, useHistory } from 'core/react-utils/history';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { styleguide, layout } from '@ovvio/styles/lib';
import { Button } from '@ovvio/styles/lib/components/buttons';
import { Text } from '@ovvio/styles/lib/components/texts';
import { IconBack } from '@ovvio/styles/lib/components/icons';
import Layer from '@ovvio/styles/lib/components/layer';
import { useEventLogger } from '../../core/analytics';
import { MediaQueries } from '@ovvio/styles/lib/responsive';

const useStyles = makeStyles(theme => ({
  button: {
    position: 'absolute',
    top: styleguide.gridbase * 3,
    left: styleguide.gridbase * 3,
    [MediaQueries.Tablet]: {
      top: styleguide.gridbase * 2,
      left: styleguide.gridbase * 2,
    },
    [MediaQueries.Mobile]: {
      top: styleguide.gridbase,
      left: styleguide.gridbase,
    },
    height: styleguide.gridbase * 5,
    padding: styleguide.gridbase,
    boxSizing: 'border-box',
    minWidth: styleguide.gridbase * 12,
    backgroundColor: theme.background[0],
    borderRadius: 3,
    boxShadow: '0 3px 5px 0 rgba(42, 62, 82, 0.12)',
  },
  text: {
    height: `${styleguide.gridbase * 3}px`,
    lineHeight: `${styleguide.gridbase * 3}px`,
    textAlign: 'left',
    basedOn: [layout.flex],
  },
}));

export default function FloatingBackButton() {
  const styles = useStyles();
  const history = useHistory();
  const eventLogger = useEventLogger();

  const onClick = () => {
    const currState = history.getRouteInformation(0);
    const prevState = history.getRouteInformation(1);
    if (prevState === undefined || prevState === null) {
      history.replace(LOGIN);
    } else {
      history.pop();
    }

    eventLogger.action('BACK_BUTTON_CLICKED', {
      source: `${currState.id}:${currState.url}`,
    });
  };

  if (!history.length) {
    return null;
  }

  let text = 'Back';

  return (
    <Layer>
      {style => (
        <Button className={cn(styles.button)} onClick={onClick} style={style}>
          <IconBack />
          <Text className={cn(styles.text)}>{text}</Text>
        </Button>
      )}
    </Layer>
  );
}
