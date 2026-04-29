/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Heading, Section, Text } from 'npm:@react-email/components@0.0.22'
import { Layout, h1, text, textMuted, codeBox, codeText } from './_layout.tsx'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Layout preview="Votre code de vérification Impôts Facile">
    <Heading style={h1}>Confirmez votre identité</Heading>

    <Text style={text}>
      Pour finaliser cette action sensible sur votre compte Impôts Facile,
      saisissez le code ci-dessous :
    </Text>

    <Section style={codeBox}>
      <Text style={codeText}>{token}</Text>
    </Section>

    <Text style={textMuted}>
      Ce code expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette
      demande, ignorez cet email et envisagez de changer votre mot de passe.
    </Text>
  </Layout>
)

export default ReauthenticationEmail
