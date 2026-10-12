// Client chargé à la demande : ce module reste importable sans configuration Supabase (tests).
const client = async () => (await import('./supabase')).supabase

/** Clé publique VAPID (la clé privée reste côté serveur, dans app_secrets). */
export const VAPID_PUBLIC_KEY = 'BB6Ta_q8vmAG-IczXp4tXrie5ubsSzwa5gJ1MAwqgYW3uhCXGsl0XloSTrBqE7MJcKFdYF9rVkz66HvTip60dx8'

export type PushSupport = 'ok' | 'needs-install' | 'unsupported'

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

/** Sur iPhone, le push ne marche que depuis l'appli installée sur l'écran d'accueil. */
export function pushSupport(): PushSupport {
  if (isIos() && !isStandalone()) return 'needs-install'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  return 'ok'
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== 'ok') return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

async function saveSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  const { error } = await (await client())
    .from('push_subscriptions')
    .upsert({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }, { onConflict: 'endpoint' })
  if (error) throw new Error(error.message)
}

/**
 * À l'ouverture : renvoie l'abonnement de l'appareil au serveur. Le navigateur peut le renouveler,
 * et le serveur supprime ceux qui expirent ; sans ça les rappels s'arrêteraient sans prévenir.
 */
export async function syncPush(): Promise<void> {
  if (pushSupport() !== 'ok' || Notification.permission !== 'granted') return
  const sub = await currentSubscription()
  if (sub) await saveSubscription(sub)
}

/** Demande l'autorisation, abonne l'appareil et l'enregistre côté serveur. */
export async function enablePush(): Promise<void> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notifications refusées : autorise-les pour Motiv dans les réglages du téléphone.')
  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }))
  await saveSubscription(sub)
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription()
  if (!sub) return
  await (await client()).from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

/** Envoie tout de suite une notification de test sur les appareils abonnés. */
export async function sendTestPush(): Promise<void> {
  const { error } = await (await client()).functions.invoke('notify', { body: { mode: 'test' } })
  if (error) throw new Error('Envoi impossible : ' + error.message)
}
