export function notImplemented(): never {
  const error = new Error('Oops, looks like you forgot to override something');
  console.error('notImplemented', error);
  debugger;
  throw error;
}

export function notReached(msg: string): never {
  const error = new Error(
    'Oops, this code was supposed to be unreachable' + (msg ? ': ' + msg : '')
  );
  console.error('notReached', error);
  debugger;
  throw error;
}

export function assert(
  condition: boolean,
  msg = 'Failed assertion'
): condition is true {
  if (!condition) {
    const error = new Error(msg);
    console.error('assert failed', error);
    debugger;
    throw error;
  }
  return true;
}
