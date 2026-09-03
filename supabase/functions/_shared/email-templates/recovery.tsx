/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Heading, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, CTA, FallbackLink, Highlight, h1, p, muted } from './_layout.tsx'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  hotelName?: string
}

export const RecoveryEmail = ({ confirmationUrl, hotelName }: RecoveryEmailProps) => (
  <EmailLayout preview={`Restablece tu contraseña${hotelName ? ` de ${hotelName}` : ''}`} hotelName={hotelName}>
    <Heading style={h1}>Restablece tu contraseña 🔐</Heading>
    <Text style={p}>
      Recibimos una solicitud para restablecer la contraseña de tu cuenta{hotelName ? ` en ${hotelName}` : ''}. Haz clic en el botón para elegir una nueva.
    </Text>
    <CTA href={confirmationUrl}>Crear nueva contraseña</CTA>
    <Highlight>
      Por seguridad, este enlace caduca pronto y solo puede usarse una vez. Si no solicitaste el cambio, ignora este correo y tu contraseña seguirá igual.
    </Highlight>
    <Text style={muted}>Consejo: usa una contraseña única con al menos 10 caracteres, letras, números y símbolos.</Text>
    <FallbackLink href={confirmationUrl} />
  </EmailLayout>
)

export default RecoveryEmail
