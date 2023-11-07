import React from 'react';
import {
  Mjml,
  MjmlHead,
  MjmlTitle,
  MjmlPreview,
  MjmlBody,
  MjmlSection,
  MjmlColumn,
  MjmlButton,
  MjmlImage,
  MjmlText,
} from '../external/mjml-react/index.tsx';
import { renderReactToHtml } from './render.ts';
import { styleguide } from '../styles/styleguide.ts';
import { lightTheme as theme } from '../styles/theme.tsx';
import { getBaseURL } from '../net/server/utils.ts';

export interface ResetPasswordEmailProps {
  clickURL: string;
  username: string;
  orgname: string;
  baseUrl: string;
}

export function ResetPasswordEmail({
  clickURL,
  username,
  orgname,
  baseUrl,
}: ResetPasswordEmailProps) {
  console.log('logo url = ' + `${baseUrl}/assets/logo.png`);
  return renderReactToHtml(
    <Mjml>
      <MjmlHead>
        <MjmlTitle>Log In to your Ovvio Account</MjmlTitle>
        <MjmlPreview>Click to login...</MjmlPreview>
      </MjmlHead>
      {/* <MjmlBody width={500}> */}
      <MjmlBody>
        <MjmlSection fullWidth backgroundColor="white" textAlign="center">
          <MjmlColumn>
            <MjmlImage src={`${baseUrl}/logo.png`} />
          </MjmlColumn>
        </MjmlSection>
        <MjmlSection fullWidth backgroundColor="white" textAlign="center">
          <MjmlColumn>
            <MjmlText>Hi {username}! You're almost there!</MjmlText>
            <MjmlText>
              Confirm your email address and you’ll join {orgname} team at Ovvio
              in no time
            </MjmlText>
          </MjmlColumn>
        </MjmlSection>
      </MjmlBody>
    </Mjml>
  );
}
