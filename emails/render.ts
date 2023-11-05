import { renderToMjml } from '../external/mjml-react/utils/renderToMjml.ts';
import mjml2html from 'mjml';
import React from 'react';

export function renderReactToHtml(email: React.ReactElement): string {
  return mjml2html(renderToMjml(email)).html;
}
