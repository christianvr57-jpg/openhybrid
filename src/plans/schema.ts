import { z } from 'zod'

const stationIds = [
  'ski_erg',
  'sled_push',
  'sled_pull',
  'burpee_broad_jumps',
  'rowing',
  'farmers_carry',
  'sandbag_lunges',
  'wall_balls',
] as const

const loadTier = z.enum(['light', 'medium', 'heavy'])

const stationLoads = z.strictObject({
  sledPushKg: z.number().positive(),
  sledPullKg: z.number().positive(),
  farmersCarryKgPerHand: z.number().positive(),
  sandbagLungesKg: z.number().positive(),
  wallBallKg: z.number().positive(),
})

const station = z.strictObject({
  id: z.enum(stationIds),
  work: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('distance'), meters: z.number().positive() }),
    z.strictObject({ kind: z.literal('reps'), reps: z.number().int().positive() }),
  ]),
})

const division = z.strictObject({
  id: z.string().min(1),
  format: z.enum(['singles', 'doubles', 'relay']),
  loadByRacer: z
    .strictObject({ women: loadTier.optional(), men: loadTier.optional() })
    .refine((racers) => racers.women !== undefined || racers.men !== undefined, {
      message: 'A division needs at least one racer type',
    }),
})

export const hyroxDivisionsSchema = z.strictObject({
  season: z.string().regex(/^\d{4}\/\d{2}$/),
  verifiedOn: z.iso.date(),
  sources: z.array(z.url()).min(1),
  run: z.strictObject({
    segments: z.number().int().positive(),
    segmentMeters: z.number().positive(),
  }),
  stations: z
    .array(station)
    .refine((list) => list.map((item) => item.id).join() === stationIds.join(), {
      message: 'Stations must appear once each, in race order',
    }),
  loads: z.strictObject({ light: stationLoads, medium: stationLoads, heavy: stationLoads }),
  wallBallTargetMeters: z.strictObject({
    women: z.number().positive(),
    men: z.number().positive(),
  }),
  divisions: z
    .array(division)
    .min(1)
    .refine((list) => new Set(list.map((item) => item.id)).size === list.length, {
      message: 'Division ids must be unique',
    }),
})

export type HyroxDivisions = z.infer<typeof hyroxDivisionsSchema>

const fraction = z.number().positive().max(1)

const strengthExercise = z.strictObject({
  exercise: z.string().min(1),
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
  rir: z.number().int().nonnegative(),
})

export const hyroxTemplateSchema = z.strictObject({
  minWeeks: z.number().int().positive(),
  maxWeeks: z.number().int().positive(),
  minTrainingDays: z.number().int().min(1).max(7),
  continuousWeeks: z.number().int().positive(),
  cycleWeeks: z.number().int().min(2),
  deloadFactor: fraction,
  weeklyIncreaseFraction: fraction,
  weeklyIncreaseMeters: z.number().positive(),
  minWeeklyRunMeters: z.number().positive(),
  volumeCapMeters: z.strictObject({
    beginner: z.number().positive(),
    intermediate: z.number().positive(),
    advanced: z.number().positive(),
  }),
  volumeCapPerTrainingDayMeters: z.number().positive(),
  preRaceTaperFactor: fraction,
  raceWeekFactor: fraction,
  raceWeekEasyMaxMeters: z.number().positive(),
  longTaperMinWeeks: z.number().int().positive(),
  phaseWeeks: z.strictObject({
    base: z.number().int().positive(),
    build: z.number().int().positive(),
    specific: z.number().int().positive(),
  }),
  shortPlanTrainingWeeks: z.number().int().positive(),
  qualityShare: fraction,
  longRunShare: fraction,
  stationSteps: z.array(z.strictObject({ distance: fraction, load: fraction })).min(1),
  continuousMaxStationStep: z.number().int().nonnegative(),
  strength: z.strictObject({
    heavy: z.array(strengthExercise).min(1),
    general: z.array(strengthExercise).min(1),
  }),
})

export type HyroxTemplate = z.infer<typeof hyroxTemplateSchema>

const substitution = z.strictObject({
  exercise: z.string().min(1),
  /** Station whose equipment this option needs. Missing means no special equipment. */
  requires: z.enum(stationIds).optional(),
  unit: z.enum(['meters', 'reps']),
  /** Amount of the substitute for each official meter or repetition. */
  perOfficial: z.number().positive(),
  keepLoad: z.boolean(),
})

export const hyroxSubstitutionsSchema = z.partialRecord(
  z.enum(stationIds),
  z
    .array(substitution)
    .min(1)
    .refine((options) => options.at(-1)?.requires === undefined, {
      message: 'The last option must not need special equipment',
    }),
)

export type HyroxSubstitutions = z.infer<typeof hyroxSubstitutionsSchema>

const share = z.number().positive().max(1)

export const hyroxSplitsSchema = z
  .strictObject({
    runShare: share,
    roxzoneShare: share,
    stationShares: z.record(z.enum(stationIds), share),
  })
  .refine(
    ({ runShare, roxzoneShare, stationShares }) => {
      const stations = Object.values(stationShares).reduce((total, item) => total + item, 0)
      return Math.abs(runShare + roxzoneShare + stations - 1) < 0.001
    },
    { message: 'Shares must add up to 1' },
  )

const runningRace = z.strictObject({
  raceMeters: z.number().positive(),
  raceZone: z.enum(['z1', 'z2', 'z3', 'z4', 'z5']),
  volumeCapMeters: z.strictObject({
    beginner: z.number().positive(),
    intermediate: z.number().positive(),
    advanced: z.number().positive(),
  }),
  longRunShare: share,
  maxRepMeters: z.number().positive(),
})

export const runningTemplateSchema = z.strictObject({
  '5k': runningRace,
  '10k': runningRace,
  '21k': runningRace,
})
