import React from 'react';
import { cn } from '../../../../styles/css-objects/index.ts';
import { layout } from '../../../../styles/layout.ts';
import Illustration from './illustration.tsx';

export default function VersionMismatchView() {
  return (
    <div className={cn(layout.column, layout.centerCenter, layout.flex)}>
      <Illustration isApp={false} />
    </div>
  );
}
