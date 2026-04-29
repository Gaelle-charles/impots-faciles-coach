/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Button, Heading, Section, Text } from 'npm:@react-email/components@0.0.22'
import { Layout, h1, text, textMuted, button, buttonContainer } from './_layout.tsx'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <Layout preview="Réinitialisez votre mot de passe Impôts Facile">
    <Heading style={h1}>Réinitialisez votre mot de passe</Heading>

    <Text style={text}>
      Vous avez demandé à réinitialiser le mot de passe de votre compte Impôts
      Facile. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
    </Text>

    <Section style={buttonContainer}>
      <Button style={button} href={confirmationUrl}>
        Choisir un nouveau mot de passe
      </Button>
    </Section>

    <Text style={textMuted}>
      Ce lien expire dans 1 heure pour votre sécurité.
      <br />
      Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre
      mot de passe actuel reste inchangé.
    </Text>
  </Layout>
)

export default RecoveryEmail
