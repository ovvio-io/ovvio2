import { layout, styleguide } from '@ovvio/styles/lib';
import { Bold, H3 } from '@ovvio/styles/lib/components/texts';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { Breakpoints } from '@ovvio/styles/lib/responsive';
import config from 'core/config';
import { Features, useIsFeatureActive } from 'core/feature-toggle';
import React, { useEffect, useState } from 'react';

const useStyles = makeStyles(theme => ({
  blockRoot: {
    backgroundColor: '#e8ecfc',
    padding: [styleguide.gridbase],
    textAlign: 'center',
    basedOn: [layout.column, layout.centerCenter, layout.flex],
  },
}));

function isOnMobile() {
  if (config.isDev) {
    return false;
  }
  if (window.innerWidth <= Breakpoints.Medium || window.innerHeight <= 400) {
    return true;
  }
  if (
    navigator.userAgent.match(/Android/i) ||
    navigator.userAgent.match(/webOS/i) ||
    navigator.userAgent.match(/iPhone/i) ||
    navigator.userAgent.match(/iPad/i) ||
    navigator.userAgent.match(/iPod/i) ||
    navigator.userAgent.match(/BlackBerry/i) ||
    navigator.userAgent.match(/Windows Phone/i)
  ) {
    return true;
  }
  return false;
}

function MobileBlockView() {
  const styles = useStyles();
  return (
    <div className={cn(styles.blockRoot)}>
      <H3>Hey there</H3>
      <Bold>
        We currently do not support mobile devices, please visit this site from
        a computer
      </Bold>
    </div>
  );
}

interface MobileBlockerProps {
  children: any;
}
function MobileBlockerImpl({ children }: MobileBlockerProps) {
  const [isBlocking, setIsBlocking] = useState(() => isOnMobile());

  useEffect(() => {
    const handler = () => {
      setIsBlocking(isOnMobile());
    };
    window.addEventListener('resize', handler);

    return () => window.removeEventListener('resize', handler);
  }, [isBlocking]);

  if (isBlocking) {
    return <MobileBlockView />;
  }

  return <React.Fragment>{children}</React.Fragment>;
}

export const MobileBlocker: React.FC = ({ children }) => {
  const isMobileSupported = useIsFeatureActive(Features.Mobile);

  if (!isMobileSupported) {
    return <MobileBlockerImpl>{children}</MobileBlockerImpl>;
  }
  return <React.Fragment>{children}</React.Fragment>;
};
