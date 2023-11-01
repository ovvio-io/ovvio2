import React, { Component } from 'react';

import { MjmlComment } from './mjml-comment.ts';

interface IMjmlConditionalComment {
  condition?: string;
}

export function MjmlConditionalComment({
  children,
  condition = 'if gte mso 9',
  ...rest
}: React.PropsWithChildren<IMjmlConditionalComment>) {
  if (children && children.toString().trim().length) {
    return (
      <MjmlComment {...rest}>
        {`[${condition}]>${children}<![endif]`}
      </MjmlComment>
    );
  }
  return null;
}
