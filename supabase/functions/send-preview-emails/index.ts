import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { sendLovableEmail, EmailAPIError } from 'npm:@lovable.dev/email-js@0.1.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3.23.8'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const SITE_NAME = 'VULO'
const SENDER_DOMAIN = 'notify.hospedapp.com'
const FROM_DOMAIN = 'hospedapp.com'
const SITE_URL = 'https://vulo.mx'

const TEMPLATES: Record<string, { component: React.ComponentType<any>; subject: string; props: any }> = {
  signup: {
    component: SignupEmail,
    subject: 'Confirma tu correo',
    props: { siteName: SITE_NAME, siteUrl: SITE_URL, confirmationUrl: `${SITE_URL}/auth/confirm`, hotelName: 'Hotel Decos' },
  },
  magiclink: {
    component: MagicLinkEmail,
    subject: 'Tu enlace de acceso',
    props: { siteName: SITE_NAME, confirmationUrl: `${SITE_URL}/auth/magic`, hotelName: 'Hotel Decos' },
  },
  recovery: {
    component: RecoveryEmail,
    subject: 'Restablece tu contraseña',
    props: { siteName: SITE_NAME, confirmationUrl: `${SITE_URL}/auth/reset`, hotelName: 'Hotel Decos' },
  },
  invite: {
    component: InviteEmail,
    subject: 'Te invitaron a colaborar',
    props: { siteName: SITE_NAME, siteUrl: SITE_URL, confirmationUrl: `${SITE_URL}/auth/invite`, hotelName: 'Hotel Decos' },
  },
  email_change: {
    component: EmailChangeEmail,
    subject: 'Confirma tu nuevo correo',
    props: { siteName: SITE_NAME, oldEmail: 'anterior@example.com', newEmail: 'nuevo@example.com', email: 'nuevo@example.com', confirmationUrl: `${SITE_URL}/auth/email-change`, hotelName: 'Hotel Decos' },
  },
  reauthentication: {
    component: ReauthenticationEmail,
    subject: 'Tu código de verificación',
    props: { token: '123456', hotelName: 'Hotel Decos' },
  },
}

const BodySchema = z.object({
  recipient: z.string().email().max(320).default('diego.leon@uniline.mx'),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const to = parsed.data.recipient.toLowerCase()

    const apiKey = Deno.env.get('LOVABLE_API_KEY')!
    const sendUrl = Deno.env.get('LOVABLE_SEND_URL')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const logSend = async (
      type: string,
      status: 'sent' | 'suppressed' | 'failed',
      errorMessage?: string,
    ) => {
      const { error } = await supabase.from('email_send_log').insert({
        template_name: type,
        recipient_email: to,
        status,
        error_message: errorMessage?.slice(0, 1000) ?? null,
      })
      if (error) console.error('Failed to write email_send_log row', { type, status, error })
    }

    const results: Array<{ type: string; ok: boolean; status: string; error?: string }> = []

    for (const [type, tpl] of Object.entries(TEMPLATES)) {
      const html = await renderAsync(React.createElement(tpl.component, tpl.props))
      const text = await renderAsync(React.createElement(tpl.component, tpl.props), { plainText: true })
      const subject = `[Preview] ${tpl.subject} · ${tpl.props.hotelName ?? SITE_NAME}`

      try {
        await sendLovableEmail(
          {
            to,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject,
            html,
            text,
            purpose: 'transactional',
            label: `preview-${type}`,
            idempotency_key: `preview-${type}-${crypto.randomUUID()}`,
          },
          { apiKey, sendUrl },
        )
        await logSend(type, 'sent')
        results.push({ type, ok: true, status: 'sent' })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)

        if (error instanceof EmailAPIError && error.code === 'recipient_suppressed') {
          await logSend(type, 'suppressed', message)
          results.push({ type, ok: false, status: 'suppressed' })
          continue
        }

        if (error instanceof EmailAPIError && error.status === 429) {
          const wait = (error.retryAfterSeconds ?? 60) * 1000
          await new Promise((r) => setTimeout(r, wait))
          try {
            await sendLovableEmail(
              {
                to,
                from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
                sender_domain: SENDER_DOMAIN,
                subject,
                html,
                text,
                purpose: 'transactional',
                label: `preview-${type}`,
                idempotency_key: `preview-${type}-${crypto.randomUUID()}`,
              },
              { apiKey, sendUrl },
            )
            await logSend(type, 'sent')
            results.push({ type, ok: true, status: 'sent' })
            continue
          } catch (retryError) {
            const retryMessage =
              retryError instanceof Error ? retryError.message : String(retryError)
            await logSend(type, 'failed', retryMessage)
            results.push({ type, ok: false, status: 'failed', error: retryMessage })
            continue
          }
        }

        await logSend(type, 'failed', message)
        results.push({ type, ok: false, status: 'failed', error: message })
      }
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
