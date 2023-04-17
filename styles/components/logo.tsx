import React from 'react';
import { styleguide } from '../styleguide.ts';
import { cn, makeStyles } from '../css-objects/index.ts';
import { MediaQueries } from '../responsive.ts';
import { layout } from '../layout.ts';

const useStyles = makeStyles(
  (theme) => ({
    logoRoot: {
      alignItems: 'center',
      basedOn: [layout.row],
    },
    logo: {
      height: styleguide.gridbase * 4,
      [MediaQueries.TabletAndMobile]: {
        height: styleguide.gridbase * 2.5,
      },
      overflowY: 'hidden',
    },
    icon: {},
    ovvioText: {
      transform: 'translate(-26px, 0)',
      opacity: 1,
      ...styleguide.transition.standard,
      transitionProperty: 'transform, opacity',
    },
    textHidden: {
      opacity: 0,
      transform: 'translate(-14px, 100%)',
    },
  }),
  'logo_d20958'
);
export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  const styles = useStyles();
  return (
    <div className={cn(className, styles.logoRoot)}>
      <LogoIcon />
      <LogoText className={cn(!showText && styles.textHidden)} />
    </div>
  );
}

export function LogoIcon({ className }: { className?: string }) {
  const styles = useStyles();
  return (
    <svg
      role="img"
      className={cn(styles.logo, className)}
      width="26"
      height="28"
      viewBox="0 0 26 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Ovvio Icon</title>
      <g className={cn(styles.icon)}>
        <path
          d="M14.297 6.97553C17.1308 7.01353 19.8112 7.48984 22.3349 8.40444L25.6283 1.74024C25.9096 1.16933 26.0215 0.574959 25.9967 0C23.8925 0.540996 21.877 1.36583 19.9503 2.47855C17.8037 3.71985 15.9257 5.22477 14.297 6.97553Z"
          fill="#67B4F0"
        />
        <path
          d="M8.69006 14.5074C8.91702 14.6392 9.13199 14.7832 9.35256 14.9231C9.82087 13.6793 10.3963 12.4704 11.0803 11.3003C12.0066 9.71447 13.0846 8.27909 14.2962 6.97553C14.1723 6.97391 14.0492 6.97068 13.9254 6.97068H13.7248C9.3158 6.97068 5.24089 8.05267 1.50082 10.215C0.985364 10.5134 0.486688 10.8296 0 11.1579L0.186204 11.5356C3.21582 11.9787 6.05124 12.9677 8.69006 14.5074Z"
          fill="#67B4F0"
        />
        <path
          d="M11.0812 11.2994C10.3979 12.4696 9.8217 13.6785 9.35339 14.9223C11.9962 16.5744 14.2283 18.6413 16.0496 21.1231L22.3333 8.40444C19.8096 7.48984 17.1292 7.01353 14.2954 6.97553C13.0855 8.27828 12.0074 9.71366 11.0812 11.2994Z"
          fill="#2B81DF"
        />
        <path
          d="M9.35337 14.9223C9.132 14.784 8.91783 14.64 8.69087 14.5066C6.05204 12.9661 3.21503 11.9779 0.187012 11.5348L7.35627 26.0446C7.54168 26.4198 7.78062 26.7352 8.04994 27.0021C7.9013 25.8821 7.82298 24.7386 7.82298 23.5677C7.82538 20.5109 8.33444 17.6297 9.35337 14.9223Z"
          fill="#2B81DF"
        />
        <path
          d="M9.35338 14.9223C8.33445 17.6305 7.82458 20.5109 7.82458 23.5685C7.82458 24.7386 7.9013 25.8829 8.05155 27.0029C9.66025 28.5968 12.5141 28.2814 13.6185 26.0454L16.0511 21.1239C14.2282 18.6405 11.9962 16.5744 9.35338 14.9223Z"
          fill="#105CD1"
        />
      </g>
    </svg>
  );
}

export function LogoText({ className }: { className?: string }) {
  const styles = useStyles();
  return (
    <svg
      role="img"
      className={cn(styles.logo, className)}
      width="120"
      height="28"
      viewBox="0 0 120 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Ovvio Logo</title>
      <g className={cn(styles.ovvioText)}>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M38.2802 28C43.5175 28 47.5596 24.1234 47.5596 18.6958C47.5596 13.2681 43.5175 9.42605 38.2802 9.42605C33.0773 9.42605 29 13.2681 29 18.6958C29 24.1234 33.0781 28 38.2802 28ZM38.2802 14.3607C40.3188 14.3607 42.2168 15.7355 42.2168 18.6958C42.2168 21.6561 40.3188 23.0661 38.2802 23.0661C36.2767 23.0661 34.3436 21.6208 34.3436 18.6958C34.3436 15.7355 36.2767 14.3607 38.2802 14.3607Z"
          fill="#262626"
        />
        <path
          d="M79.1872 27.4717V27.4717C77.5835 27.4717 76.1381 26.5002 75.5289 25.0124L69.365 9.95511H75.1643L79.2064 20.8457L82.9327 9.95511H88.557L82.8824 24.9162C82.2995 26.4545 80.8285 27.4717 79.1872 27.4717Z"
          fill="#262626"
        />
        <path
          d="M58.2245 27.4717V27.4717C56.6207 27.4717 55.1753 26.5002 54.5661 25.0124L48.4022 9.95511H54.2015L58.2436 20.8457L61.97 9.95511H67.5942L61.9196 24.9162C61.3368 26.4545 59.8666 27.4717 58.2245 27.4717Z"
          fill="#262626"
        />
        <path
          d="M92.2081 27.4717V9.95511H97.551V27.4717H92.2081Z"
          fill="#262626"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M110.721 28C115.958 28 120 24.1234 120 18.6958C120 13.2681 115.958 9.42605 110.721 9.42605C105.518 9.42605 101.44 13.2681 101.44 18.6958C101.44 24.1234 105.519 28 110.721 28ZM110.721 14.3607C112.759 14.3607 114.657 15.7355 114.657 18.6958C114.657 21.6561 112.759 23.0661 110.721 23.0661C108.717 23.0661 106.784 21.6208 106.784 18.6958C106.784 15.7355 108.717 14.3607 110.721 14.3607Z"
          fill="#262626"
        />
        <ellipse
          cx="94.88"
          cy="3.37395"
          rx="3.36495"
          ry="3.37395"
          fill="#262626"
        />
      </g>
    </svg>
  );
}
