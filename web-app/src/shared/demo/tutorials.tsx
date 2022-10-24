import config from 'core/config';
import { isFeatureActive, Features } from 'core/feature-toggle';
import { FeatureConfig } from 'core/feature-toggle/features';
import { Userpilot } from 'userpilot';

export enum UserpilotTutorial {
  OnboardDemo = '1653379289rLrx2407',
}

const TutorialState: Record<UserpilotTutorial, FeatureConfig> = {
  [UserpilotTutorial.OnboardDemo]: { status: 'active' },
};

export function isTutorialActive(id: UserpilotTutorial) {
  const featureConf = TutorialState[id];

  const query = new URLSearchParams(window.location.search);
  const forceProd =
    (query.get('forceProd') || 'false').toLowerCase() === 'true';

  switch (featureConf.status) {
    case 'active': {
      return true;
    }
    case 'beta': {
      return !(config.isProduction || forceProd);
    }
    case 'disabled':
    default: {
      return false;
    }
  }
}

export function triggerTutorial(id: UserpilotTutorial) {
  if (!isFeatureActive(Features.Userpilot) || !isTutorialActive(id)) {
    return;
  }

  Userpilot.trigger(id);
}
