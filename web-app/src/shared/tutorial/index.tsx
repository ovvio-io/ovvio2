import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { User } from '@ovvio/cfds/lib/client/graph/vertices';
import { useEventLogger } from 'core/analytics';
import { useRootUser } from 'core/cfds/react/graph';
import { usePartialVertex } from 'core/cfds/react/vertex';
import config from 'core/config';
import React, { useEffect, useState } from 'react';
import { TutorialContextProvider } from './context';
import { StepDefinition, Step, useTutorialStep } from './step';

interface UserOnboardProps {
  steps: StepDefinition[];
  tutorialId: string;
  disabled?: boolean;
  playAfter?: string[];
}

let didClear = sessionStorage.getItem('devTutorialReset');

function useResetTutorials(user: VertexManager<User>) {
  useEffect(() => {
    if (didClear) {
      return;
    }
    const proxy = user.getVertexProxy();
    proxy.clearSeenTutorials();
    sessionStorage.setItem('devTutorialReset', '1');
    didClear = '1';
  }, [user]);
}

const useDevReset = config.isDev ? useResetTutorials : () => {};

const GLOBAL_DISABLED = true;

export const UserOnboard: React.FC<UserOnboardProps> = ({
  steps,
  children,
  tutorialId,
  disabled,
  playAfter = [],
}) => {
  const userManager = useRootUser();
  useDevReset(userManager);
  const { seenTutorials } = usePartialVertex(userManager, ['seenTutorials']);
  const showOnboard =
    !GLOBAL_DISABLED &&
    !disabled &&
    !seenTutorials.has(tutorialId) &&
    playAfter.every(id => seenTutorials.has(id));

  const dismiss = () => {
    seenTutorials.add(tutorialId);
    const u = userManager.getVertexProxy();
    u.seenTutorials = seenTutorials;
  };
  return (
    <OnboardOverlay
      showTutorial={showOnboard}
      dismiss={dismiss}
      steps={steps}
      tutorialId={tutorialId}
    >
      {children}
    </OnboardOverlay>
  );
};

interface OnboardOverlayProps {
  steps: StepDefinition[];
  showTutorial: boolean;
  tutorialId?: string;
  dismiss: () => void;
}
export const OnboardOverlay: React.FC<OnboardOverlayProps> = ({
  children,
  steps,
  showTutorial,
  tutorialId,
  dismiss,
}) => {
  const [index, setIndex] = useState(0);
  const eventLogger = useEventLogger();

  const onDismiss = () => {
    const selectedStep = steps[index];
    eventLogger.action('TUTORIAL_DISMISS_CLICKED', {
      data: {
        stepId: selectedStep.stepId,
        tutorialId,
      },
    });
    dismiss();
  };

  const next = () => {
    const selectedStep = steps[index];
    eventLogger.action('TUTORIAL_NEXT_CLICKED', {
      data: {
        stepId: selectedStep.stepId,
        tutorialId,
      },
    });
    if (index === steps.length - 1) {
      if (tutorialId) {
        eventLogger.action('TUTORIAL_DONE', {
          data: {
            tutorialId,
          },
        });
      }
      dismiss();
    } else {
      setIndex(x => x + 1);
    }
  };
  return (
    <TutorialContextProvider
      currentStep={showTutorial && steps[index]}
      next={next}
      dismiss={onDismiss}
    >
      {children}
      <Step
        step={steps[index]}
        isVisible={showTutorial}
        next={next}
        dismiss={onDismiss}
      />
    </TutorialContextProvider>
  );
};

export { useTutorialStep };
