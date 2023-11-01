import React from 'react';
import { convertPropsToMjmlAttributes } from '../utils/index.ts';

export function MjmlComment({
  children,
  ...rest
}: React.PropsWithChildren<Record<string, unknown>>) {
  if (children && children.toString().trim().length) {
    return React.createElement('mj-raw', {
      ...convertPropsToMjmlAttributes(rest),
      dangerouslySetInnerHTML: {
        __html: `<!--${children}-->`,
      },
    });
  }
  return null;
}
