import React from 'react';
import { layout } from '@ovvio/styles/lib';
import { cn } from '@ovvio/styles/lib/css-objects';
import Illustration from './illustration';
import { isElectron } from 'electronUtils';

const IS_ELECTRON = isElectron();

export default function VersionMismatchView() {
  return (
    <div className={cn(layout.column, layout.centerCenter, layout.flex)}>
      <Illustration isApp={IS_ELECTRON} />
    </div>
  );
}
