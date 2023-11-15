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
  bar: {
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    boxSizing: 'border-box',
    basedOn: [layout.column],
  },
  barRow: {
    padding: ['40px', 0],
    height: styleguide.gridbase * 5,
    basedOn: [layout.column],
  },
  viewRow: {
    borderBottom: `${theme.supporting.O1} 1px solid`,
    marginBottom: styleguide.gridbase,
    padding: [0, SIDES_PADDING],
  },

  dropDownButtonText: {
    marginLeft: styleguide.gridbase,
    marginRight: styleguide.gridbase,
  },
  dialogHeader: {
    width: '100%',
    height: styleguide.gridbase * 14,
    boxSizing: 'border-box',
    alignItems: 'center',
    padding: [0, SIDES_PADDING],
    basedOn: [layout.row],
    fontWeight: '400',
    lineHeight: '24px',
    fontSize: '18px',
  },
}));
