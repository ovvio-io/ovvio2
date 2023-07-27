export enum Features {
  BoardView = 'BoardView',
  ExportDemoData = 'ExportDemoData',
  Userpilot = 'Userpilot',
  Mobile = 'Mobile',
}

export type FeatureConfig = {
  status: 'disabled' | 'beta' | 'active';
};

const featureStatus: Record<Features, FeatureConfig> = {
  [Features.BoardView]: { status: 'active' },
  [Features.ExportDemoData]: { status: 'beta' },
  [Features.Userpilot]: { status: 'active' },
  [Features.Mobile]: { status: 'beta' },
};

export function getFeatureConfig(feature: Features) {
  return featureStatus[feature];
}
