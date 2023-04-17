import React from 'react';
import { Features, getFeatureConfig } from './features.tsx';

export { Features };

export interface FeatureProps {
  id: Features;
  nonActiveComponent?: React.ComponentType<{}>;
  children: React.ReactNode;
}

function NoopComponent() {
  return null;
}

export function isFeatureActive(featureId: Features) {
  const featureConf = getFeatureConfig(featureId);

  const query = new URLSearchParams(window.location.search);
  const forceProd =
    (query.get('forceProd') || 'false').toLowerCase() === 'true';

  switch (featureConf.status) {
    // case 'active': {
    //   return true;
    // }
    // case 'beta': {
    //   return !(config.isProduction || forceProd);
    // }
    case 'disabled':
    default: {
      return false;
    }
  }
}

export function useIsFeatureActive(featureId: Features) {
  return isFeatureActive(featureId);
}

export const Feature: React.FC<FeatureProps> = ({
  id,
  children,
  nonActiveComponent,
}) => {
  const isFeatureActive = useIsFeatureActive(id);
  const FallbackComponent = nonActiveComponent || NoopComponent;
  const content = isFeatureActive ? children : <FallbackComponent />;

  return <React.Fragment>{content}</React.Fragment>;
};
