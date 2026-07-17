import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
}

const SITE_NAME = 'HospedApp'
const SENDER_DOMAIN = 'notify.hospedapp.com'
const FROM_DOMAIN = 'hospedapp.com'
const SITE_URL = 'https://hospedapp.com'

const TEMPLATES: Record<string, { component: React.ComponentType<any>; subject: string; props: any }> = {
  signup: {
    component: SignupEmail,
    subject: 'Confirma tu correo',
    props: { siteName: SITE_NAME, siteUrl: SITE_URL, confirmationUrl: `${SITE_URL}/auth/confirm`, hotelName: 'Hotel Vista Mar' },
  },
  magiclink: {
    component: MagicLinkEmail,
    subject: 'Tu enlace de acceso',
    props: { siteName: SITE_NAME, confirmationUrl: `${SITE_URL}/auth/magic`, hotelName: 'Hotel Vista Mar' },
  },
  recovery: {
    component: RecoveryEmail,
    subject: 'Restablece tu contraseña',
    props: { siteName: SITE_NAME, confirmationUrl: `${SITE_URL}/auth/reset`, hotelName: 'Hotel Vista Mar' },
  },
  invite: {
    component: InviteEmail,
    subject: 'Te invitaron a colaborar',
    props: { siteName: SITE_NAME, siteUrl: SITE_URL, confirmationUrl: `${SITE_URL}/auth/invite`, hotelName: 'Hotel Vista Mar' },
  },
  email_change: {
    component: EmailChangeEmail,
    subject: 'Confirma tu nuevo correo',
    props: { siteName: SITE_NAME, oldEmail: 'anterior@example.com', newEmail: 'nuevo@example.com', email: 'nuevo@example.com', confirmationUrl: `${SITE_URL}/auth/email-change`, hotelName: 'Hotel Vista Mar' },
  },
  reauthentication: {
    component: ReauthenticationEmail,
    subject: 'Tu código de verificación',
    props: { token: '123456', hotelName: 'Hotel Vista Mar' },
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { recipient } = await req.json().catch(() => ({ recipient: 'diego.leon@uniline.mx' }))
    const to = recipient || 'diego.leon@uniline.mx'

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const results: any[] = []
    for (const [type, tpl] of Object.entries(TEMPLATES)) {
      const html = await renderAsync(React.createElement(tpl.component, tpl.props))
      const text = await renderAsync(React.createElement(tpl.component, tpl.props), { plainText: true })
      const messageId = crypto.randomUUID()
      const subject = `[Preview] ${tpl.subject} · ${tpl.props.hotelName ?? SITE_NAME}`

      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: type,
        recipient_email: to,
        status: 'pending',
      })

      const { error } = await supabase.rpc('enqueue_email', {
        queue_name: 'auth_emails',
        payload: {
          run_id: crypto.randomUUID(),
          message_id: messageId,
          to,
          from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject,
          html,
          text,
          purpose: 'transactional',
          label: type,
          queued_at: new Date().toISOString(),
        },
      })

      results.push({ type, ok: !error, error: error?.message, messageId })
    }

    return new Response(JSON.stringify({ recipient: to, results }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})