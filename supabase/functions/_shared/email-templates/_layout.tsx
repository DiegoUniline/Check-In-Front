/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

// HospedApp brand palette
export const brand = {
  navy: '#04122C',
  navySoft: '#0A1F45',
  turquoise: '#0B9F91',
  turquoiseDark: '#088577',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E4E9F2',
  text: '#0F172A',
  muted: '#64748B',
  softMuted: '#94A3B8',
}

export interface LayoutProps {
  preview: string
  hotelName?: string
  children: React.ReactNode
}

export const EmailLayout = ({ preview, hotelName, children }: LayoutProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={outer}>
        {/* Header */}
        <Section style={header}>
          <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
            <tr>
              <td style={{ verticalAlign: 'middle' }}>
                <Text style={brandLogo}>
                  <span style={{ color: brand.turquoise }}>H</span>
                  <span style={{ color: '#FFFFFF' }}>ospedApp</span>
                </Text>
              </td>
              {hotelName ? (
                <td style={{ verticalAlign: 'middle', textAlign: 'right' as const }}>
                  <Text style={hotelBadge}>{hotelName}</Text>
                </td>
              ) : null}
            </tr>
          </table>
        </Section>

        {/* Card */}
        <Section style={card}>{children}</Section>

        {/* Footer */}
        <Section style={footerWrap}>
          <Text style={footerBrand}>HospedApp — Software de gestión hotelera</Text>
          <Text style={footerText}>
            {hotelName ? `Este correo fue enviado por ${hotelName} a través de HospedApp.` : 'Este correo fue enviado por HospedApp.'}
          </Text>
          <Text style={footerText}>
            <Link href="https://hospedapp.com" style={footerLink}>hospedapp.com</Link>
            {'  ·  '}
            <Link href="https://hospedapp.com/soporte" style={footerLink}>Soporte</Link>
            {'  ·  '}
            <Link href="https://hospedapp.com/privacidad" style={footerLink}>Privacidad</Link>
          </Text>
          <Text style={footerSmall}>© {new Date().getFullYear()} HospedApp. Todos los derechos reservados.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const CTA = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Section style={{ textAlign: 'center' as const, margin: '28px 0 8px' }}>
    <Button href={href} style={ctaBtn}>{children}</Button>
  </Section>
)

export const FallbackLink = ({ href }: { href: string }) => (
  <>
    <Hr style={hr} />
    <Text style={muted}>
      Si el botón no funciona, copia y pega este enlace en tu navegador:
    </Text>
    <Text style={linkFallback}>
      <Link href={href} style={{ color: brand.turquoise }}>{href}</Link>
    </Text>
  </>
)

// Styles
const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: 0,
  padding: '24px 12px',
}
const outer = { maxWidth: '600px', margin: '0 auto', padding: 0 }

const header = {
  background: brand.navy,
  padding: '22px 28px',
  borderRadius: '14px 14px 0 0',
}
const brandLogo = {
  fontFamily: "'Sora', 'Inter', Arial, sans-serif",
  fontSize: '22px',
  fontWeight: 700 as const,
  letterSpacing: '-0.02em',
  margin: 0,
  color: '#FFFFFF',
}
const hotelBadge = {
  display: 'inline-block',
  background: 'rgba(11,159,145,0.18)',
  color: '#7FE9DD',
  border: `1px solid ${brand.turquoise}`,
  padding: '6px 12px',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: 600 as const,
  margin: 0,
  letterSpacing: '0.02em',
}

const card = {
  background: brand.card,
  border: `1px solid ${brand.border}`,
  borderTop: 'none',
  padding: '36px 32px 32px',
}

export const h1: React.CSSProperties = {
  fontFamily: "'Sora', 'Inter', Arial, sans-serif",
  fontSize: '24px',
  lineHeight: '1.25',
  fontWeight: 700,
  color: brand.navy,
  margin: '0 0 14px',
  letterSpacing: '-0.01em',
}
export const p: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '1.65',
  color: brand.text,
  margin: '0 0 14px',
}
export const muted: React.CSSProperties = {
  fontSize: '13px',
  lineHeight: '1.6',
  color: brand.muted,
  margin: '0 0 8px',
}
const ctaBtn: React.CSSProperties = {
  background: brand.turquoise,
  color: '#FFFFFF',
  fontSize: '15px',
  fontWeight: 600,
  borderRadius: '10px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
  boxShadow: '0 6px 16px rgba(11,159,145,0.28)',
}
const hr: React.CSSProperties = {
  border: 'none',
  borderTop: `1px solid ${brand.border}`,
  margin: '28px 0 18px',
}
const linkFallback: React.CSSProperties = {
  fontSize: '12px',
  wordBreak: 'break-all' as const,
  color: brand.turquoise,
  margin: 0,
}

const footerWrap = {
  background: brand.bg,
  padding: '24px 28px',
  borderRadius: '0 0 14px 14px',
  borderTop: `1px solid ${brand.border}`,
  textAlign: 'center' as const,
}
const footerBrand: React.CSSProperties = {
  fontFamily: "'Sora', 'Inter', Arial, sans-serif",
  fontSize: '13px',
  fontWeight: 600,
  color: brand.navy,
  margin: '0 0 6px',
}
const footerText: React.CSSProperties = {
  fontSize: '12px',
  color: brand.muted,
  margin: '0 0 6px',
  lineHeight: '1.5',
}
const footerLink: React.CSSProperties = {
  color: brand.turquoise,
  textDecoration: 'none',
  fontWeight: 500,
}
const footerSmall: React.CSSProperties = {
  fontSize: '11px',
  color: brand.softMuted,
  margin: '10px 0 0',
}

export const Highlight = ({ children }: { children: React.ReactNode }) => (
  <Section
    style={{
      background: '#F0FBF9',
      border: `1px solid #B8ECE4`,
      borderRadius: '10px',
      padding: '14px 16px',
      margin: '18px 0',
    }}
  >
    <Text style={{ ...p, margin: 0, fontSize: '14px', color: brand.navy }}>{children}</Text>
  </Section>
)

export default EmailLayout