import { makeStyles } from './css-objects/index.ts';

const layout = makeStyles(
  {
    row: {
      display: 'flex',
      flexDirection: 'row',
      '&startCenter': {
        alignItems: 'flex-start',
        justifyContent: 'center',
      },
    },
    column: {
      display: 'flex',
      flexDirection: 'column',
    },
    centerCenter: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    flex: {
      flexGrow: '1',
      flexShrink: '0',
      flexBasis: 'auto',
    },
    flexSpacer: {
      flexGrow: '1',
      flexShrink: '1',
      flexBasis: 'auto',
    },
  },
  'layout_1535ab'
);

export { layout };
