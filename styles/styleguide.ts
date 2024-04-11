export const gridbase = 8;

const timing = {
  standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  in: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  out: 'cubic-bezier(0.4, 0.0, 1, 1)',
};

const duration = {
  long: 500,
  standard: 300,
  short: 150,
};

const baseTextStyle = {
  color: '#262626',
  fontFeatureSettings: "'clig' off, 'liga' off",
  fontFamily: 'Poppins',
  fontStyle: 'normal',
  lineHeight: 'normal',
};

export const textStyles = {
  text: {
    ...baseTextStyle,
    fontSize: '13px',
    fontWeight: '400',
    letterSpacing: '0.075px',
  },
  'text-small': {
    ...baseTextStyle,
    fontSize: '10px',
    fontWeight: '400',
    lineHeight: '14px',
    letterSpacing: '-0.1px',
  },
  quote: {
    ...baseTextStyle,
    fontSize: '14px',
    fontStyle: 'italic',
    fontWeight: '300',
    letterSpacing: '0.067px',
  },
  button: {
    ...baseTextStyle,
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: '500',
    lineHeight: 'normal',
  },
  'text-bold': {
    ...baseTextStyle,
    fontSize: '13px',
    fontWeight: '600',
  },
  'label-small': {
    ...baseTextStyle,
    fontSize: '14px',
    fontWeight: '600',
    lineHeight: '21px',
    letterSpacing: '0.087px',
  },
  'h6-headline': {
    ...baseTextStyle,
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '21px',
    letterSpacing: '0.1px',
  },
  'h5-headline': {
    ...baseTextStyle,
    fontSize: '16px',
    fontWeight: '400',
    lineHeight: '22px',
    letterSpacing: '0.1px',
  },
  'h4-headline': {
    ...baseTextStyle,
    fontSize: '18px',
    fontWeight: '400',
    lineHeight: '24px',
    letterSpacing: '0.086px',
  },
  'h3-bold': {
    ...baseTextStyle,
    fontSize: '18px',
    fontWeight: '700',
    lineHeight: '24px',
    letterSpacing: '0.086px',
  },
  'h3-headline': {
    ...baseTextStyle,
    fontSize: '18px',
    fontWeight: '600',
    lineHeight: '24px',
    letterSpacing: '0.086px',
  },
  'h2-bold': {
    color: 'var(--monochrom-m-10, #262626)',
    fontFamily: 'Poppins',
    fontSize: '30px',
    fontStyle: 'normal',
    fontWeight: '700',
    lineHeight: '32px',
  },
  'h2-headline': {
    color: 'var(--monochrom-m-10, #262626)',
    fontFamily: 'Poppins',
    fontSize: '30px',
    fontStyle: 'normal',
    fontWeight: '600',
    lineHeight: '32px',
  },
  'h1-headline': {
    color: '#262626',
    fontFamily: 'Poppins',
    fontSize: '34px',
    fontStyle: 'normal',
    fontWeight: '600',
    lineHeight: '45px',
  },
};

export const transition = {
  timing,
  duration,
  standard: {
    transitionDuration: duration.standard + 'ms',
    transitionTimingFunction: timing.standard,
  },
  short: {
    transitionDuration: duration.short + 'ms',
    transitionTimingFunction: timing.standard,
  },
};
const styleguide = {
  gridbase,
  transition,
  textStyles,
};

export { styleguide };
