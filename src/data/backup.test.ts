import { describe, expect, it } from 'vitest'
import { generatePlan } from '../engine/generate'
import type { Athlete, LoggedSession } from '../engine/model'
import { parseBackup, serializeBackup, type Backup } from './backup'

const athlete: Athlete = {
  level: 'beginner',
  racer: 'men',
  weeklyRunMeters: 10_000,
  availableDays: ['tuesday', 'thursday', 'sunday'],
  fixedActivities: [],
  equipment: [],
}

const log: LoggedSession = {
  id: '2026-11-10:0',
  date: '2026-11-10',
  type: 'easy_run',
  status: 'done',
  rpe: 4,
  notes: 'Bien',
}

const backup: Backup = {
  active: {
    athlete,
    startDate: '2026-11-09',
    plan: generatePlan({
      athlete,
      goal: { race: 'hyrox', divisionId: 'singles_men' },
      startDate: '2026-11-09',
    }),
  },
  logs: [log],
  simulations: [
    {
      id: '1',
      date: '2026-11-10',
      divisionId: 'singles_men',
      splits: [{ segment: 'run_1', seconds: 300 }],
      totalSeconds: 300,
    },
  ],
}

describe('backup', () => {
  it('restores what it saved', () => {
    expect(parseBackup(serializeBackup(backup))).toEqual(backup)
  })

  it('accepts a backup with no active plan', () => {
    const empty = { active: null, logs: [], simulations: [] }
    expect(parseBackup(serializeBackup(empty))).toEqual(empty)
  })

  it('reads backups made before simulations existed', () => {
    const old = '{"app":"openhybrid","version":1,"active":null,"logs":[]}'
    expect(parseBackup(old)).toEqual({ active: null, logs: [], simulations: [] })
  })

  it.each([
    ['text that is not JSON', 'hello'],
    ['JSON from something else', '{"weeks": []}'],
    ['another version', '{"app":"openhybrid","version":99,"active":null,"logs":[]}'],
    [
      'a broken log',
      '{"app":"openhybrid","version":1,"active":null,"logs":[{"id":"x","date":"nope"}]}',
    ],
  ])('rejects %s', (_, text) => {
    expect(parseBackup(text)).toBeUndefined()
  })
})
