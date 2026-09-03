/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Heading, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, CTA, FallbackLink, Highlight, h1, p, muted } from './_layout.tsx'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  hotelName?: string
}

export const MagicLinkEmail = ({ confirmationUrl, hotelName }: MagicLinkEmailProps) => (
  <EmailLayout preview={`Tu enlace de acceso${hotelName ? ` a ${hotelName}` : ''}`} hotelName={hotelName}>
    <Heading style={h1}>Tu enlace de acceso ✨</Heading>
    <Text style={p}>
      Toca el botón para iniciar sesión{hotelName ? ` en ${hotelName}` : ''} sin contraseña. Este enlace es único y caduca pronto.
    </Text>
    <CTA href={confirmationUrl}>Iniciar sesión</CTA>
    <Highlight>
      Nunca compartas este enlace. Si no solicitaste acceso, ignora este correo — nadie podrá entrar sin él.
    </Highlight>
    <Text style={muted}>Consejo: para mayor seguridad, cierra sesión al terminar en equipos compartidos.</Text>
    <FallbackLink href={confirmationUrl} />
  </EmailLayout>
)

export default MagicLinkEmail
