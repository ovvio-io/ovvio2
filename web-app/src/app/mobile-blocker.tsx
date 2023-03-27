import React, { useEffect, useState } from 'https://esm.sh/react@18.2.0';
import { layout, styleguide } from '../../../styles/index.ts';
import { Bold, H3 } from '../../../styles/components/texts.tsx';
import { cn, makeStyles } from '../../../styles/css-objects/index.ts';
import { Breakpoints } from '../../../styles/responsive.ts';
import { Features, useIsFeatureActive } from '../core/feature-toggle/index.tsx';

const useStyles = makeStyles((theme) => ({
  blockRoot: {
    backgroundColor: '#e8ecfc',
    padding: [styleguide.gridbase],
    textAlign: 'center',
    basedOn: [layout.column, layout.centerCenter, layout.flex],
  },
}));

function isOnMobile() {
  // if (config.isDev) {
  //   return false;
  // }
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
  children?: React.ReactNode;
}
function MobileBlockerImpl({ children }: MobileBlockerProps) {
  const [isBlocking, setIsBlocking] = useState(() => isOnMobile());

  useEffect(() => {
    const handler = () => {
      setIsBlocking(isOnMobile());
    };
    addEventListener('resize', handler);

    return () => removeEventListener('resize', handler);
  }, [isBlocking]);

  if (isBlocking) {
    return <MobileBlockView />;
  }

  return <React.Fragment>{children}</React.Fragment>;
}

export function MobileBlocker({ children }: MobileBlockerProps = {}) {
  const isMobileSupported = useIsFeatureActive(Features.Mobile);

  if (!isMobileSupported) {
    return <MobileBlockerImpl>{children}</MobileBlockerImpl>;
  }
  return <React.Fragment>{children}</React.Fragment>;
}
