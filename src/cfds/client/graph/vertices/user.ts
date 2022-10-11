import { assert } from '@ovvio/base/lib/utils';
import { Workspace } from './workspace';
import { BaseVertex } from './base';
import { Record } from '../../../base/record';
import { Utils } from '@ovvio/base';
import { VertexManager } from '../vertex-manager';
import { Vertex, VertexConfig } from '../vertex';
import { OnboardingStep } from '../../../base/scheme-versions';

export class User extends BaseVertex {
  constructor(
    mgr: VertexManager,
    record: Record,
    prevVertex: Vertex | undefined,
    config: VertexConfig | undefined
  ) {
    super(mgr, record, prevVertex, config);
    if (prevVertex && prevVertex instanceof User) {
      this.selected = prevVertex.selected;
    }
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
    const email = this.record.get('email');
    assert(typeof email === 'string' && email.length > 0);
    return email;
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
    return this.record.get('name', this.email);
  }

  set name(n: string) {
    this.record.set('name', n);
  }

  clearName(): void {
    this.record.delete('name');
  }

  selected: boolean = false;
  clearSelected() {
    this.selected = false;
  }

  get workspaces(): Set<Workspace> {
    return this.vertSetForField('workspaces');
  }

  set workspaces(s: Set<Workspace>) {
    this.record.set(
      'workspaces',
      Utils.Set.map(s, (ws: Workspace) => ws.key)
    );
  }

  clearWorkspaces(): void {
    this.record.set('workspaces', new Set());
  }

  get seenTutorials(): Set<string> {
    const seenTutorials = this.record.get('seenTutorials') as Set<string>;
    if (seenTutorials === undefined || seenTutorials.size === 0) {
      return new Set<string>();
    }

    const copy = Utils.Set.map(seenTutorials, v => v);
    return copy;
  }

  set seenTutorials(set: Set<string>) {
    const copy = Utils.Set.map(set, v => v);
    this.record.set('seenTutorials', copy);
  }

  clearSeenTutorials(): void {
    this.record.set('seenTutorials', new Set());
  }

  get workspaceColors(): Map<string, number> {
    const workspaceColors = this.record.get('workspaceColors') as Map<
      string,
      number
    >;
    if (!workspaceColors) {
      return new Map<string, number>();
    }

    const copy = new Map(workspaceColors.entries());
    return copy;
  }

  set workspaceColors(map: Map<string, number>) {
    const copy = new Map(map.entries());
    this.record.set('workspaceColors', copy);
  }

  get hiddenWorkspaces(): Set<string> {
    return this.record.get('hiddenWorkspaces');
  }

  set hiddenWorkspaces(set: Set<string>) {
    this.record.set('hiddenWorkspaces', new Set(set));
  }

  get pinnedWorkspaces(): Set<string> {
    return this.record.get('pinnedWorkspaces');
  }

  set pinnedWorkspaces(set: Set<string>) {
    this.record.set('pinnedWorkspaces', new Set(set));
  }

  get onboardingStep(): OnboardingStep {
    return this.record.get('onboardingStep', OnboardingStep.Start);
  }

  set onboardingStep(step: OnboardingStep) {
    this.record.set('onboardingStep', step);
  }
}
