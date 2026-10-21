import { describe, expect, test } from 'vitest'
import { challenge, data, g, program, ss } from '../test/factories'
import { buildMessage, dueMessages, parisMinutes, slotMinute, WINDOWS, type NotificationKind } from './notifications'

const today = '2026-10-15' // jeudi

describe('créneaux aléatoires', () => {
  test('dans la plage, par pas de 5 min, stables sur la journée, variables selon les jours', () => {
    for (const kind of Object.keys(WINDOWS) as NotificationKind[]) {
      const m = slotMinute('user-1', today, kind)
      expect(m).toBeGreaterThanOrEqual(WINDOWS[kind][0])
      expect(m).toBeLessThan(WINDOWS[kind][1])
      expect(m % 5).toBe(0)
      expect(slotMinute('user-1', today, kind)).toBe(m)
    }
    const days = Array.from({ length: 10 }, (_, i) => slotMinute('user-1', `2026-10-${10 + i}`, 'streak'))
    expect(new Set(days).size).toBeGreaterThan(3)
  })

  test('parisMinutes suit l’heure de Paris (été et hiver)', () => {
    expect(parisMinutes(new Date('2026-07-14T06:30:00Z'))).toBe(8 * 60 + 30)
    expect(parisMinutes(new Date('2026-12-14T06:30:00Z'))).toBe(7 * 60 + 30)
  })
})

describe('messages', () => {
  test('guitare du jour : seulement tant que la séance du jour ne compte pas (30 min)', () => {
    expect(buildMessage('streak', data({ guitarSessions: [g(today, 20)] }), today)).toMatchObject({
      title: '🎸 Ta séance de guitare du jour',
      body: "Encore 10 min pour qu'elle compte",
    })
    expect(buildMessage('streak', data({ guitarSessions: [g(today, 30)] }), today)).toBeNull()
    // Plus de règle 30/60 : hier court ne change rien.
    expect(buildMessage('streak', data({ guitarSessions: [g('2026-10-14', 40), g(today, 30)] }), today)).toBeNull()
  })

  test('résumé de la semaine : le dimanche seulement', () => {
    const sunday = '2026-10-18'
    const d = data({
      guitarSessions: [g('2026-10-12', 60), g('2026-10-13', 40), g('2026-10-14', 20), g('2026-10-18', 75)],
      sportSessions: [ss([], '2026-10-12'), ss([], '2026-10-15')],
    })
    expect(buildMessage('week', d, sunday)).toEqual({
      kind: 'week',
      title: '📊 Ta semaine',
      body: '🎸 3 jours de guitare (3 h 15)\n🏋️ 2/3 séances de sport',
      url: '/motiv/progres',
    })
    expect(buildMessage('week', d, today)).toBeNull()
  })

  test('plan : 3 exos du jour et la séance si la semaine n’est pas faite', () => {
    const p = program({ id: 'p', name: 'Push' })
    const msg = buildMessage('plan', data({ programs: [p] }), today)!
    const [exos, sport] = msg.body.split('\n')
    expect(msg.title).toBe('☀️ Ton plan du jour')
    expect(exos.replace('🎸 ', '').split(' · ')).toHaveLength(3)
    expect(sport).toBe('🏋️ Séance : Push')
    expect(buildMessage('plan', data({ programs: [p], sportSessions: [ss([], today, 'p')] }), today)!.body).not.toContain('Séance')
  })

  test('sport : seulement quand il reste autant de séances que de jours', () => {
    const p = program({ id: 'p', name: 'Push' })
    // Jeudi : 4 jours restants (jeu → dim), 3 séances à faire → pas encore.
    expect(buildMessage('sport', data({ programs: [p] }), today)).toBeNull()
    // Samedi : 2 jours restants, 2 séances à faire → rappel.
    const sat = '2026-10-17'
    const d = data({ programs: [p], sportSessions: [ss([], '2026-10-12', 'p')] })
    expect(buildMessage('sport', d, sat)).toMatchObject({ title: '💪 Plus que 2 séances cette semaine', body: 'Prochaine : Push' })
  })

  test('défi bloquant : un jour sur trois depuis le blocage', () => {
    const ch = challenge({
      id: 'c',
      createdOn: '2026-10-01',
      blockedSince: '2026-10-12',
      target: { kind: 'bpm', exerciseId: 'legato-6', bpm: 96, baseline: null },
    })
    const d = data({ guitarSessions: [g('2026-10-11', 60, [], 1300)], challenges: [ch] })
    expect(buildMessage('challenge', d, '2026-10-15')).toMatchObject({
      title: '🎯 Défi requis pour le niveau 2',
      body: 'Legato sur une corde 6 à 96 bpm · 0/96 bpm',
    })
    expect(buildMessage('challenge', d, '2026-10-14')).toBeNull()
    expect(buildMessage('challenge', data({ challenges: [ch] }), '2026-10-15')).toBeNull() // pas bloqué
  })
})

test('dueMessages : envoie un rappel quand son heure tombe dans la fenêtre de 15 min', () => {
  const slot = slotMinute('user-1', today, 'streak')
  const at = (minute: number) => {
    // Paris = UTC+2 le 15 octobre 2026.
    const d = new Date(`${today}T00:00:00Z`)
    d.setUTCMinutes(minute - 120)
    return d
  }
  expect(dueMessages('user-1', data(), at(slot)).map((m) => m.kind)).toContain('streak')
  expect(dueMessages('user-1', data(), at(slot + 14)).map((m) => m.kind)).toContain('streak')
  expect(dueMessages('user-1', data(), at(slot + 15)).map((m) => m.kind)).not.toContain('streak')
  expect(dueMessages('user-1', data(), at(slot - 1)).map((m) => m.kind)).not.toContain('streak')
})
