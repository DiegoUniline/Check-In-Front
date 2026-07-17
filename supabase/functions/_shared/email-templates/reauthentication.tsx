/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Heading, Section, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, Highlight, brand, h1, p, muted } from './_layout.tsx'

interface ReauthenticationEmailProps {
  token: string
  hotelName?: string
}

export const ReauthenticationEmail = ({ token, hotelName }: ReauthenticationEmailProps) => (
  <EmailLayout preview="Tu código de verificación" hotelName={hotelName}>
    <Heading style={h1}>Código de verificación 🔒</Heading>
    <Text style={p}>
      Usa el siguiente código para confirmar tu identidad{hotelName ? ` en ${hotelName}` : ''}:
    </Text>
    <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
      <Text
        style={{
          display: 'inline-block',
          fontFamily: "'Sora', 'Inter', monospace",
          fontSize: '32px',
          fontWeight: 700,
          letterSpacing: '0.4em',
          color: brand.navy,
          background: '#F0FBF9',
          border: `1px solid ${brand.turquoise}`,
          borderRadius: '12px',
          padding: '18px 26px',
          margin: 0,
        }}
      >
        {token}
      </Text>
    </Section>
    <Highlight>
      El código caduca en pocos minutos. Nunca compartas este código con nadie — ni siquiera con soporte.
    </Highlight>
    <Text style={muted}>Si no solicitaste este código, ignora este correo.</Text>
  </EmailLayout>
)

export default ReauthenticationEmail
