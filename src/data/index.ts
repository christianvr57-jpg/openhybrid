import Dexie, { type EntityTable } from 'dexie'
import type { Athlete, IsoDate, Plan } from '../engine/model'

const ACTIVE_ID = 'active'

/** The plan in use, with the answers that produced it so it can be regenerated. */
export interface ActivePlan {
  athlete: Athlete
  startDate: IsoDate
  plan: Plan
}

type StoredPlan = ActivePlan & { id: string }

const db = new Dexie('openhybrid') as Dexie & { plans: EntityTable<StoredPlan, 'id'> }

db.version(1).stores({ plans: 'id' })

export async function loadActivePlan(): Promise<ActivePlan | undefined> {
  return db.plans.get(ACTIVE_ID)
}

export async function saveActivePlan(active: ActivePlan): Promise<void> {
  await db.plans.put({ ...active, id: ACTIVE_ID })
}

export async function clearActivePlan(): Promise<void> {
  await db.plans.delete(ACTIVE_ID)
}
