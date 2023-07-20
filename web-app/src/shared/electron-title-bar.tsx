import { useEffect, useState, useMemo } from 'react';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { layout } from '@ovvio/styles/lib';
import { Scroller } from 'core/react-utils/scrolling';
import { isElectron, isElectronWindows } from 'electronUtils';

const IS_ELECTRON = isElectron() && !isElectronWindows(); //Temp fix to remove blue bar in windows
export const BAR_HEIGHT = IS_ELECTRON ? 38 : 0;

const useStyles = makeStyles(theme => ({
  bar: {
    '-webkit-app-region': 'drag',
    flexShrink: 0,
    flexGrow: 0,
    backgroundColor: '#d7e3f1',
  },
  container: {
    backgroundColor: theme.background[0],
    height: '100%',
    basedOn: [layout.column, layout.flex],
  },
  rootRow: {
    basedOn: [layout.row, layout.flex],
  },
}));

export const TitleBarContainer: React.FC = ({ children }) => {
  const [barHeight, setBarHeight] = useState(IS_ELECTRON ? 38 : 0);
  const electron = useMemo(() => IS_ELECTRON && window.require('electron'), []);
  const styles = useStyles();

  useEffect(() => {
    if (!IS_ELECTRON) {
      return;
    }
    const wnd = electron.remote.getCurrentWindow();
    wnd.on('enter-full-screen', () => setBarHeight(0));
    wnd.on('leave-full-screen', () => setBarHeight(38));
  }, [electron]);

  return (
    <div className={cn(styles.container)}>
      <ElectronTitleBar height={barHeight} />
      <Scroller>
        {ref => (
          <div
            ref={ref}
            className={cn(styles.rootRow)}
            style={{
              height: `calc(100% - ${barHeight}px`,
            }}
          >
            {children}
          </div>
        )}
      </Scroller>
    </div>
  );
};

export function ElectronTitleBar({ height }) {
  const styles = useStyles();
  if (!IS_ELECTRON) {
    return null;
  }
  const electron = window.require('electron');
  const remote = electron.remote;

  const handleDoubleClick = () => {
    const doubleClickAction = remote.systemPreferences.getUserDefault(
      'AppleActionOnDoubleClick',
      'string'
    );
    const win = remote.getCurrentWindow();
    if (doubleClickAction === 'Minimize') {
      win.minimize();
    } else if (doubleClickAction === 'Maximize') {
      if (!win.isMaximized()) {
        win.maximize();
      } else {
        win.unmaximize();
      }
    }
  };

  return (
    <div
      className={cn(styles.bar)}
      style={{ height: height }}
      onDoubleClick={handleDoubleClick}
    />
  );
}
export default TitleBarContainer;
