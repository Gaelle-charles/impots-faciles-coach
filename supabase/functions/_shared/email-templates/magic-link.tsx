/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Button, Heading, Section, Text } from 'npm:@react-email/components@0.0.22'
import { Layout, h1, text, textMuted, button, buttonContainer } from './_layout.tsx'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <Layout preview="Connectez-vous en un clic à Impôts Facile">
    <Heading style={h1}>Connectez-vous en un clic</Heading>

    <Text style={text}>
      Voici votre lien de connexion magique. Cliquez sur le bouton ci-dessous
      pour accéder directement à votre espace Impôts Facile, sans mot de passe.
    </Text>

    <Section style={buttonContainer}>
      <Button style={button} href={confirmationUrl}>
        Me connecter
      </Button>
    </Section>

    <Text style={textMuted}>
      Ce lien expire dans 1 heure et ne peut être utilisé qu'une seule fois.
      <br />
      Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
    </Text>
  </Layout>
)

export default MagicLinkEmail
