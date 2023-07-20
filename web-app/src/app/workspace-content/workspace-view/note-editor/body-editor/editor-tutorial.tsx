import { useRootUser } from 'core/cfds/react/graph';
import { usePartialVertex } from 'core/cfds/react/vertex';
import { createUseStrings } from 'core/localization';
import { CardElement } from 'core/slate/elements/card.element';
import { ElementUtils } from 'core/slate/utils/element-utils';
import { useEffect, useMemo, useState } from 'react';
import { UserOnboard } from 'shared/tutorial';
import { StepDefinition } from 'shared/tutorial/step';
import { useSlate } from 'slate-react';
import localization from './body-editor.strings.json';

const TIMEOUT = 3000;
const MIN_ROWS = 3;

const useStrings = createUseStrings(localization);

function useEditorTutorial() {
  const editor = useSlate();
  const [shouldShowTutorial, setShouldShowTutorial] = useState(false);

  useEffect(() => {
    if (editor.children.length < MIN_ROWS) {
      return;
    }

    const [node] = ElementUtils.findNode(editor, CardElement.isCard);
    if (node) {
      return;
    }
    const id = window.setTimeout(() => {
      setShouldShowTutorial(true);
    }, TIMEOUT);

    return () => {
      window.clearTimeout(id);
    };
  }, [editor, editor.children]);

  return shouldShowTutorial;
}

enum EditorTutorialSteps {
  CreateTask = 'CreateTask',
}
const TUTORIAL_ID = 'EDITOR_TUTORIAL';

function EditorTutorialInternal() {
  const shouldShowTutorial = useEditorTutorial();
  const strings = useStrings();
  const steps = useMemo<StepDefinition[]>(
    () => [
      {
        stepId: EditorTutorialSteps.CreateTask,
        title: strings.CreateTaskTitle,
        text: strings.CreateTaskText,
        general: true,
        shouldWait: !shouldShowTutorial,
      },
    ],
    [shouldShowTutorial, strings]
  );

  return <UserOnboard tutorialId={TUTORIAL_ID} steps={steps} />;
}

export function EditorTutorial() {
  const userManager = useRootUser();
  const { seenTutorials } = usePartialVertex(userManager, ['seenTutorials']);
  if (seenTutorials.has(TUTORIAL_ID)) {
    return null;
  }

  return <EditorTutorialInternal />;
}
