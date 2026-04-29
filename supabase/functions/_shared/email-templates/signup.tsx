/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Button, Heading, Section, Text } from 'npm:@react-email/components@0.0.22'
import {
  Layout,
  h1,
  text,
  textMuted,
  button,
  buttonContainer,
  accentBlock,
} from './_layout.tsx'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ recipient, confirmationUrl }: SignupEmailProps) => (
  <Layout preview="Confirmez votre email pour commencer votre parcours fiscal">
    <Heading style={h1}>Bienvenue sur Impôts Facile&nbsp;!</Heading>

    <Text style={text}>
      Merci de vous être inscrit·e. Vous êtes à un clic de mieux comprendre vos
      impôts personnels et de découvrir vos premières optimisations fiscales.
    </Text>

    <Text style={text}>
      Pour activer votre compte ({recipient}), confirmez votre adresse email :
    </Text>

    <Section style={buttonContainer}>
      <Button style={button} href={confirmationUrl}>
        Confirmer mon email
      </Button>
    </Section>

    <Section style={accentBlock}>
      <Text style={{ ...text, margin: 0, fontSize: '14px' }}>
        🎯 <strong>Prochaine étape :</strong> répondez au quiz de profilage pour
        recevoir vos recommandations fiscales personnalisées.
      </Text>
    </Section>

    <Text style={textMuted}>
      Si vous n'avez pas créé de compte sur Impôts Facile, vous pouvez ignorer
      cet email en toute sécurité.
    </Text>
  </Layout>
)

export default SignupEmail
