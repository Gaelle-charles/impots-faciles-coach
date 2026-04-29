/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface LayoutProps {
  preview: string
  children: React.ReactNode
}

export const Layout = ({ preview, children }: LayoutProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={outerContainer}>
        {/* Header violet avec logo € jaune */}
        <Section style={header}>
          <Section style={logoCircle}>
            <Text style={logoText}>€</Text>
          </Section>
          <Text style={brandText}>Impôts Facile</Text>
        </Section>

        {/* Carte blanche avec contenu */}
        <Container style={card}>{children}</Container>

        {/* Footer mentions légales */}
        <Section style={footerSection}>
          <Text style={footerBrand}>Impôts Facile — par ANNUL IMPOTS</Text>
          <Text style={footerSmall}>
            SARL ANNUL IMPOTS — SIREN 895 319 226
            <br />
            340 Route de la Bouaye, 97190 Le Gosier, Guadeloupe
          </Text>
          <Text style={footerSmall}>
            <Link href="mailto:contact@impotsfacile.com" style={footerLink}>
              contact@impotsfacile.com
            </Link>
          </Text>
          <Hr style={hr} />
          <Text style={footerLinks}>
            <Link href="https://impotsfacile.com/mentions-legales" style={footerLink}>
              Mentions légales
            </Link>
            {' · '}
            <Link href="https://impotsfacile.com/cgv" style={footerLink}>
              CGV
            </Link>
            {' · '}
            <Link href="https://impotsfacile.com/confidentialite" style={footerLink}>
              Confidentialité
            </Link>
          </Text>
          <Text style={disclaimer}>
            Impôts Facile est une plateforme éducative et ne se substitue pas à
            un conseil fiscal officiel.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

// ============ STYLES ============

export const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  margin: 0,
  padding: 0,
}

const outerContainer = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '0',
}

const header = {
  backgroundColor: '#2C1338',
  padding: '32px 24px',
  textAlign: 'center' as const,
  borderRadius: '12px 12px 0 0',
}

const logoCircle = {
  width: '64px',
  height: '64px',
  backgroundColor: '#F9E900',
  borderRadius: '50%',
  margin: '0 auto 12px',
  textAlign: 'center' as const,
  lineHeight: '64px',
}

const logoText = {
  color: '#2C1338',
  fontSize: '32px',
  fontWeight: 'bold' as const,
  margin: 0,
  lineHeight: '64px',
}

const brandText = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: 'bold' as const,
  margin: '8px 0 0',
  letterSpacing: '0.3px',
}

const card = {
  backgroundColor: '#ffffff',
  padding: '32px 28px',
  border: '1px solid #f0e4ee',
  borderTop: 'none',
  borderRadius: '0 0 12px 12px',
}

const footerSection = {
  padding: '24px 16px',
  textAlign: 'center' as const,
}

const footerBrand = {
  fontSize: '13px',
  fontWeight: 'bold' as const,
  color: '#2C1338',
  margin: '0 0 8px',
}

const footerSmall = {
  fontSize: '11px',
  color: '#888888',
  lineHeight: '1.5',
  margin: '0 0 8px',
}

const footerLinks = {
  fontSize: '11px',
  color: '#888888',
  margin: '0 0 12px',
}

const footerLink = {
  color: '#E15A97',
  textDecoration: 'none',
}

const hr = {
  border: 'none',
  borderTop: '1px solid #eee',
  margin: '12px 0',
}

const disclaimer = {
  fontSize: '10px',
  color: '#aaaaaa',
  fontStyle: 'italic' as const,
  margin: '8px 0 0',
}

// ============ EXPORT STYLES POUR LES TEMPLATES ============

export const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#2C1338',
  margin: '0 0 20px',
  lineHeight: '1.3',
}

export const text = {
  fontSize: '15px',
  color: '#3d2540',
  lineHeight: '1.6',
  margin: '0 0 18px',
}

export const textMuted = {
  fontSize: '13px',
  color: '#7a6680',
  lineHeight: '1.5',
  margin: '20px 0 0',
}

export const button = {
  backgroundColor: '#F9E900',
  color: '#2C1338',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '8px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
  textAlign: 'center' as const,
  letterSpacing: '0.3px',
}

export const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
}

export const link = {
  color: '#E15A97',
  textDecoration: 'underline',
}

export const accentBlock = {
  backgroundColor: '#FFE4FA',
  padding: '16px 20px',
  borderRadius: '8px',
  margin: '20px 0',
  borderLeft: '3px solid #E15A97',
}

export const codeBox = {
  backgroundColor: '#FFE4FA',
  border: '2px solid #E15A97',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center' as const,
}

export const codeText = {
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: '32px',
  fontWeight: 'bold' as const,
  color: '#2C1338',
  letterSpacing: '8px',
  margin: 0,
}
