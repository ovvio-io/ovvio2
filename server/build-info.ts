import { ReadonlyJSONObject } from '../base/interfaces.ts';

export interface BuildInfo extends ReadonlyJSONObject {
  creationDate: string;
  creator: string;
  builder: typeof Deno.build;
}

export function generateBuildInfo(): BuildInfo {
  const creator = new TextDecoder()
    .decode(
      new Deno.Command('whoami', {
        stdout: 'piped',
      }).outputSync().stdout,
    )
    .trim();

  return {
    creationDate: new Date().toISOString(),
    creator,
    builder: Deno.build,
  };
}
