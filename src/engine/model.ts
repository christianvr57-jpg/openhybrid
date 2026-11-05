/** ISO 8601 calendar date, e.g. 2026-11-05. */
export type IsoDate = string

export type Level = 'beginner' | 'intermediate' | 'advanced'
export type RaceType = '5k' | '10k' | '21k' | 'hyrox'
export type Racer = 'women' | 'men'
export type Phase = 'base' | 'build' | 'specific' | 'taper'
export type Zone = 'z1' | 'z2' | 'z3' | 'z4' | 'z5'

export type Weekday =
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export type StationId =
  | 'ski_erg'
  | 'sled_push'
  | 'sled_pull'
  | 'burpee_broad_jumps'
  | 'rowing'
  | 'farmers_carry'
  | 'sandbag_lunges'
  | 'wall_balls'

export type SessionType =
  | 'easy_run'
  | 'long_run'
  | 'intervals'
  | 'tempo'
  | 'strength'
  | 'stations'
  | 'compromised_run'
  | 'simulation'
  | 'test'
  | 'race'
  | 'rest'

/** A race result chosen by the athlete. It sets the training paces. */
export interface RaceMark {
  distanceMeters: number
  timeSeconds: number
}

/** Pace range in seconds per kilometre. `fastest` is the lower number. */
export interface PaceRange {
  fastest: number
  slowest: number
}

/** Another sport on a fixed day. It counts as a hard day. */
export interface FixedActivity {
  name: string
  weekday: Weekday
}

export interface Athlete {
  level: Level
  racer: Racer
  /** Missing when the athlete has no mark: the plan starts with a test session. */
  mark?: RaceMark
  /** Only for comparing progress and targets. It never sets paces. */
  hyroxTimeSeconds?: number
  weeklyRunMeters: number
  availableDays: Weekday[]
  fixedActivities: FixedActivity[]
  /** Stations the athlete can train with real equipment. */
  equipment: StationId[]
}

export interface Goal {
  race: RaceType
  /** Missing for continuous cycles with no dated race. */
  date?: IsoDate
  /** Division id from `src/plans/hyrox-divisions.json`, for HYROX goals. */
  divisionId?: string
  /** Only compared with the mark. It never sets paces. */
  targetTimeSeconds?: number
}

export type Recovery = { meters: number } | { seconds: number }

export interface WarmupBlock {
  kind: 'warmup'
  seconds: number
}

export interface CooldownBlock {
  kind: 'cooldown'
  seconds: number
}

export interface RunBlock {
  kind: 'run'
  repeats: number
  meters: number
  zone: Zone
  /** Missing while the athlete has no mark: the session is guided by RPE. */
  pace?: PaceRange
  recovery?: Recovery
}

export interface StationBlock {
  kind: 'station'
  station: StationId
  repeats: number
  meters?: number
  reps?: number
  /** Reference load. Farmers carry is per hand. */
  loadKg?: number
  /** Exercise id used instead of the station when the equipment is missing. */
  substitute?: string
}

export interface StrengthBlock {
  kind: 'strength'
  /** Exercise id, translated in the interface. */
  exercise: string
  sets: number
  reps: number
  /** Target repetitions in reserve. */
  rir: number
}

export type Block = WarmupBlock | CooldownBlock | RunBlock | StationBlock | StrengthBlock

export interface Session {
  type: SessionType
  weekday: Weekday
  blocks: Block[]
  estimatedSeconds: number
  /** Target effort from 1 to 10. */
  targetRpe?: number
}

export interface Week {
  number: number
  startDate: IsoDate
  phase: Phase
  isDeload: boolean
  /** Easy days before the first Monday. They do not count for volume rules. */
  isPartial: boolean
  runMeters: number
  sessions: Session[]
}

export type PlanWarning = 'short_timeline'

export interface Plan {
  goal: Goal
  weeks: Week[]
  warnings: PlanWarning[]
}

export type LogStatus = 'done' | 'partial' | 'skipped'

export interface LoggedSession {
  /** Date and position of the session on that day. Logging again replaces it. */
  id: string
  date: IsoDate
  type: SessionType
  status: LogStatus
  durationSeconds?: number
  /** Perceived effort from 1 to 10. */
  rpe?: number
  notes?: string
}

export interface SimulationSplit {
  /** `run_1` to `run_8`, or a station id. Transitions count inside each segment. */
  segment: string
  seconds: number
}

export interface Simulation {
  id: string
  date: IsoDate
  /** Records are only compared within a division, because the weights differ. */
  divisionId?: string
  splits: SimulationSplit[]
  totalSeconds: number
}
