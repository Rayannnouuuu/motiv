// Ajouté au service worker généré (workbox importScripts) : affiche les notifications push et ouvre l'appli au toucher.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || 'Motiv', {
        body: data.body || '',
        icon: '/motiv/pwa-192x192.png',
        badge: '/motiv/pwa-64x64.png',
        // Un nouveau rappel du même type remplace l'ancien au lieu de s'empiler.
        tag: 'motiv-' + (data.kind || 'rappel'),
        data: { url: data.url || '/motiv/' },
      }),
      // Pastille sur l'icône de l'écran d'accueil, effacée à l'ouverture de l'appli.
      self.navigator.setAppBadge ? self.navigator.setAppBadge(1).catch(() => {}) : null,
    ]),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL((event.notification.data && event.notification.data.url) || '/motiv/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => w.url.startsWith(self.location.origin + '/motiv/'))
      if (open) return open.focus().then((w) => w && 'navigate' in w ? w.navigate(url) : w)
      return self.clients.openWindow(url)
    }),
  )
})
