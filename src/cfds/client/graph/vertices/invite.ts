import { InviteStatus } from '../../../base/scheme-types';
import { ContentVertex } from './base';
import { User } from './user';

export class Invite extends ContentVertex {
  get status(): InviteStatus {
    return this.record.get('status') as InviteStatus;
  }

  set status(status: InviteStatus) {
    this.record.set('status', status);
  }

  clearStatus(): void {
    this.status = InviteStatus.PENDING;
  }

  get email(): string {
    return this.record.get('email') as string;
  }

  set email(email: string) {
    this.record.set('email', email);
  }

  get emailSent(): boolean {
    return this.record.get('emailSent') === 1;
  }

  set emailSent(flag: boolean) {
    if (flag) {
      this.record.set('emailSent', 1);
    } else {
      this.record.delete('emailSent');
    }
  }

  clearEmailSent(): void {
    this.emailSent = false;
  }

  get invitee(): string | undefined {
    return this.record.get('invitee');
  }

  set invitee(name: string | undefined) {
    if (name === undefined) {
      this.record.delete('invitee');
    } else {
      this.record.set('invitee', name);
    }
  }

  get inviteeUser(): User | undefined {
    const key = this.record.get('inviteeUser');
    if (key !== undefined) {
      return this.graph.getVertex<User>(key);
    }
    return undefined;
  }

  set inviteeUser(user: User | undefined) {
    if (user === undefined) {
      this.record.delete('inviteeUser');
    } else {
      this.record.set('inviteeUser', user.key);
    }
  }
}
