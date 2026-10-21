import { describe, expect, test } from 'vitest'
import type { Session } from './model'
import { parseCsv, parseGpx, parseStravaCsv, parseStravaDate, splitNew } from './stravaImport'

const HEAD =
  'Activity ID,Activity Date,Activity Name,Activity Type,Activity Description,Elapsed Time,Distance,Max Heart Rate,Relative Effort,Commute,Activity Private Note,Activity Gear,Filename,Athlete Weight,Bike Weight,Elapsed Time,Moving Time,Distance'
const CSV = [
  HEAD,
  '111,"Oct 12, 2026, 7:31:20 AM",Footing du dimanche,Run,"Belle sortie, un peu de vent",3700,10.02,170,40,false,,,activities/111.fit,,,3700.0,3600.0,10020.0',
  '112,"Oct 13, 2026, 5:00:00 PM",Vélotaf,Ride,,1800,8.1,,,true,,,,,,1800.0,1700.0,8100.0',
  '113,"Oct 14, 2026, 11:30:00 PM",Nocturne,Run,"Une description\nsur deux lignes",1500,5.0,,,false,,,,,,1500.0,1490.0,5000.0',
].join('\n')

describe('import Strava', () => {
  test('CSV : guillemets, virgules et retours à la ligne dans un champ', () => {
    expect(parseCsv('a,"b, c","d ""e"""\n1,"2\n3",4\n')).toEqual([
      ['a', 'b, c', 'd "e"'],
      ['1', '2\n3', '4'],
    ])
  })

  test('dates : anglais, français, ISO ; heure UTC', () => {
    expect(parseStravaDate('Oct 12, 2026, 7:31:20 AM')).toBe('2026-10-12T07:31:20.000Z')
    expect(parseStravaDate('Oct 12, 2026, 12:05:00 PM')).toBe('2026-10-12T12:05:00.000Z')
    expect(parseStravaDate('12 oct. 2026, 19:31:20')).toBe('2026-10-12T19:31:20.000Z')
    expect(parseStravaDate('2026-10-12 07:31:20')).toBe('2026-10-12T07:31:20.000Z')
    expect(parseStravaDate('n’importe quoi')).toBeNull()
  })

  test('activities.csv : les courses seulement, km de la 1re colonne, temps de déplacement, jour à Paris', () => {
    const r = parseStravaCsv(CSV)!
    expect(r.others).toBe(1)
    expect(r.runs).toEqual([
      { externalId: 'strava:111', day: '2026-10-12', startedAt: '2026-10-12T07:31:20.000Z', km: 10.02, sec: 3600, name: 'Footing du dimanche' },
      // 23 h 30 UTC = le lendemain à Paris.
      { externalId: 'strava:113', day: '2026-10-15', startedAt: '2026-10-14T23:30:00.000Z', km: 5, sec: 1490, name: 'Nocturne' },
    ])
  })

  test('en-têtes en français ; fichier qui n’est pas un export : null', () => {
    const fr =
      'ID de l\'activité,Date de l\'activité,Nom de l\'activité,Type d\'activité,Temps écoulé,Distance\n9,"12 oct. 2026, 07:00:00",Sortie,Course à pied,3000,"8,5"'
    expect(parseStravaCsv(fr)!.runs[0]).toMatchObject({ externalId: 'strava:9', km: 8.5, sec: 3000 })
    expect(parseStravaCsv('a,b\n1,2')).toBeNull()
  })

  test('GPX : distance par les points, durée du premier au dernier', () => {
    const gpx = `<?xml version="1.0"?><gpx><trk><name>Footing</name><type>running</type><trkseg>
      <trkpt lat="48.8566" lon="2.3522"><time>2026-10-12T07:00:00Z</time></trkpt>
      <trkpt lat="48.8656" lon="2.3522"><time>2026-10-12T07:05:00Z</time></trkpt>
      </trkseg></trk></gpx>`
    expect(parseGpx(gpx)).toEqual({
      externalId: 'gpx:2026-10-12T07:00:00.000Z',
      day: '2026-10-12',
      startedAt: '2026-10-12T07:00:00.000Z',
      km: 1,
      sec: 300,
      name: 'Footing',
    })
    expect(
      parseGpx(
        '<gpx><trk><type>cycling</type><trkseg><trkpt lat="1" lon="1"><time>2026-10-12T07:00:00Z</time></trkpt><trkpt lat="1.1" lon="1"><time>2026-10-12T07:10:00Z</time></trkpt></trkseg></trk></gpx>',
      ),
    ).toBeNull()
    expect(parseGpx('pas du xml')).toBeNull()
  })

  test('doublons : même activité, ou même jour à 300 m près ; un second import n’ajoute rien', () => {
    const runs = parseStravaCsv(CSV)!.runs
    const session = (day: string, km: number, externalId?: string) => ({ id: day, day, ...(externalId ? { externalId } : {}), km }) as unknown as Session
    const runOf = (s: Session) => ({ km: (s as unknown as { km: number }).km })
    expect(splitNew(runs, [], runOf)).toMatchObject({ known: 0, fresh: runs })
    expect(splitNew(runs, [session('2026-10-12', 10.2)], runOf)).toMatchObject({ known: 1, fresh: [runs[1]] })
    expect(splitNew(runs, [session('2026-01-01', 3, 'strava:113')], runOf)).toMatchObject({ known: 1, fresh: [runs[0]] })
    expect(splitNew([...runs, ...runs], [], runOf).fresh).toHaveLength(2)
  })
})
