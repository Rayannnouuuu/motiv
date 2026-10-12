// Fonction Supabase « notify » : envoie les rappels push.
// - Appel planifié (pg_cron, toutes les 15 min, en-tête x-cron-secret) : rappels dont l'heure du jour tombe maintenant.
// - Appel { mode: 'test' } depuis l'appli (jeton de l'utilisateur) : notification de test immédiate.
// Construite avec `npm run build:notify` (regroupe la logique de src/ dans un seul fichier pour Deno).
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { TABLES, toAppData, type Rows } from '../../../src/data/mappers'
import { dueMessages, type PushMessage } from '../../../src/domain/notifications'

declare const Deno: { env: { get(name: string): string | undefined }; serve(h: (req: Request) => Promise<Response>): void }

const SITE = 'https://rayannnouuuu.github.io/motiv/'
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

interface Sub {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

async function loadSecrets(): Promise<Record<string, string>> {
  const { data, error } = await db.from('app_secrets').select('name, value')
  if (error) throw new Error(error.message)
  return Object.fromEntries((data ?? []).map((r: { name: string; value: string }) => [r.name, r.value]))
}

/** Envoie à chaque appareil ; un abonnement expiré (404/410) est supprimé. */
async function send(subs: Sub[], msg: Pick<PushMessage, 'title' | 'body' | 'url'> & { kind: string }): Promise<number> {
  let sent = 0
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 3600 })
      sent++
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) await db.from('push_subscriptions').delete().eq('id', s.id)
      else console.error('push failed', status, (e as Error).message)
    }
  }
  return sent
}

async function loadUserData(userId: string) {
  const entries = await Promise.all(
    TABLES.map(async (t) => {
      const { data, error } = await db.from(t).select('*').eq('user_id', userId)
      if (error) throw new Error(error.message)
      return [t, data ?? []] as const
    }),
  )
  return toAppData(Object.fromEntries(entries) as unknown as Rows)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const secrets = await loadSecrets()
    webpush.setVapidDetails(SITE, secrets.vapid_public, secrets.vapid_private)
    const body = (await req.json().catch(() => ({}))) as { mode?: string }

    if (body.mode === 'test') {
      const token = req.headers.get('Authorization')?.replace(/^Bearer /, '') ?? ''
      const { data: auth } = await db.auth.getUser(token)
      if (!auth.user) return json({ error: 'non connecté' }, 401)
      const { data: subs } = await db.from('push_subscriptions').select('*').eq('user_id', auth.user.id)
      if (!subs?.length) return json({ error: 'aucun appareil abonné' }, 404)
      const sent = await send(subs as Sub[], {
        kind: 'test',
        title: '🔥 Test réussi !',
        body: 'Tes rappels arriveront ici, à des heures différentes chaque jour.',
        url: '/motiv/',
      })
      return json({ sent })
    }

    if (req.headers.get('x-cron-secret') !== secrets.cron_secret) return json({ error: 'interdit' }, 401)
    const { data: subs, error } = await db.from('push_subscriptions').select('*')
    if (error) throw new Error(error.message)
    const byUser = new Map<string, Sub[]>()
    for (const s of (subs ?? []) as Sub[]) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s])

    let sent = 0
    const now = new Date()
    for (const [userId, userSubs] of byUser) {
      const messages = dueMessages(userId, await loadUserData(userId), now)
      for (const m of messages) sent += await send(userSubs, m)
    }
    return json({ users: byUser.size, sent })
  } catch (e) {
    console.error(e)
    return json({ error: (e as Error).message }, 500)
  }
})
