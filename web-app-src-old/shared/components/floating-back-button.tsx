import React from 'react';
import { useLocation, useNavigate } from 'react-router';
import { makeStyles, cn } from '../../../../styles/css-objects/index.ts';
import { styleguide, layout } from '../../../../styles/index.ts';
import { Button } from '../../../../styles/components/buttons.tsx';
import { Text } from '../../../../styles/components/texts.tsx';
import { IconBack } from '../../../../styles/components/icons/index.ts';
import Layer from '../../../../styles/components/layer.tsx';
import { MediaQueries } from '../../../../styles/responsive.ts';
import { useLogger } from '../../core/cfds/react/logger.tsx';

const useStyles = makeStyles((theme) => ({
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
  const navigate = useNavigate();
  const location = useLocation();
  const logger = useLogger();

  const onClick = () => {
    navigate('/');
    logger.log({
      severity: 'INFO',
      event: 'Click',
      source: 'button:back',
      routeInfo: location.pathname + location.search + location.hash,
    });
  };

  if (!history.length) {
    return null;
  }

  const text = 'Back';

  return (
    <Layer>
      {(style) => (
        <Button className={cn(styles.button)} onClick={onClick} style={style}>
          <IconBack />
          <Text className={cn(styles.text)}>{text}</Text>
        </Button>
      )}
    </Layer>
  );
}
