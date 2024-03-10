import { BaseVertex } from './base.ts';
import { Vertex } from '../vertex.ts';
import { assert } from '../../../../base/error.ts';
import { coreValueCompare } from '../../../../base/core-types/comparable.ts';
import { UserSettings } from './user-settings.ts';
import {
  NS_USER_SETTINGS,
  UserPermission,
} from '../../../base/scheme-types.ts';
import { normalizeEmail } from '../../../../base/string.ts';
import * as SetUtils from '../../../../base/set.ts';
import { Dictionary } from '../../../../base/collections/dict.ts';
import { MutationPack } from '../mutations.ts';
import { kAllUserPermissions } from '../../../base/scheme-types.ts';

export type UserMetadataKey = 'companyRoles' | 'comments' | 'team';

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
    this.record.set('email', normalizeEmail(email));
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
      false,
    );
  }

  get metadata(): Dictionary<UserMetadataKey, string> {
    return this.record.get('metadata') || new Map();
  }

  set metadata(d: Dictionary<UserMetadataKey, string>) {
    this.record.set('metadata', d);
  }

  getRoles(): string[] {
    const roles = (this.metadata.get('companyRoles') || '').split(',');
    return roles.filter((v) => v.length > 0);
  }
  get teams(): string[] {
    return parseTeams(this.metadata.get('team'));
  }

  metadataDidMutate(
    local: boolean,
    oldValue: Dictionary<UserMetadataKey, string> | undefined,
  ): MutationPack {
    return ['teams', local, parseTeams(oldValue?.get('team'))];
  }

  get permissions(): Set<UserPermission> {
    return this.record.get('permissions') || new Set();
  }

  set permissions(s: Set<UserPermission>) {
    s = normalizePermissions(s);
    if (s.size > 0) {
      this.record.set('permissions', s);
    } else {
      this.record.delete('permissions');
    }
  }

  clearPermissions(): void {
    this.record.delete('permissions');
  }
}

function parseTeams(str: string | undefined): string[] {
  return (str || '').split(',').filter((x) => x.length > 0);
}

function normalizePermissions(s: Set<UserPermission>): Set<UserPermission> {
  s = SetUtils.filter(s, (v) => kAllUserPermissions.includes(v));
  if (s.has('manage:users')) {
    s.add('view:settings:org');
  }
  return s;
}
