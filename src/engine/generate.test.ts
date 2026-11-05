import { describe, expect, it } from 'vitest'
import { generatePlan, isHardSession, PlanInputError } from './generate'
import type { PlanInput } from './generate'
import type { Athlete, Block, Plan, Session, StationId, Weekday, Week } from './model'

const ALL_STATIONS: StationId[] = [
  'ski_erg',
  'sled_push',
  'sled_pull',
  'burpee_broad_jumps',
  'rowing',
  'farmers_carry',
  'sandbag_lunges',
  'wall_balls',
]

const WEEKDAYS: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const base: Athlete = {
  level: 'intermediate',
  racer: 'women',
  mark: { distanceMeters: 10_000, timeSeconds: 3000 },
  weeklyRunMeters: 20_000,
  availableDays: ['tuesday', 'thursday', 'saturday', 'sunday'],
  fixedActivities: [],
  equipment: ALL_STATIONS,
}

const athletes: Record<string, Athlete> = {
  'beginner, three days': {
    ...base,
    level: 'beginner',
    weeklyRunMeters: 8000,
    availableDays: ['tuesday', 'thursday', 'sunday'],
  },
  'beginner without mark': {
    ...base,
    level: 'beginner',
    mark: undefined,
    weeklyRunMeters: 5000,
    availableDays: ['monday', 'wednesday', 'friday', 'saturday'],
  },
  'returning after a break': { ...base, weeklyRunMeters: 0 },
  intermediate: base,
  'intermediate with a fixed sport': {
    ...base,
    availableDays: ['monday', 'tuesday', 'thursday', 'friday', 'saturday', 'sunday'],
    fixedActivities: [{ name: 'padel', weekday: 'wednesday' }],
  },
  'advanced, six days': {
    ...base,
    level: 'advanced',
    racer: 'men',
    weeklyRunMeters: 50_000,
    availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'saturday', 'sunday'],
  },
  'advanced above the cap': {
    ...base,
    level: 'advanced',
    racer: 'men',
    weeklyRunMeters: 70_000,
    availableDays: WEEKDAYS,
  },
}

function inputFor(athlete: Athlete, date?: string, startDate = '2026-11-09'): PlanInput {
  const divisionId = athlete.racer === 'women' ? 'singles_women' : 'singles_men'
  return {
    athlete,
    goal: date === undefined ? { race: 'hyrox', divisionId } : { race: 'hyrox', divisionId, date },
    startDate,
  }
}

const fullWeeks = (plan: Plan): Week[] => plan.weeks.filter((week) => !week.isPartial)

const qualityMeters = (session: Session): number =>
  session.type === 'easy_run' || session.type === 'long_run'
    ? 0
    : session.blocks.reduce(
        (total: number, block: Block) =>
          block.kind === 'run' ? total + block.meters * block.repeats : total,
        0,
      )

function dayNumber(week: Week, weekday: Weekday): number {
  const monday = Date.parse(`${week.startDate}T00:00:00Z`) / 86_400_000
  return monday + WEEKDAYS.indexOf(weekday)
}

function hardDayNumbers(plan: Plan, athlete: Athlete): number[] {
  const days = new Set<number>()
  for (const week of fullWeeks(plan)) {
    for (const session of week.sessions.filter(isHardSession)) {
      days.add(dayNumber(week, session.weekday))
    }
    for (const activity of athlete.fixedActivities) {
      days.add(dayNumber(week, activity.weekday))
    }
  }
  return [...days].sort((first, second) => first - second)
}

function expectSaneVolume(plan: Plan): void {
  const normal = fullWeeks(plan).filter((week) => !week.isDeload)
  for (const [index, week] of normal.entries()) {
    const previous = normal[index - 1]
    if (previous !== undefined) {
      const limit = Math.max(previous.runMeters * 0.1, 3000)
      expect(week.runMeters - previous.runMeters).toBeLessThanOrEqual(limit)
    }
  }
}

describe.each(Object.entries(athletes))('plan for %s', (_, athlete) => {
  const dated = generatePlan(inputFor(athlete, '2027-03-13'))
  const continuous = generatePlan(inputFor(athlete))

  it('never raises running volume beyond the limit', () => {
    expectSaneVolume(dated)
    expectSaneVolume(continuous)
  })

  it('includes deload weeks', () => {
    expect(dated.weeks.some((week) => week.isDeload)).toBe(true)
    expect(continuous.weeks.some((week) => week.isDeload)).toBe(true)
  })

  it('makes deload weeks lighter than the week before', () => {
    for (const plan of [dated, continuous]) {
      for (const [index, week] of plan.weeks.entries()) {
        const previous = plan.weeks[index - 1]
        if (week.isDeload && previous !== undefined) {
          expect(week.runMeters).toBeLessThan(previous.runMeters)
        }
      }
    }
  })

  it('ends a dated plan with a taper and the race', () => {
    const last = dated.weeks.at(-1)
    const beforeLast = dated.weeks.at(-2)
    const peak = Math.max(...dated.weeks.map((week) => week.runMeters))
    expect(last?.phase).toBe('taper')
    expect(last?.sessions.at(-1)?.type).toBe('race')
    expect(last?.sessions.at(-1)?.weekday).toBe('saturday')
    expect(beforeLast?.phase).toBe('taper')
    expect(beforeLast?.runMeters).toBeLessThan(peak)
  })

  it('never puts two hard days in a row', () => {
    for (const plan of [dated, continuous]) {
      const days = hardDayNumbers(plan, athlete)
      for (const [index, day] of days.entries()) {
        const previous = days[index - 1]
        if (previous !== undefined) {
          expect(day - previous).toBeGreaterThan(1)
        }
      }
    }
  })

  it('keeps most running easy', () => {
    for (const week of fullWeeks(dated).filter(
      (item) => item.phase !== 'taper' && item.number > 1 && item.runMeters >= 10_000,
    )) {
      const quality = week.sessions.reduce((total, session) => total + qualityMeters(session), 0)
      expect(quality / week.runMeters).toBeLessThanOrEqual(0.25)
    }
  })

  it('never schedules on fixed activity days or unavailable days', () => {
    const fixed = athlete.fixedActivities.map((activity) => activity.weekday)
    for (const week of fullWeeks(continuous)) {
      for (const session of week.sessions) {
        expect(athlete.availableDays).toContain(session.weekday)
        expect(fixed).not.toContain(session.weekday)
      }
    }
  })

  it('keeps at most two sessions on a day', () => {
    for (const week of dated.weeks) {
      for (const day of WEEKDAYS) {
        const count = week.sessions.filter((session) => session.weekday === day).length
        expect(count).toBeLessThanOrEqual(2)
      }
    }
  })

  it('keeps the long run from dominating the week', () => {
    for (const week of fullWeeks(continuous)) {
      const long = week.sessions.find((session) => session.type === 'long_run')
      const meters = long?.blocks.reduce(
        (total, block) => (block.kind === 'run' ? total + block.meters : total),
        0,
      )
      expect((meters ?? 0) / week.runMeters).toBeLessThanOrEqual(0.5)
    }
  })

  it('never makes an easy run longer than the long run', () => {
    const metersOf = (session: Session): number =>
      session.blocks.reduce(
        (total, block) => (block.kind === 'run' ? total + block.meters * block.repeats : total),
        0,
      )
    for (const week of fullWeeks(dated).filter((item) => item.phase !== 'taper')) {
      const long = week.sessions.find((session) => session.type === 'long_run')
      for (const easy of week.sessions.filter((session) => session.type === 'easy_run')) {
        expect(metersOf(easy)).toBeLessThanOrEqual(long === undefined ? Infinity : metersOf(long))
      }
    }
  })

  it('keeps race week running short', () => {
    const easy = dated.weeks.at(-1)?.sessions.filter((session) => session.type === 'easy_run')
    const meters = easy
      ?.flatMap((session) => session.blocks)
      .map((block) => (block.kind === 'run' ? block.meters : 0))
    expect(Math.max(0, ...(meters ?? []))).toBeLessThanOrEqual(5000)
  })

  it('stays sane in the shortest allowed plan', () => {
    const shortest = generatePlan(inputFor(athlete, '2026-12-19'))
    expectSaneVolume(shortest)
    expect(shortest.weeks.some((week) => week.isDeload)).toBe(true)
    expect(shortest.weeks.at(-1)?.sessions.at(-1)?.type).toBe('race')
  })

  it('trains strength every week before the taper', () => {
    for (const week of fullWeeks(dated).filter((item) => item.phase !== 'taper')) {
      expect(week.sessions.some((session) => session.type === 'strength')).toBe(true)
    }
  })

  it('is deterministic', () => {
    expect(generatePlan(inputFor(athlete, '2027-03-13'))).toEqual(dated)
  })
})

describe('dated plan structure', () => {
  const plan = generatePlan(inputFor(base, '2027-03-13'))

  it('follows the phases in order', () => {
    const phases = plan.weeks.map((week) => week.phase)
    const order = [...new Set(phases)]
    expect(order).toEqual(['base', 'build', 'specific', 'taper'])
  })

  it('adds a combined session from the build phase', () => {
    for (const week of plan.weeks.filter((item) => item.phase === 'build')) {
      expect(week.sessions.some((session) => session.type === 'stations')).toBe(true)
    }
  })

  it('uses compromised runs and simulations in the specific phase', () => {
    const types = plan.weeks
      .filter((week) => week.phase === 'specific')
      .flatMap((week) => week.sessions.map((session) => session.type))
    expect(types).toContain('compromised_run')
    expect(types).toContain('simulation')
  })

  it('prescribes the official division loads on race day', () => {
    const race = plan.weeks.at(-1)?.sessions.at(-1)
    const stations = race?.blocks.filter((block) => block.kind === 'station') ?? []
    expect(stations).toHaveLength(8)
    expect(stations).toContainEqual({
      kind: 'station',
      station: 'sled_push',
      repeats: 1,
      meters: 50,
      loadKg: 102,
    })
    expect(stations).toContainEqual({
      kind: 'station',
      station: 'wall_balls',
      repeats: 1,
      reps: 100,
      loadKg: 4,
    })
  })

  it('never prescribes more than the official station load', () => {
    const loads = plan.weeks
      .flatMap((week) => week.sessions)
      .flatMap((session) => session.blocks)
      .filter((block) => block.kind === 'station' && block.station === 'sled_push')
      .map((block) => (block.kind === 'station' ? (block.loadKg ?? 0) : 0))
    expect(Math.max(...loads)).toBeLessThanOrEqual(102)
    expect(Math.min(...loads)).toBeLessThan(102)
  })

  it('gives paces when the athlete has a mark', () => {
    const run = plan.weeks[0]?.sessions
      .flatMap((session) => session.blocks)
      .find((block) => block.kind === 'run')
    expect(run?.kind === 'run' ? run.pace : undefined).toBeDefined()
  })
})

describe('athletes without a mark', () => {
  const plan = generatePlan(inputFor({ ...base, mark: undefined }, '2027-03-13'))

  it('starts with a test session', () => {
    expect(plan.weeks[0]?.sessions.some((session) => session.type === 'test')).toBe(true)
  })

  it('guides sessions by effort, without paces', () => {
    const blocks = plan.weeks.flatMap((week) => week.sessions).flatMap((session) => session.blocks)
    expect(blocks.some((block) => block.kind === 'run' && block.pace !== undefined)).toBe(false)
  })
})

describe('continuous cycles', () => {
  const plan = generatePlan(inputFor({ ...base, level: 'beginner', weeklyRunMeters: 28_000 }))

  it('has no specific phase, taper or race', () => {
    expect(plan.weeks.every((week) => week.phase === 'base' || week.phase === 'build')).toBe(true)
    expect(plan.weeks.flatMap((week) => week.sessions).some((item) => item.type === 'race')).toBe(
      false,
    )
  })

  it('stops at the volume cap of the level', () => {
    expect(Math.max(...plan.weeks.map((week) => week.runMeters))).toBeLessThanOrEqual(30_000)
  })

  it('limits volume by the training days available', () => {
    const fewDays = generatePlan(inputFor({ ...base, level: 'advanced', weeklyRunMeters: 25_000 }))
    expect(Math.max(...fewDays.weeks.map((week) => week.runMeters))).toBeLessThanOrEqual(36_000)
  })

  it('keeps the current volume of an athlete above the cap', () => {
    const above = generatePlan(inputFor({ ...base, level: 'beginner', weeklyRunMeters: 40_000 }))
    expect(Math.max(...above.weeks.map((week) => week.runMeters))).toBeLessThanOrEqual(40_000)
  })
})

describe('start dates', () => {
  it('adds easy days that do not count when starting mid-week', () => {
    const plan = generatePlan(inputFor(base, '2027-03-13', '2026-11-11'))
    const first = plan.weeks[0]
    expect(first?.isPartial).toBe(true)
    expect(first?.sessions.every((session) => session.type === 'easy_run')).toBe(true)
    expect(plan.weeks[1]?.startDate).toBe('2026-11-16')
  })

  it('starts directly on a Monday', () => {
    const plan = generatePlan(inputFor(base, '2027-03-13'))
    expect(plan.weeks[0]?.isPartial).toBe(false)
    expect(plan.weeks[0]?.startDate).toBe('2026-11-09')
  })

  it('warns beginners with little time and keeps their base phase', () => {
    const plan = generatePlan(inputFor({ ...base, level: 'beginner' }, '2027-01-16'))
    expect(plan.warnings).toContain('short_timeline')
    expect(plan.weeks.filter((week) => week.phase === 'base')).toHaveLength(6)
  })

  it('avoids a hard Sunday before a Monday race', () => {
    const plan = generatePlan(inputFor(base, '2027-03-15'))
    const beforeRace = plan.weeks.at(-2)
    const sunday = beforeRace?.sessions.filter((session) => session.weekday === 'sunday') ?? []
    expect(sunday.some(isHardSession)).toBe(false)
  })
})

describe('invalid input', () => {
  const codeOf = (input: PlanInput): string | undefined => {
    try {
      generatePlan(input)
      return undefined
    } catch (error) {
      return error instanceof PlanInputError ? error.code : 'other'
    }
  }

  it('rejects a race that is too close or too far', () => {
    expect(codeOf(inputFor(base, '2026-12-01'))).toBe('race_too_soon')
    expect(codeOf(inputFor(base, '2028-01-01'))).toBe('race_too_far')
  })

  it('rejects too few training days', () => {
    const athlete = { ...base, availableDays: ['monday', 'friday'] as Weekday[] }
    expect(codeOf(inputFor(athlete))).toBe('too_few_days')
  })

  it('rejects an unknown or mismatched division', () => {
    const input = inputFor(base)
    expect(codeOf({ ...input, goal: { race: 'hyrox', divisionId: 'nope' } })).toBe(
      'unknown_division',
    )
    expect(codeOf({ ...input, goal: { race: 'hyrox', divisionId: 'singles_men' } })).toBe(
      'division_racer_mismatch',
    )
  })

  it('rejects race types that are not ready yet', () => {
    expect(codeOf({ ...inputFor(base), goal: { race: '10k' } })).toBe('unsupported_race')
  })

  it('rejects invalid dates and volumes', () => {
    expect(codeOf(inputFor(base, undefined, 'not-a-date'))).toBe('invalid_date')
    expect(codeOf(inputFor({ ...base, weeklyRunMeters: -1 }))).toBe('invalid_volume')
  })
})
