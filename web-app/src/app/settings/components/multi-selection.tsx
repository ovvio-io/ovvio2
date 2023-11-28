import React, { CSSProperties } from 'react';
import { IconButton } from '../../../../../styles/components/buttons.tsx';
import { H4 } from '../../../../../styles/components/typography.tsx';
import IconClose from '../../../../../styles/components/icons/IconClose.tsx';

interface IconVectorProps {
  color: 'done' | 'notDone';
}

export const IconVector: React.FC<IconVectorProps> = ({ color }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="58"
      height="2"
      viewBox="0 0 58 2"
      fill="none"
    >
      <path
        d="M1 1H57"
        stroke={color === 'done' ? '#FFF' : '#ABD4EE'}
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
  );
};

interface IconEllipseProps {
  color: 'done' | 'notDone';
  stepNumber: number;
}
export const IconEllipse: React.FC<IconEllipseProps> = ({
  color,
  stepNumber,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="11"
        stroke={color === 'done' ? '#FFF' : '#ABD4EE'}
        strokeWidth="2"
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        stroke={color === 'done' ? '#FFF' : '#ABD4EE'}
        fill={color === 'done' ? '#FFF' : '#ABD4EE'}
        strokeWidth="0.5px"
        dy=".3em"
      >
        {stepNumber}
      </text>
    </svg>
  );
};

export interface MultiSelectionProps {
  onClose: () => void;
  currentStep: 'Members' | 'Workspaces' | 'Assign';
  currentStepIndex: number;
}

export const MultiSelection: React.FC<MultiSelectionProps> = ({
  onClose,
  currentStep,
  currentStepIndex,
}) => {
  const multiselectionStyle: CSSProperties = {
    top: '0px',
    right: '7px',
    height: '64px',
    position: 'absolute',
    width: '100%',
    backgroundColor: '#3184dd',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
  };

  const wizardContainerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    margin: '8px',
    position: 'relative',
    left: '150px',
  };

  const ellipseContainerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: '4px',
    gap: '4px',
  };
  const stepContainerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
  };

  const labelStyle: CSSProperties = {
    position: 'relative',
    marginTop: '4px',
    fontSize: '10px',
    letterSpacing: '-0.1px',
    fontWeight: '400',
    left: '-8px',
  };

  const steps = ['Members', 'Workspaces', 'Assign'];

  return (
    <div style={multiselectionStyle}>
      <IconButton onClick={onClose}>
        <IconClose />
      </IconButton>
      <H4>Assign to workspaces</H4>

      <div style={wizardContainerStyle}>
        {steps.map((step, index) => {
          const isLabelActive = currentStepIndex >= index + 1;
          const dynamicLabelStyle = {
            ...labelStyle,
            color: isLabelActive ? '#FFF' : '#ABD4EE',
          };

          return (
            <React.Fragment key={step}>
              <div style={stepContainerStyle}>
                <div style={ellipseContainerStyle}>
                  <IconEllipse
                    color={currentStepIndex >= index + 1 ? 'done' : 'notDone'}
                    stepNumber={index + 1}
                  />
                  {index < steps.length - 1 && (
                    <IconVector
                      color={currentStepIndex > index + 1 ? 'done' : 'notDone'}
                    />
                  )}
                </div>
                <div style={dynamicLabelStyle}>{step}</div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default MultiSelection;
