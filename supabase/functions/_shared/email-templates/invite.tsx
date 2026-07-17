/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Heading, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, CTA, FallbackLink, Highlight, h1, p, muted } from './_layout.tsx'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
  hotelName?: string
}

export const InviteEmail = ({ confirmationUrl, hotelName }: InviteEmailProps) => (
  <EmailLayout preview={`Te invitaron a unirte${hotelName ? ` a ${hotelName}` : ''}`} hotelName={hotelName}>
    <Heading style={h1}>Te invitaron al equipo 🎉</Heading>
    <Text style={p}>
      Has sido invitado a colaborar{hotelName ? ` en ${hotelName}` : ''} a través de HospedApp. Acepta la invitación para crear tu cuenta y empezar a trabajar con el equipo.
    </Text>
    <CTA href={confirmationUrl}>Aceptar invitación</CTA>
    <Highlight>
      Con tu cuenta podrás gestionar reservas, habitaciones, huéspedes y más — todo desde un mismo panel.
    </Highlight>
    <Text style={muted}>Si no esperabas esta invitación, puedes ignorar este correo con tranquilidad.</Text>
    <FallbackLink href={confirmationUrl} />
  </EmailLayout>
)

export default InviteEmail
