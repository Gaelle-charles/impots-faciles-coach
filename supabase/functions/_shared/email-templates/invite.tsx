/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Button, Heading, Section, Text } from 'npm:@react-email/components@0.0.22'
import { Layout, h1, text, textMuted, button, buttonContainer } from './_layout.tsx'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <Layout preview="Vous êtes invité·e à rejoindre Impôts Facile">
    <Heading style={h1}>Vous êtes invité·e&nbsp;!</Heading>

    <Text style={text}>
      Vous avez été invité·e à rejoindre <strong>Impôts Facile</strong>, la
      plateforme éducative pour comprendre et optimiser vos impôts personnels.
    </Text>

    <Text style={text}>
      Cliquez sur le bouton ci-dessous pour accepter l'invitation et créer votre
      compte :
    </Text>

    <Section style={buttonContainer}>
      <Button style={button} href={confirmationUrl}>
        Accepter l'invitation
      </Button>
    </Section>

    <Text style={textMuted}>
      Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email
      en toute sécurité.
    </Text>
  </Layout>
)

export default InviteEmail
