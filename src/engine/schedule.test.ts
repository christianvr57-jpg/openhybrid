import { describe, expect, it } from 'vitest'
import type { LoggedSession, Plan, Session } from './model'
import {
  dateInWeek,
  nextTrainingDate,
  reachedVolume,
  sessionsOn,
  showsFatigue,
  weekOf,
} from './schedule'

const session = (weekday: Session['weekday']): Session => ({
  type: 'easy_run',
  weekday,
  blocks: [],
  estimatedSeconds: 1800,
})

const week = (number: number, startDate: string, sessions: Session[]) => ({
  number,
  startDate,
  phase: 'base' as const,
  isDeload: false,
  isPartial: false,
  runMeters: 0,
  sessions,
})

const plan: Plan = {
  goal: { race: 'hyrox' },
  warnings: [],
  weeks: [
    { ...week(0, '2026-11-11', [session('friday')]), isPartial: true },
    week(1, '2026-11-16', [session('tuesday'), session('sunday')]),
  ],
}

describe('schedule', () => {
  it('finds the week of a date, also in a partial week', () => {
    expect(weekOf(plan, '2026-11-13')?.number).toBe(0)
    expect(weekOf(plan, '2026-11-22')?.number).toBe(1)
    expect(weekOf(plan, '2026-11-23')).toBeUndefined()
    expect(weekOf(plan, '2026-11-02')).toBeUndefined()
  })

  it('finds the sessions of a date', () => {
    expect(sessionsOn(plan, '2026-11-17')).toHaveLength(1)
    expect(sessionsOn(plan, '2026-11-18')).toHaveLength(0)
    expect(sessionsOn(plan, '2027-01-01')).toHaveLength(0)
  })

  it('turns a weekday into a date, using the Monday of a partial week', () => {
    const [partial] = plan.weeks
    expect(partial && dateInWeek(partial, 'friday')).toBe('2026-11-13')
  })

  it('finds the next training date', () => {
    expect(nextTrainingDate(plan, '2026-11-13')).toBe('2026-11-17')
    expect(nextTrainingDate(plan, '2026-11-01')).toBe('2026-11-13')
    expect(nextTrainingDate(plan, '2026-11-22')).toBeUndefined()
  })
})

describe('reachedVolume', () => {
  const volumes: Plan = {
    ...plan,
    weeks: [
      { ...week(1, '2026-11-16', []), runMeters: 20_000 },
      { ...week(2, '2026-11-23', []), runMeters: 23_000 },
      { ...week(3, '2026-11-30', []), runMeters: 17_000, isDeload: true },
      { ...week(4, '2026-12-07', []), runMeters: 26_000 },
    ],
  }

  it('uses finished normal weeks only', () => {
    expect(reachedVolume(volumes, '2026-12-09')).toBe(23_000)
    expect(reachedVolume(volumes, '2026-12-14')).toBe(26_000)
  })

  it('is zero before the first week ends', () => {
    expect(reachedVolume(volumes, '2026-11-18')).toBe(0)
  })
})

describe('showsFatigue', () => {
  const log = (day: number, changes: Partial<LoggedSession>): LoggedSession => ({
    id: `2026-11-1${day}:0`,
    date: `2026-11-1${day}`,
    type: 'easy_run',
    status: 'done',
    ...changes,
  })

  it('detects three hard or missed sessions in a row', () => {
    expect(
      showsFatigue([
        log(1, { rpe: 9 }),
        log(2, { status: 'skipped' }),
        log(3, { status: 'partial' }),
      ]),
    ).toBe(true)
  })

  it('ignores older sessions and normal ones', () => {
    expect(showsFatigue([log(1, { rpe: 9 }), log(2, { rpe: 10 }), log(3, { rpe: 6 })])).toBe(false)
    expect(showsFatigue([log(1, { rpe: 9 }), log(2, { rpe: 9 })])).toBe(false)
  })
})
