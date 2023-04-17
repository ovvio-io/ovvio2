import React from 'react';
import { IconProps, IconSize } from './types.ts';

const STYLE: any = {
  mixBlendMode: 'overlay',
};

export function IconNewTask({ size = IconSize.Small, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="1.5"
        y="1.5"
        width="14.9375"
        height="14.9375"
        rx="1.5"
        fill="#FBF6EF"
        stroke="#3184DD"
      />
      <g filter="url(#filter0_bd_1176_23785)">
        <rect
          x="1.06274"
          y="1.0625"
          width="15.9356"
          height="15.9375"
          rx="2"
          fill="url(#paint0_radial_1176_23785)"
          fillOpacity="0.3"
          shapeRendering="crispEdges"
        />
        <rect
          x="1.56274"
          y="1.5625"
          width="14.9356"
          height="14.9375"
          rx="1.5"
          stroke="#CCCCCC"
          strokeOpacity="0.3"
          style={STYLE}
          shapeRendering="crispEdges"
        />
      </g>
      <path
        opacity="0.6"
        d="M9 12L9 6"
        stroke="#3184DD"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M6 9L12 9"
        stroke="#1960CF"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <defs>
        <filter
          id="filter0_bd_1176_23785"
          x="0.0627441"
          y="0.0625"
          width="17.9355"
          height="17.9375"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feGaussianBlur in="BackgroundImage" stdDeviation="0.5" />
          <feComposite
            in2="SourceAlpha"
            operator="in"
            result="effect1_backgroundBlur_1176_23785"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="0.5" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"
          />
          <feBlend
            mode="normal"
            in2="effect1_backgroundBlur_1176_23785"
            result="effect2_dropShadow_1176_23785"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect2_dropShadow_1176_23785"
            result="shape"
          />
        </filter>
        <radialGradient
          id="paint0_radial_1176_23785"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(2.28856 2.28846) rotate(45.0034) scale(20.804)"
        >
          <stop stopColor="white" />
          <stop offset="1" stopColor="#E5E5E5" />
        </radialGradient>
      </defs>
    </svg>
  );
}
