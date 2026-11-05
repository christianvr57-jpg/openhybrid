import { describe, expect, it } from 'vitest'
import { emptyForm, FormError, parseTime, toPlanInput, type OnboardingForm } from './form'

const complete: OnboardingForm = {
  ...emptyForm,
  racer: 'women',
  divisionId: 'singles_women',
  level: 'intermediate',
  weeklyKm: '20,5',
  days: ['tuesday', 'thursday', 'sunday'],
}

describe('parseTime', () => {
  it('reads minutes and hours', () => {
    expect(parseTime('45:00')).toBe(2700)
    expect(parseTime(' 1:15:30 ')).toBe(4530)
    expect(parseTime('105:00')).toBe(6300)
  })

  it.each(['', 'abc', '45', '45:60', '1:60:00', '0:00'])('rejects %j', (text) => {
    expect(parseTime(text)).toBeUndefined()
  })
})

describe('toPlanInput', () => {
  it('converts the answers to metric units', () => {
    const input = toPlanInput(complete, '2026-11-09')
    expect(input.athlete.weeklyRunMeters).toBe(20_500)
    expect(input.goal).toEqual({ race: 'hyrox', divisionId: 'singles_women' })
    expect(input.startDate).toBe('2026-11-09')
  })

  it('includes the optional answers', () => {
    const input = toPlanInput(
      {
        ...complete,
        raceDate: '2027-03-13',
        markMeters: '10000',
        markTime: '50:00',
        hyroxTime: '1:30:00',
      },
      '2026-11-09',
    )
    expect(input.goal.date).toBe('2027-03-13')
    expect(input.athlete.mark).toEqual({ distanceMeters: 10_000, timeSeconds: 3000 })
    expect(input.athlete.hyroxTimeSeconds).toBe(5400)
  })

  it('ignores fixed activities with no name', () => {
    const input = toPlanInput(
      {
        ...complete,
        fixedActivities: [
          { name: ' ', weekday: 'monday' },
          { name: 'Pádel', weekday: 'friday' },
        ],
      },
      '2026-11-09',
    )
    expect(input.athlete.fixedActivities).toEqual([{ name: 'Pádel', weekday: 'friday' }])
  })

  it('rejects missing answers and invalid times', () => {
    const codeOf = (form: OnboardingForm) => {
      try {
        toPlanInput(form, '2026-11-09')
        return undefined
      } catch (error) {
        return error instanceof FormError ? error.code : 'other'
      }
    }
    expect(codeOf({ ...complete, level: '' })).toBe('incomplete')
    expect(codeOf({ ...complete, markMeters: '5000', markTime: 'x' })).toBe('invalid_mark_time')
    expect(codeOf({ ...complete, hyroxTime: 'x' })).toBe('invalid_hyrox_time')
  })
})
