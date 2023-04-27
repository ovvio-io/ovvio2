import { allKeysOf } from '../base/common.ts';

export type ParamDesc = [paramName: string, desc: string];

export interface ManualEntry {
  desc: string;
  params?: ParamDesc | ParamDesc[];
}

export type Manual<T extends string> = {
  [cmd in T]: ManualEntry | string;
};

export function buildHelpMessage<T extends string>(manual: Manual<T>): string {
  let result = 'Available commands:\n';
  const [maxCmdLen] = manualCalcSizes(manual);
  for (const cmd of allKeysOf(manual).sort()) {
    let info = manual[cmd as keyof Manual<T>];
    if (typeof info === 'string') {
      info = {
        desc: info,
      };
    }
    result +=
      ' '.repeat(4 + maxCmdLen - cmd.length) +
      cmd.toLocaleLowerCase() +
      manualParamsForCmd(manual, cmd) +
      ': ' +
      info.desc +
      '\n';
  }
  return result;
}

function manualCalcSizes<T extends string>(
  manual: Manual<T>
): [maxCmdLen: number, maxParamLen: number] {
  let len1 = 0;
  let len2 = 0;
  for (const cmd of Object.keys(manual) as (keyof Manual<T>)[]) {
    len1 = Math.max(len1, cmd.length);
    for (const [paramName] of manualGetParams(manual[cmd])) {
      len2 = Math.max(len2, paramName.length);
    }
  }
  return [len1, len2];
}

function manualGetParams(entry: ManualEntry | string): ParamDesc[] {
  if (typeof entry === 'string') {
    return [];
  }
  const p = entry.params;
  if (!p) {
    return [];
  }
  if (typeof p[0] === 'string') {
    return [p as ParamDesc];
  }
  return p as ParamDesc[];
}

function manualParamsForCmd<T extends string>(
  manual: Manual<T>,
  cmd: keyof Manual<T>
): string {
  const params = manualGetParams(manual[cmd]);
  if (params.length < 1) {
    return '';
  }
  const [maxCmdLen, maxParamLen] = manualCalcSizes(manual);
  let result = '';
  for (const [paramName] of params) {
    result +=
      ' '.repeat(Math.ceil((maxParamLen + 4 - paramName.length) / 2)) +
      `<${paramName}>`;
  }
  result += ' '.repeat(
    Math.floor((maxParamLen + 4 - params[params.length - 1].length) / 2)
  );
  return result;
}
