import React, { useState, useEffect, useRef } from 'react';
import { IconKeyboard, IconClose } from '@ovvio/styles/lib/components/icons';
import { IconButton, Button } from '@ovvio/styles/lib/components/buttons';
import { makeStyles, cn, keyframes } from '@ovvio/styles/lib/css-objects';
import { styleguide, layout } from '@ovvio/styles/lib';
import { H3, Text, Bold } from '@ovvio/styles/lib/components/texts';
import { useEventLogger, EventCategory } from 'core/analytics';
import Popper from '@ovvio/styles/lib/components/popper';
import { isMacOS } from '../../../../utils';

const blinkAnim = keyframes(theme => ({
  from: {
    backgroundColor: 'transparent',
  },
  to: {
    backgroundColor: theme.primary[400],
  },
}));

const useStyles = makeStyles(theme => ({
  hintButton: {
    position: 'absolute',
    bottom: styleguide.gridbase * 2,
    right: styleguide.gridbase * 2,
  },
  blink: {
    animation: `2s ${blinkAnim} infinite linear alternate`,
  },
  header: {
    borderBottom: '1px solid rgba(156, 178, 205, 0.6)',
    height: styleguide.gridbase * 5,
    marginTop: styleguide.gridbase * 4,
    alignItems: 'center',
    basedOn: [layout.row],
  },
  section: {
    marginTop: styleguide.gridbase * 5,
  },
  shortcut: {
    marginTop: styleguide.gridbase * 2.5,
    basedOn: [layout.row, layout.centerCenter],
  },
  key: {
    marginRight: styleguide.gridbase,
    padding: [0, styleguide.gridbase],
    borderRadius: 5,
    boxSizing: 'border-box',
    height: styleguide.gridbase * 3,
    backgroundColor: '#e6e8eb',
    basedOn: [layout.column, layout.centerCenter],
    minWidth: styleguide.gridbase * 3,
    ':last-child': {
      marginRight: 0,
    },
  },
  plus: {
    marginRight: styleguide.gridbase,
  },
  legendBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  legend: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.background[0],
    width: '100%',
    maxWidth: styleguide.gridbase * 45,
    boxSizing: 'border-box',
    padding: styleguide.gridbase * 4,
    overflowY: 'auto',
    ...styleguide.transition.standard,
    transform: 'translateX(100%)',
    boxShadow: theme.shadows.z2,
  },
  h1: {
    fontWeight: '900',
  },
  h2: {
    fontWeight: '500',
  },
  closeButton: {
    position: 'absolute',
    top: styleguide.gridbase * 2,
    right: styleguide.gridbase * 2,
    color: 'rgba(17, 8, 43, 0.6)',
    basedOn: [layout.row, layout.centerCenter],
  },
  closeText: {
    lineHeight: `${styleguide.gridbase * 2}px`,
    marginRight: styleguide.gridbase,
  },
  open: {
    transform: 'translateX(0)',
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  underline: {
    textDecoration: 'underline',
  },
  strikethrough: {
    textDecoration: 'line-through',
  },
  tooltip: {
    position: 'relative',
    backgroundColor: theme.background[0],
    boxSizing: 'border-box',
    width: styleguide.gridbase * 30,
    padding: styleguide.gridbase * 2,
    borderRadius: 6,
    boxShadow: '0 8px 8px 0 rgba(0, 0, 0, 0.08), 0 0 8px 0 rgba(0, 0, 0, 0.12)',
    basedOn: [layout.column],
  },
  tooltipClose: {
    position: 'absolute',
    top: styleguide.gridbase * 2,
    right: styleguide.gridbase * 2,
    width: styleguide.gridbase * 2,
    height: styleguide.gridbase * 2,
  },
  tooltipIcon: {
    width: styleguide.gridbase * 2,
    height: styleguide.gridbase * 2,
  },
}));

function mapKey(key) {
  if (key !== 'Meta') {
    return key;
  }
  if (isMacOS()) {
    return '⌘';
  }
  return 'Ctrl';
}

interface ShortcutProps {
  children: React.ReactNode;
  keys: string[];
  macOSKeys?: string[];
}
function Shortcut({ children, keys, macOSKeys }: ShortcutProps) {
  const styles = useStyles();
  let actualKeys = keys;
  if (macOSKeys && isMacOS()) {
    actualKeys = macOSKeys;
  }

  return (
    <div className={cn(styles.shortcut)}>
      {children}
      <div className={cn(layout.flexSpacer)} />
      {actualKeys.map((x, i) => {
        const hasPlus = i < actualKeys.length - 1 && actualKeys[i + 1] !== x;
        return (
          <React.Fragment key={`${x}${i}`}>
            <div className={cn(styles.key)}>
              <Text>{mapKey(x)}</Text>
            </div>
            {hasPlus && <Text className={cn(styles.plus)}>+</Text>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function LegendTooltip({ anchor, open, onClose }) {
  const styles = useStyles();
  return (
    <Popper
      position="top"
      direction="out"
      align="end"
      anchor={anchor}
      open={open}
    >
      <div className={cn(styles.tooltip)}>
        <Bold>Want to work fast?</Bold>
        <Text>
          Click here to open the keyboard shortcuts cheat-sheet in order to make
          the most out of your work.
        </Text>
        <Button className={cn(styles.tooltipClose)} onClick={onClose}>
          <IconClose className={cn(styles.tooltipIcon)} />
        </Button>
      </div>
    </Popper>
  );
}

enum LegendState {
  Close,
  Opening,
  Open,
  Closing,
}

interface LegendViewProps {
  legendState: LegendState;
  changeState: (newState: LegendState) => void;
  onClose: () => void;
}
function LegendView({ legendState, changeState, onClose }: LegendViewProps) {
  const styles = useStyles();
  useEffect(() => {
    if (legendState === LegendState.Opening) {
      changeState(LegendState.Open);
    } else if (legendState === LegendState.Closing) {
      setTimeout(() => {
        changeState(LegendState.Close);
      }, 500);
    }
  }, [legendState, changeState]);

  if (legendState === LegendState.Close) {
    return null;
  }
  return (
    <React.Fragment>
      {legendState === LegendState.Open && (
        <div className={cn(styles.legendBackdrop)} onClick={onClose} />
      )}
      <div
        className={cn(
          styles.legend,
          legendState === LegendState.Open && styles.open
        )}
      >
        <Button className={cn(styles.closeButton)} onClick={onClose}>
          <Text className={cn(styles.closeText)}>Close</Text>
          <IconClose fill="#a09caa" />
        </Button>
        <div className={cn(styles.header)}>
          <Text>Keyboard Shortcuts</Text>
        </div>
        <div className={cn(styles.section)}>
          <H3>Insert/Actions</H3>
          <Shortcut keys={['-', 'Space']}>
            <Text>Create a task</Text>
          </Shortcut>
          <Shortcut keys={['#hashtag']}>
            <Text>Add a tag</Text>
          </Shortcut>
          <Shortcut keys={['@Name']}>
            <Text>Assign a task</Text>
          </Shortcut>
        </div>
        <div className={cn(styles.section)}>
          <H3>Text Formatting</H3>
          <Shortcut keys={['#', 'Space']}>
            <Text>
              <span className={cn(styles.h1)}>H1</span> headline
            </Text>
          </Shortcut>
          <Shortcut keys={['#', '#', 'Space']}>
            <Text>
              <span className={cn(styles.h2)}>H2</span> headline
            </Text>
          </Shortcut>
          <Shortcut keys={['Meta', 'b']}>
            <Text className={cn(styles.bold)}>Bold</Text>
          </Shortcut>
          <Shortcut keys={['Meta', 'i']}>
            <Text className={cn(styles.italic)}>italic</Text>
          </Shortcut>
          <Shortcut keys={['Meta', 'u']}>
            <Text className={cn(styles.underline)}>Underline</Text>
          </Shortcut>
          <Shortcut keys={['Meta', 's']}>
            <Text className={cn(styles.strikethrough)}>Strikethrough</Text>
          </Shortcut>
          <Shortcut keys={['*', 'Space']}>
            <Text>Bullet List</Text>
          </Shortcut>
          <Shortcut keys={['1.', 'Space']}>
            <Text>Numbered List</Text>
          </Shortcut>
        </div>
      </div>
    </React.Fragment>
  );
}

function shouldBeOpen() {
  const didClick = window.localStorage.getItem('did_dismiss_legend');
  return !didClick;
}

export default function LegendButton() {
  const styles = useStyles();
  const anchor = useRef();
  const [showTooltip, setShowTooltip] = useState(false);
  const [legendState, setLegendState] = useState(LegendState.Close);

  const eventLogger = useEventLogger();
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (shouldBeOpen()) {
        setShowTooltip(true);
      }
    }, 2000);
    return () => {
      window.clearTimeout(t);
    };
  }, []);
  const click = () => {
    eventLogger.action('SHOW_LEGEND', {
      category: EventCategory.EDITOR,
    });
    setShowTooltip(false);
    setLegendState(LegendState.Opening);
  };

  const onClose = () => {
    eventLogger.action('HIDE_LEGEND', {
      category: EventCategory.EDITOR,
    });
    window.localStorage.setItem('did_dismiss_legend', Date.now() + '');
    setLegendState(LegendState.Closing);
  };

  const hideTooltip = () => {
    eventLogger.action('HIDE_TOOLTIP', {
      category: EventCategory.EDITOR,
    });
    window.localStorage.setItem('did_dismiss_legend', Date.now() + '');
    setShowTooltip(false);
  };

  const changeState = (newState: LegendState) => {
    setLegendState(newState);
  };

  return (
    <div>
      <IconButton
        ref={anchor}
        className={cn(styles.hintButton)}
        onClick={click}
      >
        <IconKeyboard />
      </IconButton>
      <LegendTooltip
        anchor={anchor.current}
        open={showTooltip}
        onClose={hideTooltip}
      />
      <LegendView
        legendState={legendState}
        changeState={changeState}
        onClose={onClose}
      />
    </div>
  );
}
