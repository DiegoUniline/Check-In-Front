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
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

export const LOGO_URL =
  'https://vulo.mx/__l5e/assets-v1/21b5e767-24fc-469b-a90a-6c43f288322d/vulo-fox.png'

// VULO brand palette
export const brand = {
  navy: '#10233F',
  navySoft: '#1B335A',
  // Kept `turquoise` key for back-compat with existing templates; it is now the orange accent.
  turquoise: '#F97316',
  turquoiseDark: '#EA580C',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E5EAF2',
  text: '#111827',
  muted: '#475569',
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
                <table cellPadding={0} cellSpacing={0} role="presentation">
                  <tr>
                    <td style={{ verticalAlign: 'middle', paddingRight: '12px' }}>
                      <Img
                        src={LOGO_URL}
                        width="40"
                        height="40"
                        alt="VULO"
                        style={{ display: 'block', borderRadius: '8px' }}
                      />
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <Text style={brandLogo}>
                        <span style={{ color: '#FFFFFF' }}>VULO</span>
                      </Text>
                    </td>
                  </tr>
                </table>
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
          <Text style={footerBrand}>VULO — Software para hoteles</Text>
          <Text style={footerText}>
            {hotelName ? `Este correo fue enviado por ${hotelName} a través de VULO.` : 'Este correo fue enviado por VULO.'}
          </Text>
          <Text style={footerText}>
            <Link href="https://vulo.mx" style={footerLink}>vulo.mx</Link>
            {'  ·  '}
            <Link href="https://vulo.mx/contacto" style={footerLink}>Soporte</Link>
            {'  ·  '}
            <Link href="https://vulo.mx/privacidad" style={footerLink}>Privacidad</Link>
          </Text>
          <Text style={footerSmall}>© {new Date().getFullYear()} VULO · Autlán de Navarro, Jalisco</Text>
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
  fontFamily: "'Inter', Arial, sans-serif",
  fontSize: '22px',
  fontWeight: 700 as const,
  letterSpacing: '-0.02em',
  margin: 0,
  color: '#FFFFFF',
}
const hotelBadge = {
  display: 'inline-block',
  background: 'rgba(249,115,22,0.18)',
  color: '#FDBA74',
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
  fontFamily: "'Inter', Arial, sans-serif",
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
  boxShadow: '0 6px 16px rgba(249,115,22,0.32)',
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
  fontFamily: "'Inter', Arial, sans-serif",
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
      background: '#FFF4EC',
      border: `1px solid #FED7AA`,
      borderRadius: '10px',
      padding: '14px 16px',
      margin: '18px 0',
    }}
  >
    <Text style={{ ...p, margin: 0, fontSize: '14px', color: brand.navy }}>{children}</Text>
  </Section>
)

export default EmailLayout