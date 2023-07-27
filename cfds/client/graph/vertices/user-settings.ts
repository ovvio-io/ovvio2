import * as SetUtils from '../../../../base/set.ts';
import { OnboardingStep } from '../../../base/scheme-versions.ts';
import { Vertex } from '../vertex.ts';

export class UserSettings extends Vertex {
  get passwordHash(): string | undefined {
    return this.record.get<string>('passwordHash');
  }

  set passwordHash(p: string | undefined) {
    if (p) {
      this.record.set('passwordHash', p);
    } else {
      this.record.delete('passwordHash');
    }
  }

  clearPasswordHash(): void {
    this.record.delete('passwordHash');
  }

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

  get seenTutorials(): Set<string> {
    const seenTutorials = this.record.get('seenTutorials') as Set<string>;
    if (seenTutorials === undefined || seenTutorials.size === 0) {
      return new Set<string>();
    }

    const copy = SetUtils.map(seenTutorials, (v) => v);
    return copy;
  }

  set seenTutorials(set: Set<string>) {
    const copy = SetUtils.map(set, (v) => v);
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
