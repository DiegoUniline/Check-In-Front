/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Heading, Link, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, CTA, FallbackLink, Highlight, brand, h1, p, muted } from './_layout.tsx'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
  hotelName?: string
}

export const EmailChangeEmail = ({
  oldEmail,
  newEmail,
  confirmationUrl,
  hotelName,
}: EmailChangeEmailProps) => (
  <EmailLayout preview="Confirma el cambio de tu correo" hotelName={hotelName}>
    <Heading style={h1}>Confirma tu nuevo correo ✉️</Heading>
    <Text style={p}>
      Solicitaste actualizar el correo de tu cuenta{hotelName ? ` en ${hotelName}` : ''}:
    </Text>
    <Text style={{ ...p, margin: '4px 0' }}>
      <span style={{ color: brand.muted }}>De:</span>{' '}
      <Link href={`mailto:${oldEmail}`} style={{ color: brand.navy }}>{oldEmail}</Link>
    </Text>
    <Text style={{ ...p, margin: '0 0 14px' }}>
      <span style={{ color: brand.muted }}>A:</span>{' '}
      <Link href={`mailto:${newEmail}`} style={{ color: brand.turquoise, fontWeight: 600 }}>{newEmail}</Link>
    </Text>
    <CTA href={confirmationUrl}>Confirmar cambio de correo</CTA>
    <Highlight>
      Si no fuiste tú quien solicitó este cambio, protege tu cuenta ahora: cambia tu contraseña y contacta a soporte.
    </Highlight>
    <Text style={muted}>Este enlace caduca pronto por motivos de seguridad.</Text>
    <FallbackLink href={confirmationUrl} />
  </EmailLayout>
)

export default EmailChangeEmail
