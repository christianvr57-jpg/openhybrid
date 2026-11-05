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
