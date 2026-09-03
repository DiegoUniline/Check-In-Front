import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createAuthEmailHandler } from 'npm:@lovable.dev/email-js@0.1.0'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-lovable-signature, x-lovable-timestamp, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Configuration
const SITE_NAME = "VULO"
const SENDER_DOMAIN = "notify.hospedapp.com"
const ROOT_DOMAIN = "hospedapp.com"
const FROM_DOMAIN = "hospedapp.com"
const SITE_URL = `https://${ROOT_DOMAIN}`

// Template mapping for preview mode
const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

// Sample data for preview mode ONLY (not used in actual email sending).
// URLs are baked in at scaffold time from the project's real data.
// The sample email uses a fixed placeholder (RFC 6761 .test TLD) so the Go backend
// can always find-and-replace it with the actual recipient when sending test emails,
// even if the project's domain has changed since the template was scaffolded.
const SAMPLE_PROJECT_URL = "https://vulo.lovable.app"
const SAMPLE_EMAIL = "user@example.test"
const SAMPLE_DATA: Record<string, object> = {
  signup: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    recipient: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  magiclink: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  recovery: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  invite: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  email_change: {
    siteName: SITE_NAME,
    oldEmail: SAMPLE_EMAIL,
    email: SAMPLE_EMAIL,
    newEmail: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  reauthentication: {
    token: '123456',
  },
}

// Preview endpoint handler - returns rendered HTML without sending email
async function handlePreview(req: Request): Promise<Response> {
  const previewCorsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: previewCorsHeaders })
  }

  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  const authHeader = req.headers.get('Authorization')

  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let type: string
  try {
    const body = await req.json()
    type = body.type
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const EmailTemplate = EMAIL_TEMPLATES[type]

  if (!EmailTemplate) {
    return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const sampleData = SAMPLE_DATA[type] || {}
  const html = await renderAsync(React.createElement(EmailTemplate, sampleData))

  return new Response(html, {
    status: 200,
    headers: { ...previewCorsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// Resolve the recipient's hotel name so auth emails stay co-branded with the
// hotel the user belongs to. Auth emails are load-bearing, so this never throws:
// when the lookup fails we simply send the VULO-branded version.
async function resolveHotelName(data: {
  user?: { id?: string; user_metadata?: Record<string, unknown> }
  user_id?: string
}): Promise<string | undefined> {
  try {
    const meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>
    const fromMeta = (meta.hotel_name ?? meta.hotelName) as string | undefined
    if (fromMeta) return fromMeta

    const userId = data.user?.id ?? data.user_id
    if (!userId) return undefined

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: profile } = await supabase
      .from('profiles')
      .select('hotel_id, hotel_activo_id')
      .eq('id', userId)
      .maybeSingle()

    const hotelId = profile?.hotel_activo_id || profile?.hotel_id
    if (!hotelId) return undefined

    const { data: hotel } = await supabase
      .from('hotels')
      .select('nombre')
      .eq('id', hotelId)
      .maybeSingle()

    return (hotel?.nombre as string | undefined) || undefined
  } catch (err) {
    console.warn('Could not resolve hotel name for auth email', err)
    return undefined
  }
}

// The SDK handler owns verification, dispatch, and retry semantics; this file
// owns only the email decisions: subjects, templates, and per-type props.
const handler = createAuthEmailHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
  senderDomain: SENDER_DOMAIN,
  sendUrl: Deno.env.get('LOVABLE_SEND_URL'),
  emails: {
    signup: {
      subject: 'Confirma tu correo · VULO',
      render: async (data) =>
        React.createElement(SignupEmail, {
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
          recipient: data.email,
          confirmationUrl: data.url,
          hotelName: await resolveHotelName(data as never),
        }),
    },
    invite: {
      subject: 'Te invitaron a colaborar · VULO',
      render: async (data) =>
        React.createElement(InviteEmail, {
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
          confirmationUrl: data.url,
          hotelName: await resolveHotelName(data as never),
        }),
    },
    magiclink: {
      subject: 'Tu enlace de acceso · VULO',
      render: async (data) =>
        React.createElement(MagicLinkEmail, {
          siteName: SITE_NAME,
          confirmationUrl: data.url,
          hotelName: await resolveHotelName(data as never),
        }),
    },
    recovery: {
      subject: 'Restablece tu contraseña · VULO',
      render: async (data) =>
        React.createElement(RecoveryEmail, {
          siteName: SITE_NAME,
          confirmationUrl: data.url,
          hotelName: await resolveHotelName(data as never),
        }),
    },
    email_change: {
      subject: 'Confirma tu nuevo correo · VULO',
      render: async (data) =>
        React.createElement(EmailChangeEmail, {
          siteName: SITE_NAME,
          oldEmail: data.old_email ?? '',
          email: data.email,
          newEmail: data.new_email ?? '',
          confirmationUrl: data.url,
          hotelName: await resolveHotelName(data as never),
        }),
    },
    reauthentication: {
      subject: 'Tu código de verificación · VULO',
      render: async (data) =>
        React.createElement(ReauthenticationEmail, {
          token: data.token ?? '',
          hotelName: await resolveHotelName(data as never),
        }),
    },
  },
})


Deno.serve(async (req) => {
  const url = new URL(req.url)

  // Handle CORS preflight for main endpoint
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Route to preview handler for /preview path
  if (url.pathname.endsWith('/preview')) {
    return handlePreview(req)
  }

  return handler(req)
})
