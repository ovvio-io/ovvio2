import React, { useContext, useMemo, useRef, useState } from 'react';
import { StepDefinition } from './step';

interface TutorialContext {
  registerStep(
    stepId: string,
    element: HTMLElement,
    context: any,
    enabled: boolean
  ): () => void;
  getTarget(stepId: string): HTMLElement;
  getContext(stepId: string): any;
  currentStep: StepDefinition | undefined;
  next: () => void;
  dismiss: () => void;
}

const context = React.createContext<TutorialContext | undefined>(undefined);
export function useTutorialContext() {
  return useContext(context);
}

interface TutorialContextProviderProps {
  children: React.ReactNode;
  currentStep: StepDefinition | undefined;
  next: () => void;
  dismiss: () => void;
}
export function TutorialContextProvider({
  children,
  currentStep,
  next,
  dismiss,
}: TutorialContextProviderProps) {
  const parentCtx = useTutorialContext();
  const stepMapRef = useRef<Record<string, HTMLElement>>({});
  const [contextMap, setContextMap] = useState<Record<string, any>>({});
  const ctx = useMemo(() => {
    return {
      registerStep(
        stepId: string,
        element: HTMLElement,
        context: any,
        enabled: boolean
      ) {
        stepMapRef.current = {
          ...stepMapRef.current,
          [stepId]: element,
        };
        if (typeof context !== 'undefined') {
          setContextMap(x => {
            if (x[stepId] === context) {
              return x;
            }
            return {
              ...x,
              [stepId]: context,
            };
          });
        }

        return () => {
          const { [stepId]: el, ...rest } = stepMapRef.current;
          stepMapRef.current = rest;
        };
      },
      getTarget(stepId: string): HTMLElement {
        return (
          stepMapRef.current[stepId] ||
          (parentCtx && parentCtx.getTarget(stepId))
        );
      },
      getContext(stepId: string): any {
        return (
          contextMap[stepId] || (parentCtx && parentCtx.getContext(stepId))
        );
      },
      currentStep,
      next,
      dismiss,
    };
  }, [currentStep, contextMap, parentCtx, next, dismiss]);
  return <context.Provider value={ctx}>{children}</context.Provider>;
}
