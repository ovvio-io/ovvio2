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
  MjmlFont,
} from '../external/mjml-react/index.tsx';
import { renderReactToHtml } from './render.ts';
import { styleguide } from '../styles/styleguide.ts';
import { brandLightTheme as theme } from '../styles/theme.tsx';
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
        <MjmlFont
          name="Poppins"
          href="https://fonts.googleapis.com/css?family=Poppins"
        ></MjmlFont>
      </MjmlHead>
      {/* <MjmlBody width={500}> */}
      <MjmlBody>
        <MjmlSection fullWidth backgroundColor="white" textAlign="center">
          <MjmlColumn>
            <MjmlImage
              src={`${baseUrl}/logo.png`}
              width={121}
              height={28}
              title={'Ovvio Logo'}
              align="center"
            />
          </MjmlColumn>
        </MjmlSection>
        <MjmlSection fullWidth backgroundColor="white" textAlign="center">
          <MjmlColumn>
            <MjmlText
              fontSize={18}
              fontFamily="Poppins"
              fontWeight="600"
              align="center"
            >
              Hi {username}! You're almost there!
            </MjmlText>
            <MjmlText
              fontSize={13}
              fontFamily="Poppins"
              fontWeight="400"
              align="center"
            >
              Confirm your email address and you’ll join {orgname} team at Ovvio
              in no time
            </MjmlText>
          </MjmlColumn>
        </MjmlSection>
        <MjmlSection>
          <MjmlButton
            width={324}
            height={32}
            borderRadius={37}
            backgroundColor={theme.primary.p9}
            color="white"
            href={clickURL}
            align="center"
          >
            Confirm and Continue
          </MjmlButton>
        </MjmlSection>
      </MjmlBody>
    </Mjml>
  );
}
