import { Vertex } from '../vertex.ts';

export class UserSettings extends Vertex {
  get lastLoggedIn(): Date | undefined {
    return this.record.get<Date>('lastLoggedIn');
  }

  set lastLoggedIn(d: Date | undefined) {
    if (d !== undefined) {
      this.record.set('lastLoggedIn', d);
    } else {
      this.record.delete('lastLoggedIn');
    }
  }

  get workspaceColors(): Map<string, number> {
    const workspaceColors = this.record.get<
      Map<
        string,
        number
      >
    >('workspaceColors');
    if (!workspaceColors) {
      return new Map<string, number>();
    }

    const copy = new Map(workspaceColors.entries());
    return copy;
  }

  set workspaceColors(map: Map<string, number>) {
    const copy = new Map(map);
    this.record.set('workspaceColors', copy);
  }

  get hiddenWorkspaces(): Set<string> {
    return this.record.get('hiddenWorkspaces') || new Set();
  }

  set hiddenWorkspaces(set: Set<string>) {
    this.record.set('hiddenWorkspaces', new Set(set));
  }

  get pinnedWorkspaces(): Set<string> {
    return this.record.get('pinnedWorkspaces') || new Set();
  }

  set pinnedWorkspaces(set: Set<string>) {
    this.record.set('pinnedWorkspaces', new Set(set));
  }
}
