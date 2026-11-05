import { hyroxDivisions } from '../plans/hyrox-divisions'
import { hyroxSubstitutions } from '../plans/hyrox-substitutions'
import { hyroxTemplate as template } from '../plans/hyrox-template'
import { runningTemplate } from '../plans/running-template'
import type {
  Athlete,
  Block,
  Goal,
  IsoDate,
  Phase,
  Plan,
  PlanWarning,
  RaceType,
  RunBlock,
  Session,
  SessionType,
  StationBlock,
  StationId,
  Week,
  Weekday,
  Zone,
} from './model'
import { equivalentTimeSeconds, zonePace } from './paces'

export type PlanInputErrorCode =
  | 'unknown_division'
  | 'division_racer_mismatch'
  | 'too_few_days'
  | 'invalid_volume'
  | 'invalid_date'
  | 'race_too_soon'
  | 'race_too_far'
  | 'race_too_long'

export class PlanInputError extends Error {
  readonly code: PlanInputErrorCode

  constructor(code: PlanInputErrorCode) {
    super(code)
    this.name = 'PlanInputError'
    this.code = code
  }
}

export interface PlanInput {
  athlete: Athlete
  goal: Goal
  startDate: IsoDate
}

type Role =
  'long' | 'quality_a' | 'quality_b' | 'strength_heavy' | 'strength_general' | 'easy' | 'technique'

interface PlannedSession {
  role: Role
  type: SessionType
}

interface WeekSpec {
  number: number
  startDate: IsoDate
  phase: Phase
  isDeload: boolean
  targetMeters: number
  stationStep: number
  simulation: boolean
  avoidHardOn: Weekday[]
}

type Loads = (typeof hyroxDivisions.loads)['light']

/** What changes between race types. Everything else comes from the shared template. */
interface RaceRules {
  raceMeters: number
  raceZone: Zone
  volumeCapMeters: Record<Athlete['level'], number>
  longRunShare: number
  maxRepMeters: number
}

function rulesFor(race: RaceType): RaceRules {
  return race === 'hyrox'
    ? {
        raceMeters: hyroxDivisions.run.segments * hyroxDivisions.run.segmentMeters,
        raceZone: 'z4',
        volumeCapMeters: template.volumeCapMeters,
        longRunShare: template.longRunShare,
        maxRepMeters: 1000,
      }
    : runningTemplate[race]
}

const DAY_MS = 86_400_000
const TEST_METERS = 3000
const MIN_EASY_METERS = 2000
const DEFAULT_PACE = 390
const STATION_SECONDS = 180
const STRENGTH_SET_SECONDS = 150
const WARMUP_SECONDS = 600
const COOLDOWN_SECONDS = 300

const WEEKDAYS: readonly Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]
const LONG_RUN_DAYS: readonly Weekday[] = [
  'sunday',
  'saturday',
  'friday',
  'thursday',
  'wednesday',
  'tuesday',
  'monday',
]
const SESSION_DAYS: readonly Weekday[] = [
  'tuesday',
  'thursday',
  'wednesday',
  'friday',
  'saturday',
  'monday',
  'sunday',
]

const HARD_TYPES: readonly SessionType[] = [
  'long_run',
  'intervals',
  'tempo',
  'compromised_run',
  'simulation',
  'test',
  'race',
]

const TARGET_RPE: Partial<Record<SessionType, number>> = {
  easy_run: 3,
  long_run: 4,
  tempo: 7,
  intervals: 8,
  stations: 6,
  compromised_run: 8,
  simulation: 8,
  strength: 7,
  test: 9,
  race: 10,
}

/** Hard day rule from docs/MODELO-ENTRENAMIENTO.md, applied to one session. */
export function isHardSession(session: Session): boolean {
  if (HARD_TYPES.includes(session.type)) {
    return true
  }
  if (session.type === 'stations') {
    return session.blocks.some((block) => block.kind === 'run')
  }
  return (
    session.type === 'strength' &&
    session.blocks.some(
      (block) =>
        block.kind === 'strength' &&
        template.strength.heavy.some((item) => item.exercise === block.exercise),
    )
  )
}

function parseDate(date: IsoDate): number {
  const time = Date.parse(`${date}T00:00:00Z`)
  if (Number.isNaN(time)) {
    throw new PlanInputError('invalid_date')
  }
  return time
}

function formatDate(time: number): IsoDate {
  return new Date(time).toISOString().slice(0, 10)
}

function weekdayIndex(time: number): number {
  return (new Date(time).getUTCDay() + 6) % 7
}

function weekdayAt(index: number): Weekday {
  return WEEKDAYS[(index + 7) % 7] as Weekday
}

function floorTo(value: number, step: number): number {
  return Math.floor(value / step) * step
}

function roundTo(value: number, step: number): number {
  return Math.max(step, Math.round(value / step) * step)
}

function volumeCap(athlete: Athlete, rules: RaceRules): number {
  const fixedDays = athlete.fixedActivities.map((activity) => activity.weekday)
  const trainingDays = athlete.availableDays.filter((day) => !fixedDays.includes(day)).length
  const cap = Math.min(
    rules.volumeCapMeters[athlete.level],
    trainingDays * template.volumeCapPerTrainingDayMeters,
  )
  return Math.max(cap, athlete.weeklyRunMeters)
}

function nextNormalVolume(volume: number, cap: number): number {
  const increase = Math.max(volume * template.weeklyIncreaseFraction, template.weeklyIncreaseMeters)
  return Math.max(volume, Math.min(floorTo(volume + increase, 100), cap))
}

function phaseAllocation(trainingWeeks: number, athlete: Athlete): Record<Phase, number> {
  const ideal = template.phaseWeeks
  if (athlete.level === 'beginner') {
    const base = Math.min(ideal.base, trainingWeeks)
    const specific = Math.min(ideal.specific, trainingWeeks - base)
    return { base, build: trainingWeeks - base - specific, specific, taper: 0 }
  }
  const specific = Math.min(ideal.specific, trainingWeeks)
  const build = Math.min(ideal.build, trainingWeeks - specific)
  return { base: trainingWeeks - specific - build, build, specific, taper: 0 }
}

function phaseAt(index: number, allocation: Record<Phase, number>): Phase {
  if (index < allocation.base) {
    return 'base'
  }
  return index < allocation.base + allocation.build ? 'build' : 'specific'
}

function isDeloadIndex(index: number): boolean {
  return index % template.cycleWeeks === template.cycleWeeks - 1
}

function datedSpecs(
  athlete: Athlete,
  rules: RaceRules,
  firstMonday: number,
  raceTime: number,
): { specs: WeekSpec[]; trainingWeeks: number } {
  const raceMonday = raceTime - weekdayIndex(raceTime) * DAY_MS
  const totalWeeks = Math.round((raceMonday - firstMonday) / (7 * DAY_MS)) + 1
  if (totalWeeks < template.minWeeks) {
    throw new PlanInputError('race_too_soon')
  }
  if (totalWeeks > template.maxWeeks) {
    throw new PlanInputError('race_too_far')
  }

  const taperWeeks = totalWeeks >= template.longTaperMinWeeks ? 2 : 1
  const trainingWeeks = totalWeeks - taperWeeks
  const allocation = phaseAllocation(trainingWeeks, athlete)
  const cap = volumeCap(athlete, rules)
  const specificEnd = trainingWeeks - 1
  const lastSteps = template.stationSteps.length - 1

  const simulationWeeks = new Set(
    Array.from({ length: trainingWeeks }, (_, index) => index)
      .filter((index) => phaseAt(index, allocation) === 'specific' && !isDeloadIndex(index))
      .slice(-2),
  )

  const specs: WeekSpec[] = []
  let normal = floorTo(Math.max(athlete.weeklyRunMeters, template.minWeeklyRunMeters), 100)
  for (let index = 0; index <= specificEnd; index += 1) {
    const isDeload = isDeloadIndex(index)
    if (index > 0 && !isDeload) {
      normal = nextNormalVolume(normal, cap)
    }
    specs.push({
      number: index + 1,
      startDate: formatDate(firstMonday + index * 7 * DAY_MS),
      phase: phaseAt(index, allocation),
      isDeload,
      targetMeters: isDeload ? floorTo(normal * template.deloadFactor, 100) : normal,
      stationStep: Math.min(
        lastSteps,
        Math.floor((index / trainingWeeks) * template.stationSteps.length),
      ),
      simulation: simulationWeeks.has(index),
      avoidHardOn: [],
    })
  }

  for (let index = trainingWeeks; index < totalWeeks - 1; index += 1) {
    specs.push({
      number: index + 1,
      startDate: formatDate(firstMonday + index * 7 * DAY_MS),
      phase: 'taper',
      isDeload: false,
      targetMeters: floorTo(normal * template.preRaceTaperFactor, 100),
      stationStep: lastSteps,
      simulation: false,
      avoidHardOn: weekdayIndex(raceTime) === 0 ? ['sunday'] : [],
    })
  }
  return { specs, trainingWeeks }
}

function continuousSpecs(athlete: Athlete, rules: RaceRules, firstMonday: number): WeekSpec[] {
  const cap = volumeCap(athlete, rules)
  const specs: WeekSpec[] = []
  let normal = floorTo(Math.max(athlete.weeklyRunMeters, template.minWeeklyRunMeters), 100)
  for (let index = 0; index < template.continuousWeeks; index += 1) {
    const isDeload = isDeloadIndex(index)
    if (index > 0 && !isDeload) {
      normal = nextNormalVolume(normal, cap)
    }
    specs.push({
      number: index + 1,
      startDate: formatDate(firstMonday + index * 7 * DAY_MS),
      phase: index < template.cycleWeeks ? 'base' : 'build',
      isDeload,
      targetMeters: isDeload ? floorTo(normal * template.deloadFactor, 100) : normal,
      stationStep: Math.min(
        template.continuousMaxStationStep,
        Math.floor(index / template.cycleWeeks),
      ),
      simulation: false,
      avoidHardOn: [],
    })
  }
  return specs
}

function plannedSessions(
  spec: WeekSpec,
  athlete: Athlete,
  trainingDays: number,
  isHyrox: boolean,
): PlannedSession[] {
  const needsTest = athlete.mark === undefined && spec.number === 1
  const qualityType = (): SessionType => {
    if (needsTest) {
      return 'test'
    }
    if (spec.phase === 'taper') {
      return 'intervals'
    }
    if (spec.phase === 'base') {
      return 'tempo'
    }
    if (!isHyrox) {
      return 'intervals'
    }
    if (spec.phase === 'build') {
      return 'stations'
    }
    return spec.simulation ? 'simulation' : 'compromised_run'
  }

  const hasSecondQuality =
    trainingDays >= 4 && !spec.isDeload && (spec.phase === 'build' || spec.phase === 'specific')
  const hasSecondStrength =
    !spec.isDeload && spec.phase !== 'taper' && (isHyrox || trainingDays >= 5)

  const planned: PlannedSession[] = [
    { role: 'long', type: 'long_run' },
    { role: 'quality_a', type: qualityType() },
    { role: 'strength_heavy', type: 'strength' },
    { role: 'easy', type: 'easy_run' },
  ]
  if (isHyrox && spec.phase === 'base') {
    planned.push({ role: 'technique', type: 'stations' })
  }
  if (hasSecondQuality) {
    planned.push({ role: 'quality_b', type: isHyrox ? 'intervals' : 'tempo' })
  }
  if (trainingDays >= 5) {
    planned.push({ role: 'easy', type: 'easy_run' })
  }
  if (hasSecondStrength) {
    planned.push({ role: 'strength_general', type: 'strength' })
  }
  return planned
}

const isHardRole = (item: PlannedSession): boolean =>
  item.role === 'long' ||
  item.role === 'quality_a' ||
  item.role === 'quality_b' ||
  item.role === 'strength_heavy'

const isRunRole = (item: PlannedSession): boolean =>
  item.role === 'long' ||
  item.role === 'quality_a' ||
  item.role === 'quality_b' ||
  item.role === 'easy'

function layoutWeek(
  planned: PlannedSession[],
  days: readonly Weekday[],
  fixedDays: readonly Weekday[],
  avoidHardOn: readonly Weekday[],
): Map<Weekday, PlannedSession[]> {
  const layout = new Map<Weekday, PlannedSession[]>()
  const hardDays = new Set<Weekday>(fixedDays)

  const neighbours = (day: Weekday): [Weekday, Weekday] => {
    const index = WEEKDAYS.indexOf(day)
    return [weekdayAt(index - 1), weekdayAt(index + 1)]
  }
  const touchesHard = (day: Weekday): boolean => neighbours(day).some((item) => hardDays.has(item))
  const isFree = (day: Weekday): boolean => !layout.has(day)
  const hasIntervals = (day: Weekday): boolean =>
    (layout.get(day) ?? []).some((item) => item.type === 'intervals')
  const hasHeavyStrength = (day: Weekday): boolean =>
    (layout.get(day) ?? []).some((item) => item.role === 'strength_heavy')

  const breaksStrengthRule = (item: PlannedSession, day: Weekday): boolean => {
    const [previous, next] = neighbours(day)
    if (item.role === 'strength_heavy') {
      return hasIntervals(next)
    }
    return item.type === 'intervals' && hasHeavyStrength(previous)
  }
  const canStack = (item: PlannedSession, day: Weekday): boolean => {
    const sessions = layout.get(day) ?? []
    const [first] = sessions
    return (
      sessions.length === 1 &&
      first !== undefined &&
      first.role !== 'long' &&
      !(isRunRole(first) && isRunRole(item))
    )
  }
  const place = (item: PlannedSession, day: Weekday): void => {
    layout.set(day, [...(layout.get(day) ?? []), item])
    if (isHardRole(item)) {
      hardDays.add(day)
    }
  }

  const stackOnHardDay = (item: PlannedSession, ordered: readonly Weekday[]): boolean => {
    const day = ordered.find(
      (candidate) =>
        hardDays.has(candidate) &&
        canStack(item, candidate) &&
        !breaksStrengthRule(item, candidate),
    )
    if (day === undefined) {
      return false
    }
    place(item, day)
    return true
  }

  for (const item of planned) {
    const search = item.role === 'long' ? LONG_RUN_DAYS : SESSION_DAYS
    const ordered = search.filter((day) => days.includes(day))

    if (isHardRole(item)) {
      if (item.role === 'strength_heavy' && days.length <= 4 && stackOnHardDay(item, ordered)) {
        continue
      }
      const day = ordered.find(
        (candidate) =>
          isFree(candidate) &&
          !touchesHard(candidate) &&
          !avoidHardOn.includes(candidate) &&
          !breaksStrengthRule(item, candidate),
      )
      if (day !== undefined) {
        place(item, day)
      } else {
        stackOnHardDay(item, ordered)
      }
      continue
    }

    const day =
      ordered.find(isFree) ??
      (item.role === 'easy' ? undefined : ordered.find((candidate) => canStack(item, candidate)))
    if (day !== undefined) {
      place(item, day)
    }
  }
  return layout
}

function stationWork(id: StationId, step: { distance: number; load: number }): StationBlock {
  const station = hyroxDivisions.stations.find((item) => item.id === id)
  if (station === undefined) {
    throw new RangeError(`Unknown station: ${id}`)
  }
  return station.work.kind === 'distance'
    ? {
        kind: 'station',
        station: id,
        repeats: 1,
        meters: roundTo(station.work.meters * step.distance, 5),
      }
    : {
        kind: 'station',
        station: id,
        repeats: 1,
        reps: roundTo(station.work.reps * step.distance, 5),
      }
}

function stationLoad(id: StationId, loads: Loads): number | undefined {
  switch (id) {
    case 'sled_push':
      return loads.sledPushKg
    case 'sled_pull':
      return loads.sledPullKg
    case 'farmers_carry':
      return loads.farmersCarryKgPerHand
    case 'sandbag_lunges':
      return loads.sandbagLungesKg
    case 'wall_balls':
      return loads.wallBallKg
    default:
      return undefined
  }
}

function stationBlock(
  id: StationId,
  step: { distance: number; load: number },
  loads: Loads,
): StationBlock {
  const block = stationWork(id, step)
  const official = stationLoad(id, loads)
  if (official === undefined) {
    return block
  }
  const scaled = official * step.load
  return { ...block, loadKg: roundTo(scaled, scaled >= 10 ? 2 : 1) }
}

/** Station block for training: swaps the station when the athlete lacks the equipment. */
function trainingStationBlock(
  athlete: Athlete,
  id: StationId,
  step: { distance: number; load: number },
  loads: Loads,
): StationBlock {
  const block = stationBlock(id, step, loads)
  const option = hyroxSubstitutions[id]?.find(
    (item) => item.requires === undefined || athlete.equipment.includes(item.requires),
  )
  if (athlete.equipment.includes(id) || option === undefined) {
    return block
  }
  const amount = roundTo((block.meters ?? block.reps ?? 0) * option.perOfficial, 5)
  const substituted: StationBlock = {
    kind: 'station',
    station: id,
    repeats: block.repeats,
    substitute: option.exercise,
    ...(option.unit === 'meters' ? { meters: amount } : { reps: amount }),
  }
  return option.keepLoad && block.loadKg !== undefined
    ? { ...substituted, loadKg: block.loadKg }
    : substituted
}

function rotatingStations(weekNumber: number, count: number): StationId[] {
  const all = hyroxDivisions.stations.map((station) => station.id)
  const start = (weekNumber * count) % all.length
  return Array.from({ length: count }, (_, index) => all[(start + index) % all.length] as StationId)
}

function runBlock(athlete: Athlete, meters: number, zone: Zone, repeats = 1): RunBlock {
  const block: RunBlock = { kind: 'run', repeats, meters, zone }
  return athlete.mark === undefined ? block : { ...block, pace: zonePace(athlete.mark, zone) }
}

function intervalBlocks(athlete: Athlete, meters: number, maxRepMeters: number): Block[] {
  const options = [
    { repMeters: 2000, minMeters: 8000 },
    { repMeters: 1000, minMeters: 4000 },
    { repMeters: 800, minMeters: 1600 },
  ]
  const repMeters =
    options.find((item) => item.repMeters <= maxRepMeters && meters >= item.minMeters)?.repMeters ??
    400
  const repeats = Math.max(1, Math.floor(meters / repMeters))
  const zone: Zone = repMeters >= 1000 ? 'z4' : 'z5'
  return [{ ...runBlock(athlete, repMeters, zone, repeats), recovery: { meters: repMeters / 2 } }]
}

function combinedBlocks(
  athlete: Athlete,
  meters: number,
  stations: StationId[],
  step: { distance: number; load: number },
  loads: Loads,
  zone: Zone,
): Block[] {
  const segment = Math.min(1000, Math.max(200, floorTo(meters / stations.length, 100)))
  return stations.flatMap((id) => [
    runBlock(athlete, segment, zone),
    trainingStationBlock(athlete, id, step, loads),
  ])
}

function withWarmup(blocks: Block[]): Block[] {
  return [
    { kind: 'warmup', seconds: WARMUP_SECONDS },
    ...blocks,
    { kind: 'cooldown', seconds: COOLDOWN_SECONDS },
  ]
}

function runMetersOf(blocks: readonly Block[]): number {
  return blocks.reduce(
    (total, block) => (block.kind === 'run' ? total + block.meters * block.repeats : total),
    0,
  )
}

function estimateSeconds(blocks: readonly Block[]): number {
  const seconds = blocks.reduce((total, block) => {
    switch (block.kind) {
      case 'warmup':
      case 'cooldown':
        return total + block.seconds
      case 'station':
        return total + block.repeats * STATION_SECONDS
      case 'strength':
        return total + block.sets * STRENGTH_SET_SECONDS
      case 'run': {
        const pace =
          block.pace === undefined ? DEFAULT_PACE : (block.pace.fastest + block.pace.slowest) / 2
        const recovery =
          block.recovery !== undefined && 'meters' in block.recovery ? block.recovery.meters : 0
        return total + (block.repeats * (block.meters + recovery) * pace) / 1000
      }
    }
  }, 0)
  return Math.round(seconds)
}

function toSession(type: SessionType, weekday: Weekday, blocks: Block[]): Session {
  const targetRpe = TARGET_RPE[type]
  const session: Session = { type, weekday, blocks, estimatedSeconds: estimateSeconds(blocks) }
  return targetRpe === undefined ? session : { ...session, targetRpe }
}

function qualityBlocks(
  item: PlannedSession,
  meters: number,
  spec: WeekSpec,
  athlete: Athlete,
  rules: RaceRules,
  loads: Loads | null,
): Block[] {
  if (item.type === 'test') {
    return withWarmup([runBlock(athlete, TEST_METERS, 'z5')])
  }
  if (item.type === 'tempo') {
    return withWarmup([runBlock(athlete, Math.max(200, floorTo(meters, 100)), 'z3')])
  }
  if (loads === null || item.type === 'intervals') {
    return withWarmup(intervalBlocks(athlete, meters, rules.maxRepMeters))
  }
  const step = template.stationSteps[spec.stationStep] ?? { distance: 1, load: 1 }
  const stationCount = spec.isDeload ? 2 : 4
  const stations = rotatingStations(spec.number, stationCount)
  const zone: Zone =
    item.type === 'simulation' ? 'z4' : item.type === 'compromised_run' ? 'z3' : 'z2'
  return withWarmup(combinedBlocks(athlete, meters, stations, step, loads, zone))
}

function buildWeek(
  spec: WeekSpec,
  input: PlanInput,
  rules: RaceRules,
  loads: Loads | null,
  days: Weekday[],
): Week {
  const { athlete } = input
  const fixedDays = athlete.fixedActivities.map((activity) => activity.weekday)
  const planned = plannedSessions(spec, athlete, days.length, loads !== null)
  const layout = layoutWeek(planned, days, fixedDays, spec.avoidHardOn)
  const placed = WEEKDAYS.flatMap((day) => (layout.get(day) ?? []).map((item) => ({ day, item })))

  const qualities = placed.filter(
    ({ item }) => item.role === 'quality_a' || item.role === 'quality_b',
  )
  // Lighter weeks drop a quality session, but the one left must not grow to fill its place.
  const qualitySessions = spec.isDeload || spec.phase === 'taper' ? 2 : qualities.length
  const qualityMeters = (spec.targetMeters * template.qualityShare) / Math.max(1, qualitySessions)
  const blocksOf = new Map<PlannedSession, Block[]>(
    qualities.map(({ item }) => [
      item,
      qualityBlocks(item, qualityMeters, spec, athlete, rules, loads),
    ]),
  )

  const usedMeters = [...blocksOf.values()].reduce(
    (total, blocks) => total + runMetersOf(blocks),
    0,
  )
  const remaining = Math.max(0, spec.targetMeters - usedMeters)
  const long = placed.find(({ item }) => item.role === 'long')
  const easy = placed.filter(({ item }) => item.role === 'easy')

  const longShare = Math.max(spec.targetMeters * rules.longRunShare, remaining / (1 + easy.length))
  const longMeters =
    long === undefined
      ? 0
      : easy.length === 0
        ? floorTo(remaining, 100)
        : Math.min(floorTo(remaining, 100), Math.ceil(longShare / 100) * 100)
  if (long !== undefined && longMeters > 0) {
    blocksOf.set(long.item, [runBlock(athlete, longMeters, 'z2')])
  }
  const easyTotal = floorTo(remaining - longMeters, 100)
  const easyMeters = floorTo(easyTotal / Math.max(1, easy.length), 100)
  for (const [index, { item }] of easy.entries()) {
    const isLast = index === easy.length - 1
    const meters = isLast ? easyTotal - easyMeters * index : easyMeters
    if (meters > 0) {
      blocksOf.set(item, [runBlock(athlete, meters, 'z2')])
    }
  }

  const sessions = placed.flatMap(({ day, item }): Session[] => {
    if (item.role === 'strength_heavy' || item.role === 'strength_general') {
      const group =
        item.role === 'strength_heavy' ? template.strength.heavy : template.strength.general
      return [
        toSession(
          'strength',
          day,
          group.map((exercise) => ({ kind: 'strength', ...exercise })),
        ),
      ]
    }
    if (item.role === 'technique' && loads !== null) {
      const step = template.stationSteps[spec.stationStep] ?? { distance: 1, load: 1 }
      const stations = rotatingStations(spec.number, spec.isDeload ? 2 : 4)
      return [
        toSession(
          'stations',
          day,
          withWarmup(stations.map((id) => trainingStationBlock(athlete, id, step, loads))),
        ),
      ]
    }
    const blocks = blocksOf.get(item)
    return blocks === undefined ? [] : [toSession(item.type, day, blocks)]
  })

  return {
    number: spec.number,
    startDate: spec.startDate,
    phase: spec.phase,
    isDeload: spec.isDeload,
    isPartial: false,
    runMeters: sessions.reduce((total, session) => total + runMetersOf(session.blocks), 0),
    sessions,
  }
}

function partialWeek(startTime: number, athlete: Athlete, days: readonly Weekday[]): Week {
  const firstDay = weekdayIndex(startTime)
  const remaining = WEEKDAYS.slice(firstDay).filter((day) => days.includes(day))
  const sessions = remaining
    .slice(0, 2)
    .map((day) => toSession('easy_run', day, [runBlock(athlete, 2000, 'z2')]))
  return {
    number: 0,
    startDate: formatDate(startTime),
    phase: 'base',
    isDeload: false,
    isPartial: true,
    runMeters: sessions.reduce((total, session) => total + runMetersOf(session.blocks), 0),
    sessions,
  }
}

function hyroxRaceBlocks(loads: Loads): Block[] {
  const fullStep = { distance: 1, load: 1 }
  return hyroxDivisions.stations.flatMap((station): Block[] => [
    { kind: 'run', repeats: 1, meters: hyroxDivisions.run.segmentMeters, zone: 'z4' },
    stationBlock(station.id, fullStep, loads),
  ])
}

function runningRaceBlocks(athlete: Athlete, rules: RaceRules): Block[] {
  const block: RunBlock = {
    kind: 'run',
    repeats: 1,
    meters: rules.raceMeters,
    zone: rules.raceZone,
  }
  if (athlete.mark === undefined) {
    return [block]
  }
  const pace = equivalentTimeSeconds(athlete.mark, rules.raceMeters) / (rules.raceMeters / 1000)
  return [{ ...block, pace: { fastest: pace * 0.99, slowest: pace * 1.01 } }]
}

/** Largest volume the race week may reach under the weekly rise rule. */
function raceWeekLimit(lastNormalMeters: number): number {
  return (
    lastNormalMeters +
    Math.max(lastNormalMeters * template.weeklyIncreaseFraction, template.weeklyIncreaseMeters)
  )
}

function raceWeek(
  number: number,
  raceTime: number,
  peakMeters: number,
  lastNormalMeters: number,
  input: PlanInput,
  rules: RaceRules,
  loads: Loads | null,
  days: readonly Weekday[],
): Week {
  const { athlete } = input
  const raceDay = weekdayIndex(raceTime)
  const race = toSession(
    'race',
    weekdayAt(raceDay),
    loads === null ? runningRaceBlocks(athlete, rules) : hyroxRaceBlocks(loads),
  )

  const easyMeters = floorTo(
    Math.min(
      peakMeters * template.raceWeekFactor - rules.raceMeters,
      raceWeekLimit(lastNormalMeters) - rules.raceMeters,
      template.raceWeekEasyMaxMeters,
    ),
    100,
  )
  const easyDay = WEEKDAYS.slice(0, Math.max(0, raceDay - 1)).find((day) => days.includes(day))
  const sessions =
    easyMeters >= MIN_EASY_METERS && easyDay !== undefined
      ? [toSession('easy_run', easyDay, [runBlock(athlete, easyMeters, 'z2')]), race]
      : [race]

  return {
    number,
    startDate: formatDate(raceTime - raceDay * DAY_MS),
    phase: 'taper',
    isDeload: false,
    isPartial: false,
    runMeters: sessions.reduce((total, session) => total + runMetersOf(session.blocks), 0),
    sessions,
  }
}

function resolveLoads(athlete: Athlete, goal: Goal): Loads {
  const division = hyroxDivisions.divisions.find((item) => item.id === goal.divisionId)
  if (division === undefined) {
    throw new PlanInputError('unknown_division')
  }
  const tier = athlete.racer === undefined ? undefined : division.loadByRacer[athlete.racer]
  if (tier === undefined) {
    throw new PlanInputError('division_racer_mismatch')
  }
  return hyroxDivisions.loads[tier]
}

/** Builds a plan for HYROX or a running race: dated, or continuous cycles with no date. */
export function generatePlan(input: PlanInput): Plan {
  const { athlete, goal, startDate } = input
  if (!(athlete.weeklyRunMeters >= 0)) {
    throw new PlanInputError('invalid_volume')
  }
  const rules = rulesFor(goal.race)
  const loads = goal.race === 'hyrox' ? resolveLoads(athlete, goal) : null
  const fixedDays = athlete.fixedActivities.map((activity) => activity.weekday)
  const days = WEEKDAYS.filter(
    (day) => athlete.availableDays.includes(day) && !fixedDays.includes(day),
  )
  if (days.length < template.minTrainingDays) {
    throw new PlanInputError('too_few_days')
  }

  const startTime = parseDate(startDate)
  const startIndex = weekdayIndex(startTime)
  const firstMonday = startIndex === 0 ? startTime : startTime + (7 - startIndex) * DAY_MS

  const weeks: Week[] = startIndex === 0 ? [] : [partialWeek(startTime, athlete, days)]
  const warnings: PlanWarning[] = []

  if (goal.date === undefined) {
    const specs = continuousSpecs(athlete, rules, firstMonday)
    weeks.push(...specs.map((spec) => buildWeek(spec, input, rules, loads, days)))
    return { goal, weeks, warnings }
  }

  const raceTime = parseDate(goal.date)
  const { specs, trainingWeeks } = datedSpecs(athlete, rules, firstMonday, raceTime)
  const lastNormalMeters = specs.filter((spec) => !spec.isDeload).at(-1)?.targetMeters ?? 0
  if (rules.raceMeters > raceWeekLimit(lastNormalMeters)) {
    throw new PlanInputError('race_too_long')
  }
  if (athlete.level === 'beginner' && trainingWeeks < template.shortPlanTrainingWeeks) {
    warnings.push('short_timeline')
  }
  weeks.push(...specs.map((spec) => buildWeek(spec, input, rules, loads, days)))

  const peakMeters = Math.max(...specs.map((spec) => spec.targetMeters))
  const lastNumber = specs.at(-1)?.number ?? 0
  weeks.push(
    raceWeek(lastNumber + 1, raceTime, peakMeters, lastNormalMeters, input, rules, loads, days),
  )
  return { goal, weeks, warnings }
}
