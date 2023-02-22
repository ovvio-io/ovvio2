import { assert } from '../../../../base/error.ts';
import { BaseVertex } from './base.ts';
import { UserSettings } from './user-settings.ts';
import { NS_USER_SETTINGS } from '../../../base/scheme-types.ts';
import { coreValueCompare } from '../../../../base/core-types/comparable.ts';

export class User extends BaseVertex {
  get avatarUrl(): string | undefined {
    return this.record.get<string>('avatarUrl');
  }

  set avatarUrl(url: string | undefined) {
    if (url !== undefined) {
      this.record.set('avatarUrl', url);
    } else {
      this.record.delete('avatarUrl');
    }
  }

  get email(): string {
    const email = this.record.get<string>('email');
    assert(typeof email === 'string' && email.length > 0);
    return email;
  }

  set email(email: string) {
    assert(typeof email === 'string' && email.length > 0);
    this.record.set('email', email);
  }

  get name(): string {
    return this.record.get('name', this.email);
  }

  set name(n: string) {
    this.record.set('name', n);
  }

  clearName(): void {
    this.record.delete('name');
  }

  get settings(): UserSettings {
    return this.graph.createVertex(
      NS_USER_SETTINGS,
      {},
      this.key + '_settings',
      false
    );
  }

  compare(other: User): number {
    const rootKey = this.graph.rootKey;
    if (this.key === rootKey) {
      return -1;
    }
    if (other.key === rootKey) {
      return 1;
    }
    return coreValueCompare(this.name, other.name) || super.compare(other);
  }
}
