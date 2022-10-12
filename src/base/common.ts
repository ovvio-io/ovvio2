export function cartesianProduct<T>(...allEntries: T[][]): T[][] {
  return allEntries.reduce<T[][]>(
    (results, entries) =>
      results
        .map((result) => entries.map((entry) => result.concat([entry])))
        .reduce((subResults, result) => subResults.concat(result), []),
    [[]]
  );
}

export function count(iter: Iterable<any>): number {
  let count = 0;
  for (const _ of iter) {
    ++count;
  }
  return count;
}

export function uniqueId(length: number = 20): string {
  // Alphanumeric characters
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let autoId = '';
  for (let i = 0; i < length; i++) {
    autoId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return autoId;
}

export function prettyJSON(o: any): string {
  if (o.toJSON) {
    o = o.toJSON();
  }
  return JSON.stringify(o, null, 2);
}

export function* keysOf(obj: any): Generator<string> {
  for (const k in obj) {
    if (obj.hasOwnProperty(k)) {
      yield k;
    }
  }
}

export function* unionIter<T>(...args: Iterable<T>[]): Generator<T> {
  for (const iter of args) {
    for (const v of iter) {
      yield v;
    }
  }
}

export function newInstance<T = any>(instance: any, ...args: any[]): T {
  return new (instance.constructor as any)(...args) as T;
}
