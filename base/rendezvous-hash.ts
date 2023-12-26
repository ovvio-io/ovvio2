import { murmur3 } from './hash.ts';

export class RendezvoisHash {
  private readonly _servers: Set<string>;

  constructor(servers?: Iterable<string>) {
    this._servers = new Set(servers);
  }

  addServer(server: string): void {
    this._servers.add(server);
  }

  removeServer(s: string): void {
    this._servers.delete(s);
  }

  serverForKey(key: string): string {
    const servers = this._servers;
    const entries: RendezvoisEntry[] = [];
    for (const s of servers) {
      entries.push([s, murmur3(`${s}/${key}`)]);
    }
    entries.sort(compareRendezvoisEntries);
    return entries[0][0];
  }
}

type RendezvoisEntry = [server: string, hash: number];
function compareRendezvoisEntries(
  e1: RendezvoisEntry,
  e2: RendezvoisEntry,
): number {
  return e1[1] - e2[1];
}
