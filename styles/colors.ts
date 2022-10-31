import { murmurhash2_32_gc } from '../base/hash.ts';

const COLORS_WORKSPACES = [
  '#fe4a62',
  '#dd2e9a',
  '#1995d1',
  '#00c7d6',
  '#da9f43',
];
const COLORS_USERS = ['#1995d1', '#00c7d6', '#da9f43', '#dd2e9a', '#fe4a62'];
const MURMUR_SEED_USER = 7998030375102784;
const MURMUR_SEED_WORKSPACE = 5941403181730068;

function getColorForString(
  str: string,
  seed: number,
  colors: string[]
): string {
  const index = murmurhash2_32_gc(str, seed) % colors.length;
  return colors[index];
}

export function getColorForUserId(uid: string): string {
  return getColorForString(uid, MURMUR_SEED_USER, COLORS_USERS);
}

export function getColorForWorkspaceId(uid: string): string {
  return getColorForString(uid, MURMUR_SEED_WORKSPACE, COLORS_WORKSPACES);
}
