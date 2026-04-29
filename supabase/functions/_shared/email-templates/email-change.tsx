/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Button, Heading, Link, Section, Text } from 'npm:@react-email/components@0.0.22'
import {
  Layout,
  h1,
  text,
  textMuted,
  button,
  buttonContainer,
  link,
  accentBlock,
} from './_layout.tsx'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Layout preview="Confirmez votre nouvelle adresse email Impôts Facile">
    <Heading style={h1}>Confirmez votre nouvelle adresse email</Heading>

    <Text style={text}>
      Vous avez demandé à changer l'adresse email associée à votre compte Impôts
      Facile.
    </Text>

    <Section style={accentBlock}>
      <Text style={{ ...text, margin: '0 0 6px', fontSize: '13px' }}>
        <strong>Adresse actuelle :</strong>{' '}
        <Link href={`mailto:${email}`} style={link}>
          {email}
        </Link>
      </Text>
      <Text style={{ ...text, margin: 0, fontSize: '13px' }}>
        <strong>Nouvelle adresse :</strong>{' '}
        <Link href={`mailto:${newEmail}`} style={link}>
          {newEmail}
        </Link>
      </Text>
    </Section>

    <Text style={text}>
      Cliquez sur le bouton ci-dessous pour confirmer ce changement :
    </Text>

    <Section style={buttonContainer}>
      <Button style={button} href={confirmationUrl}>
        Confirmer le changement
      </Button>
    </Section>

    <Text style={textMuted}>
      ⚠️ Si vous n'êtes pas à l'origine de cette demande, sécurisez votre
      compte immédiatement en changeant votre mot de passe.
    </Text>
  </Layout>
)

export default EmailChangeEmail
