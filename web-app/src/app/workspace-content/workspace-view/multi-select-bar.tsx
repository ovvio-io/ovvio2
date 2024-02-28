import React, { CSSProperties } from 'react';
import { Button } from '../../../../../styles/components/buttons.tsx';
import { H4 } from '../../../../../styles/components/typography.tsx';
import { styleguide } from '../../../../../styles/styleguide.ts';

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
        strokeWidth="2"
        strokeLinecap="round"
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
  const textStyles = {
    fontSize: '14px',
    fontStyle: 'normal',
    fontFamily: 'PoppinsBold, HeeboBold',
    lineHeight: '21px',
    letterSpacing: '0.087px',
  };

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
        dy="0.38em"
        style={textStyles}
      >
        {stepNumber}
      </text>
    </svg>
  );
};

export interface MultiSelectBarProps {
  onClose: () => void;
  selectedCards: number;
}

export const MultiSelectBar: React.FC<MultiSelectBarProps> = ({
  onClose,
  selectedCards,
}) => {
  const MultiSelectBarStyle: CSSProperties = {
    top: '0px',
    right: '0px',
    height: '73px',
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
    color: '#FFF',
  };

  const closeIcon: CSSProperties = {
    paddingRight: styleguide.gridbase * 4,
    paddingLeft: styleguide.gridbase * 2,
  };
  const labelStyle: CSSProperties = {
    paddingLeft: '8px',
  };

  return (
    <div style={MultiSelectBarStyle}>
      <Button onClick={onClose} style={closeIcon}>
        <img
          key="CloseCircleWhiteSettings"
          src="/icons/settings/Close-circle-white.svg"
          onClick={onClose}
        />
      </Button>

      <div style={wizardContainerStyle}>
        <div style={labelStyle}>{selectedCards} selected</div>
      </div>
    </div>
  );
};

export default MultiSelectBar;
