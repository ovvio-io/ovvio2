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
} from '../external/mjml-react/index.tsx';
import { renderReactToHtml } from './render.ts';
import { styleguide } from '../styles/styleguide.ts';
import { lightTheme as theme } from '../styles/theme.tsx';

export interface ResetPasswordEmailProps {
  clickURL: string;
}

export function ResetPasswordEmail({ clickURL }: ResetPasswordEmailProps) {
  return renderReactToHtml(
    <Mjml>
      <MjmlHead>
        <MjmlTitle>Log In to your Ovvio Account</MjmlTitle>
        <MjmlPreview>Click to login...</MjmlPreview>
      </MjmlHead>
      {/* <MjmlBody width={500}> */}
      <MjmlBody>
        <MjmlSection fullWidth backgroundColor="white">
          <MjmlColumn>
            <MjmlImage src="https://static.wixstatic.com/media/5cb24728abef45dabebe7edc1d97ddd2.jpg" />
          </MjmlColumn>
        </MjmlSection>
        <MjmlSection>
          <MjmlColumn>
            <MjmlButton
              padding="20px"
              backgroundColor="#346DB7"
              href="https://www.wix.com/"
            >
              I like it!
            </MjmlButton>
          </MjmlColumn>
        </MjmlSection>
      </MjmlBody>
    </Mjml>
  );
}
