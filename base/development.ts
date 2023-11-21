import * as path from 'std/path/mod.ts';

export function getEntryFilePath(): string {
  return path.fromFileUrl(import.meta.url);
}

export async function dirExists(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path);
    return stat.isDirectory;
  } catch (_: unknown) {
    return false;
  }
}

export async function getRepositoryPath(): Promise<string> {
  let candidate = path.dirname(getEntryFilePath());
  while (!(await dirExists(path.join(candidate, '.git')))) {
    candidate = path.dirname(candidate);
  }
  return candidate;
}

export async function getImportMapPath(): Promise<string> {
  return path.join(await getRepositoryPath(), 'import-map.json');
}
