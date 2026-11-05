import { describe, expect, it } from 'vitest'
import type { Plan, Session } from './model'
import { dateInWeek, nextTrainingDate, sessionsOn, weekOf } from './schedule'

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
