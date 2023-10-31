import { BaseVertex } from './base.ts';
import { Vertex } from '../vertex.ts';
import { assert } from '../../../../base/error.ts';
import { coreValueCompare } from '../../../../base/core-types/comparable.ts';
import { UserSettings } from './user-settings.ts';
import { NS_USER_SETTINGS } from '../../../base/scheme-types.ts';

export class User extends BaseVertex {
  compare(other: Vertex): number {
    if (other instanceof User) {
      if (this.isRoot) {
        return -1;
      }
      if (other.isRoot) {
        return 1;
      }
      const diff = coreValueCompare(this.name, other.name);
      if (diff !== 0) {
        return diff;
      }
    }
    return super.compare(other);
  }

  get avatarUrl(): string | undefined {
    return this.record.get('avatarUrl');
  }

  set avatarUrl(url: string | undefined) {
    if (url !== undefined) {
      this.record.set('avatarUrl', url);
    } else {
      this.record.delete('avatarUrl');
    }
  }

  get email(): string {
    return this.record.get('email');
  }

  set email(email: string) {
    assert(typeof email === 'string' && email.length > 0);
    this.record.set('email', email);
  }

  get lastLoggedIn(): Date | undefined {
    return this.record.get('lastLoggedIn');
  }

  set lastLoggedIn(d: Date | undefined) {
    if (d !== undefined) {
      this.record.set('lastLoggedIn', d);
    } else {
      this.record.delete('lastLoggedIn');
    }
  }

  get name(): string {
    return this.record.get('name') || 'Anonymous';
  }

  set name(n: string) {
    this.record.set('name', n);
  }

  clearName(): void {
    this.record.delete('name');
  }

  get workspaceColors(): Map<string, number> {
    return this.settings.workspaceColors;
  }

  set workspaceColors(map: Map<string, number>) {
    this.settings.workspaceColors = map;
  }

  get hiddenWorkspaces(): Set<string> {
    return this.settings.hiddenWorkspaces;
  }

  set hiddenWorkspaces(set: Set<string>) {
    this.settings.hiddenWorkspaces = set;
  }

  get pinnedWorkspaces(): Set<string> {
    return this.settings.pinnedWorkspaces;
  }

  set pinnedWorkspaces(set: Set<string>) {
    this.settings.pinnedWorkspaces = set;
  }

  get settings(): UserSettings {
    return this.graph.createVertex(
      NS_USER_SETTINGS,
      {},
      this.key + '_settings',
      false
    );
  }
}
