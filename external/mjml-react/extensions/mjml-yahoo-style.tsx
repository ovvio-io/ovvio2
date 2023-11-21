import React, { Component } from 'react';

import { MjmlRaw } from '../index.tsx';

export function MjmlYahooStyle({
  children,
  ...rest
}: React.PropsWithChildren<Record<string, unknown>>) {
  if (children && children.toString().trim().length) {
    return (
      <MjmlRaw {...rest}>
        <style>{`@media screen yahoo {${children}}`}</style>
      </MjmlRaw>
    );
  }
  return null;
}
