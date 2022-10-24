import { createUseStrings } from 'core/localization';
import { useMemo } from 'react';
import { StepDefinition } from 'shared/tutorial/step';

export enum DisplayBarSteps {
  CreateNote = 'CreateNote',
}

const useStrings = createUseStrings({
  en: {
    CreateNoteTitle: 'Create a note',
    CreateNoteText:
      'Write meeting minutes, assign tasks and share with your project or team',
  },
});

export function useDisplayBarTutorialSteps(): StepDefinition[] {
  const strings = useStrings();

  return useMemo(
    () => [
      {
        stepId: DisplayBarSteps.CreateNote,
        title: strings.CreateNoteTitle,
        text: strings.CreateNoteText,
        interactive: true,
        position: 'bottom',
        align: 'end',
      },
    ],
    [strings]
  );
}
