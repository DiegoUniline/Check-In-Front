/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Heading, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, CTA, FallbackLink, Highlight, h1, p, muted } from './_layout.tsx'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  hotelName?: string
}

export const SignupEmail = ({ recipient, confirmationUrl, hotelName }: SignupEmailProps) => (
  <EmailLayout preview={`Confirma tu correo en ${hotelName || 'VULO'}`} hotelName={hotelName}>
    <Heading style={h1}>¡Bienvenido{hotelName ? ` a ${hotelName}` : ''}! 👋</Heading>
    <Text style={p}>
      Gracias por unirte. Solo falta un paso para activar tu cuenta: confirma tu correo <strong>{recipient}</strong> para empezar a gestionar reservas, habitaciones y huéspedes.
    </Text>
    <CTA href={confirmationUrl}>Confirmar mi correo</CTA>
    <Highlight>
      Este enlace es personal y caduca en unas horas. Si no fuiste tú quien se registró, ignora este mensaje.
    </Highlight>
    <Text style={muted}>¿Necesitas ayuda? Responde a este correo y con gusto te asistimos.</Text>
    <FallbackLink href={confirmationUrl} />
  </EmailLayout>
)

export default SignupEmail
