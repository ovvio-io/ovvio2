import { createUseStrings } from 'core/localization';
import { useMemo } from 'react';
import { StepDefinition } from 'shared/tutorial/step';
import localization from './new-workspace.strings.json';

export enum WorkspaceSteps {
  Welcome = 'Welcome',
  NameWorkspace = 'NameWorkspace',
  CreateWorkspace = 'CreateWorkspace',
}

const useStrings = createUseStrings(localization);

export function useWorkspaceTutorialSteps(): StepDefinition[] {
  const strings = useStrings();

  return useMemo(
    () => [
      {
        stepId: WorkspaceSteps.Welcome,
        title: strings.tutorialWelcomeTitle,
        text: strings.tutorialWelcomeText,
        general: true,
      },
      {
        stepId: WorkspaceSteps.NameWorkspace,
        title: strings.tutorialNameWorkspaceTitle,
        text: strings.tutorialNameWorkspaceText,
        interactive: true,
        position: 'top',
        prerequisite: (name: any, target?: HTMLElement) => {
          return !!name;
        },
      },
      {
        stepId: WorkspaceSteps.CreateWorkspace,
        title: strings.tutorialCreateWorkspaceTitle,
        text: strings.tutorialCreateWorkspaceText,
        interactive: true,
        position: 'bottom',
        align: 'center',
      },
    ],
    [strings]
  );
}
