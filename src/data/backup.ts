import { z } from 'zod'
import type { Athlete, IsoDate, LoggedSession, Plan, Simulation } from '../engine/model'

/** The plan in use, with the answers that produced it so it can be regenerated. */
export interface ActivePlan {
  /** Missing in plans from older versions. */
  planId?: string
  athlete: Athlete
  startDate: IsoDate
  plan: Plan
}

export interface Backup {
  active: ActivePlan | null
  logs: LoggedSession[]
  simulations: Simulation[]
}

const BACKUP_VERSION = 1

const isoDate = z.iso.date()

const logSchema = z.strictObject({
  id: z.string().min(1),
  date: isoDate,
  type: z.string().min(1),
  status: z.enum(['done', 'partial', 'skipped']),
  durationSeconds: z.number().positive().optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
})

const simulationSchema = z.strictObject({
  id: z.string().min(1),
  date: isoDate,
  divisionId: z.string().optional(),
  splits: z.array(z.strictObject({ segment: z.string().min(1), seconds: z.number().min(0) })),
  totalSeconds: z.number().min(0),
})

const activeSchema = z.object({
  planId: z.string().optional(),
  athlete: z.looseObject({ level: z.string(), racer: z.string() }),
  startDate: isoDate,
  plan: z.looseObject({
    goal: z.looseObject({ race: z.string() }),
    warnings: z.array(z.string()),
    weeks: z
      .array(z.looseObject({ startDate: isoDate, sessions: z.array(z.looseObject({})) }))
      .min(1),
  }),
})

const backupSchema = z.strictObject({
  app: z.literal('openhybrid'),
  version: z.literal(BACKUP_VERSION),
  active: activeSchema.nullable(),
  logs: z.array(logSchema),
  simulations: z.array(simulationSchema).default([]),
})

export function serializeBackup(backup: Backup): string {
  return JSON.stringify({ app: 'openhybrid', version: BACKUP_VERSION, ...backup }, null, 2)
}

/** Reads a backup file. Returns undefined when it is not a valid backup. */
export function parseBackup(text: string): Backup | undefined {
  try {
    const parsed = backupSchema.safeParse(JSON.parse(text))
    return parsed.success
      ? {
          active: parsed.data.active as ActivePlan | null,
          logs: parsed.data.logs as LoggedSession[],
          simulations: parsed.data.simulations,
        }
      : undefined
  } catch {
    return undefined
  }
}
