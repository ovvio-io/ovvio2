export const gridbase = 8;

const timing = {
  standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  in: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  out: 'cubic-bezier(0.4, 0.0, 1, 1)',
};

const duration = {
  standard: 300,
  short: 150,
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
};

export { styleguide };
