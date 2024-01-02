import { murmur3 } from './hash.ts';

const K_MURMUR_SEED = 7366173373169631;

export class RendezvoisHash {
  private readonly _peers: Set<string>;

  constructor(peers?: Iterable<string>) {
    this._peers = new Set(peers);
  }

  addPeer(p: string): void {
    this._peers.add(p);
  }

  removePeer(p: string): void {
    this._peers.delete(p);
  }

  peerForKey(key: string | null): string | undefined {
    const peers = this._peers;
    if (!peers.size) {
      return undefined;
    }
    const entries: RendezvoisEntry[] = [];
    const normalizedKey = key === null ? 'null' : `"${key}"`;
    for (const p of peers) {
      entries.push([p, murmur3(`${p}/${normalizedKey}`, K_MURMUR_SEED)]);
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
