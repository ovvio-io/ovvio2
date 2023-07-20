import { createUseStrings } from 'core/localization';
import { useMemo } from 'react';
import { StepDefinition } from 'shared/tutorial/step';
import localization from './invite.strings.json';

export enum InvitationSteps {
  InviteStart = 'InviteStart',
  AddEmail = 'AddEmail',
  AddMore = 'AddMore',
}

const useStrings = createUseStrings(localization);

export function useInviteTutorialSteps(): StepDefinition[] {
  const strings = useStrings();

  return useMemo(
    () => [
      {
        stepId: InvitationSteps.InviteStart,
        title: strings.tutorialStartTitle,
        text: strings.tutorialStartText,
        general: true,
      },
      {
        stepId: InvitationSteps.AddEmail,
        title: strings.tutorialAddEmailTitle,
        text: strings.tutorialAddEmailText,
        position: 'top',
        interactive: true,
        prerequisite(isEmailValid: boolean) {
          return isEmailValid;
        },
      },
      {
        stepId: InvitationSteps.AddMore,
        title: strings.tutorialAddMoreTitle,
        text: strings.tutorialAddMoreText,
        general: true,
      },
    ],
    [strings]
  );
}
