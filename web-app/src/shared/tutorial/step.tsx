import { createUseStrings } from 'core/localization';
import { useEffect, useLayoutEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { styleguide, layout } from '@ovvio/styles/lib';
import { LinkButton } from '@ovvio/styles/lib/components/buttons';
import Layer from '@ovvio/styles/lib/components/layer';
import Popper, {
  PopperAlign,
  PopperPosition,
} from '@ovvio/styles/lib/components/popper';
import { H3, Text } from '@ovvio/styles/lib/components/texts';
import { makeStyles, cn, keyframes } from '@ovvio/styles/lib/css-objects';
import { useTutorialContext } from './context';

const show = keyframes({
  from: {
    opacity: 0,
    transform: `translate(-50%, calc(-50% + ${styleguide.gridbase * 3}px))`,
  },
  to: {
    opacity: 1,
    transform: 'translate(-50%, -50%)',
  },
});

const useStyles = makeStyles(theme => ({
  step: {
    backgroundColor: theme.background[0],
    width: `calc(100% - ${styleguide.gridbase * 2}px)`,
    maxWidth: styleguide.gridbase * 44,
    padding: styleguide.gridbase * 3,
    borderRadius: 3,
    boxSizing: 'border-box',
    boxShadow: '2px 2px 12px 0 rgba(255, 255, 255, 0.2)',
    basedOn: [layout.column],
  },
  top: {
    marginBottom: styleguide.gridbase * 2,
  },
  left: {
    marginRight: styleguide.gridbase * 2,
  },
  right: {
    marginLeft: styleguide.gridbase * 2,
  },
  bottom: {
    marginTop: styleguide.gridbase * 2,
  },
  general: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%,-50%)',
    animation: `${show} ${styleguide.transition.duration.short}ms ${styleguide.transition.timing.standard}`,
  },
  title: {
    textAlign: 'left',
    marginBottom: styleguide.gridbase * 4,
  },
  text: {
    textAlign: 'left',
    marginBottom: styleguide.gridbase * 2,
  },
  actions: {
    marginTop: styleguide.gridbase,
    height: styleguide.gridbase * 4,
    display: 'flex',
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  actionBtn: {
    marginLeft: styleguide.gridbase * 3,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdropTint: {
    backgroundColor: theme.background[700],
    opacity: 0.7,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  makeNonStatic: {
    position: 'relative',
  },
  currentStep: {
    zIndex: '2000 !important',
    boxShadow: 'rgb(255 255 255 / 50%) 0 0 3px 5px !important',
  },
  dismissButton: {
    color: theme.background.placeholderText,
  },
  nonInteractive: {
    pointerEvents: 'none',
  },
}));

const useStrings = createUseStrings({
  en: {
    next: 'Got it',
  },
});

function Backdrop({ children }) {
  const styles = useStyles();
  return ReactDOM.createPortal(
    <Layer priority={100}>
      {({ zIndex }) => (
        <div className={cn(styles.backdrop)} style={{ zIndex }}>
          <div className={cn(styles.backdropTint)} />
          {children}
        </div>
      )}
    </Layer>,
    window.document.getElementById('root')
  );
}

export interface StepContext {
  target?: HTMLElement;
}

export interface BaseStepDefinition {
  stepId: string;
  title?: string;
  text: string;
  shouldWait?: boolean;
}

export interface GeneralStepDefinition extends BaseStepDefinition {
  general: true;
}

export interface TargetedStepDefinition extends BaseStepDefinition {
  general?: false;
  position: PopperPosition;
  align?: PopperAlign;
  interactive?: boolean;
  prerequisite?: (context: any, target?: HTMLElement) => boolean;
}

export type StepDefinition = GeneralStepDefinition | TargetedStepDefinition;

function isGeneralStep(step: StepDefinition): step is GeneralStepDefinition {
  return !!step.general;
}

interface GeneralStepProps {
  step: StepDefinition;
  next: () => void;
  dismiss: () => void;
  target?: HTMLElement;
  stepContext?: any;
}

function StepContent({
  step,
  next,
  dismiss,
  className,
  target,
  stepContext,
}: GeneralStepProps & { className?: string }) {
  const styles = useStyles();
  const disabled =
    !isGeneralStep(step) &&
    step.prerequisite &&
    !step.prerequisite(stepContext, target);
  const strings = useStrings();

  return (
    <div className={cn(styles.step, className)}>
      {step.title && (
        <div className={cn(styles.title)}>
          <H3>{step.title}</H3>
        </div>
      )}
      <div className={cn(styles.text)}>
        <Text>{step.text}</Text>
      </div>
      <div className={cn(styles.actions)}>
        <LinkButton
          onClick={next}
          disabled={disabled}
          className={cn(styles.actionBtn)}
        >
          {strings.next}
        </LinkButton>
        {/* <LinkButton
          onClick={dismiss}
          className={cn(styles.actionBtn, styles.dismissButton)}>
          Dismiss
        </LinkButton> */}
      </div>
    </div>
  );
}

function GeneralStep(props: GeneralStepProps) {
  const styles = useStyles();
  return <StepContent {...props} className={cn(styles.general)} />;
}

function TargetedStep(props: GeneralStepProps) {
  const styles = useStyles();
  if (isGeneralStep(props.step)) {
    return null;
  }
  return (
    <Popper
      anchor={props.target}
      open={true}
      position={props.step.position || 'bottom'}
      align={props.step.align}
    >
      <StepContent {...props} className={cn(styles[props.step.position])} />
    </Popper>
  );
}

interface OverlayProps {
  step: StepDefinition;
  next: () => void;
  isVisible: boolean;
  dismiss: () => void;
}
export function Step({ step, isVisible, next, dismiss }: OverlayProps) {
  const tutorialCtx = useTutorialContext();

  if (!step || !isVisible || step.shouldWait) {
    return null;
  }

  if (step.general) {
    return (
      <Backdrop>
        <GeneralStep step={step} next={next} dismiss={dismiss} />
      </Backdrop>
    );
  }

  const target = tutorialCtx.getTarget(step.stepId);
  const stepContext = tutorialCtx.getContext(step.stepId);

  if (!target) {
    return null;
  }

  return (
    <Backdrop>
      <TargetedStep
        step={step}
        next={next}
        dismiss={dismiss}
        target={target}
        stepContext={stepContext}
      />
    </Backdrop>
  );
}
function noop() {}
interface TutorialStepInfo {
  className?: string;
  next: () => void;
  dismiss: () => void;
}

export interface TutorialStepOptions {
  context?: any;
  enabled?: boolean;
}

export function useTutorialStep(
  stepId: string,
  element: HTMLElement,
  opts: TutorialStepOptions = {}
): TutorialStepInfo {
  const styles = useStyles();
  const { context, enabled = true } = opts;
  const tutorialCtx = useTutorialContext();
  const isCurrentStep =
    tutorialCtx.currentStep && tutorialCtx.currentStep.stepId === stepId;
  const interactive =
    isCurrentStep &&
    !isGeneralStep(tutorialCtx.currentStep) &&
    tutorialCtx.currentStep.interactive;
  let isStaticPositioning = false;
  if (element) {
    const style = window.getComputedStyle(element);
    isStaticPositioning = style.position === 'static';
  }
  useLayoutEffect(() => {
    if (element) {
      const unsub = tutorialCtx.registerStep(stepId, element, context, enabled);

      return unsub;
    }
  }, [element, tutorialCtx, context, stepId, enabled]);

  useEffect(() => {
    if (interactive && isCurrentStep && element) {
      element.focus();
    }
  }, [interactive, isCurrentStep, element]);

  const result = useMemo<TutorialStepInfo>(
    () => ({
      className:
        tutorialCtx.currentStep &&
        cn(
          isCurrentStep && styles.currentStep,
          isStaticPositioning && styles.makeNonStatic,
          !interactive && styles.nonInteractive
        ),
      next: isCurrentStep ? tutorialCtx.next : noop,
      dismiss: isCurrentStep ? tutorialCtx.dismiss : noop,
    }),
    [tutorialCtx, isCurrentStep, interactive, isStaticPositioning, styles]
  );

  return result;
}
