import { makeStyles } from '../../../../../styles/css-objects/index.ts';
import { layout } from '../../../../../styles/layout.ts';
import { styleguide } from '../../../../../styles/styleguide.ts';
import { brandLightTheme as theme } from '../../../../../styles/theme.tsx';

export const SIDES_PADDING = styleguide.gridbase * 11;

export const tabsStyles = makeStyles(() => ({
  root: {
    height: '100vh',
    background: 'var(--secondary-secondary-s-0, #FFFBF5)',
    overflow: 'auto',
  },
  wsBar: {
    basedOn: [layout.row],
    zIndex: 1,
    height: '100vh',
    overflow: 'auto',
  },
  bar: {
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    boxSizing: 'border-box',
    basedOn: [layout.column, layout.flexSpacer],
  },
  barRow: {
    padding: ['40px', 0],
    height: styleguide.gridbase * 5,
    basedOn: [layout.column, layout.flexSpacer],
  },
  viewRow: {
    borderBottom: `${theme.supporting.O1} 1px solid`,
    marginBottom: styleguide.gridbase,
    padding: [0, SIDES_PADDING],
    position: 'relative',
  },
  dropDownButtonText: {
    marginLeft: styleguide.gridbase,
    marginRight: styleguide.gridbase,
  },
  dialogHeader: {
    width: '100%',
    height: styleguide.gridbase * 14,
    boxSizing: 'border-box',
    padding: '32px 0px 0px 88px',
    basedOn: [layout.column],
    fontWeight: '400',
    lineHeight: '24px',
    fontSize: '18px',
  },
  settingsFields: {
    display: 'flex',
    flexDirection: 'column',
  },
}));
