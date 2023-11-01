import { renderToMjml } from '../external/mjml-react/utils/renderToMjml.ts';
import mjml2html from 'mjml';
// import mjml2html from "mjml-browser";
import { MJMLParseResults } from 'mjml-core';
import React from 'react';

export function renderReactToMjml(email: React.ReactElement): MJMLParseResults {
  return mjml2html(renderToMjml(email));
}
