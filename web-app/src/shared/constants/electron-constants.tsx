import config from '../../core/config';

export const electronConstants = {
  OUTLOOK_EXPORT_RESULT: {
    ALREADY_RUNNING: -1,
    SUCCESS: 0,
    ERROR: 1,
    DIALOG_OPEN: 2,
    NOT_INSTALLED: 3,
    INVALID_INPUT: 4,
    NOT_WINDOWS: 5,
  },
  PROTOCOL_NAME: config.isProduction
    ? 'ovvio'
    : 'ovvio-' + config.name.toLowerCase(),
};
