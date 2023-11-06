import React from 'react';
import {
  DetailsTabContent,
  GeneralTabContent,
} from '../personal-information.tsx';
import { TabId } from '../../../../../cfds/base/scheme-types.ts';

interface TabPlugin {
  title: TabId;
  render: () => JSX.Element;
}

export const tabPlugins: TabPlugin[] = [
  {
    title: 'general',
    render: () => <GeneralTabContent />,
  },
  {
    title: 'details',
    render: () => <DetailsTabContent />,
  },
];

export default TabPlugin;
