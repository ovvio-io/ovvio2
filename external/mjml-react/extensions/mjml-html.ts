import React, { Component } from 'react';

interface IMjmlHtml {
  tag?: string;
  html: string;
}

export function MjmlHtml({ tag = 'mj-raw', html }: IMjmlHtml) {
  return React.createElement(tag, {
    dangerouslySetInnerHTML: {
      __html: html,
    },
  });
}
