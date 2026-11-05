import Dexie, { type EntityTable } from 'dexie'
import type { LoggedSession } from '../engine/model'
import type { ActivePlan, Backup } from './backup'

export type { ActivePlan, Backup } from './backup'

const ACTIVE_ID = 'active'

type StoredPlan = ActivePlan & { id: string }

const db = new Dexie('openhybrid') as Dexie & {
  plans: EntityTable<StoredPlan, 'id'>
  logs: EntityTable<LoggedSession, 'id'>
}

db.version(1).stores({ plans: 'id' })
db.version(2).stores({ plans: 'id', logs: 'id, date' })

export async function loadActivePlan(): Promise<ActivePlan | undefined> {
  return db.plans.get(ACTIVE_ID)
}

export async function saveActivePlan(active: ActivePlan): Promise<void> {
  await db.plans.put({ ...active, id: ACTIVE_ID })
}

export async function clearActivePlan(): Promise<void> {
  await db.plans.delete(ACTIVE_ID)
}

export async function loadLogs(): Promise<LoggedSession[]> {
  return db.logs.toArray()
}

export async function saveLog(log: LoggedSession): Promise<void> {
  await db.logs.put(log)
}

export async function deleteLog(id: string): Promise<void> {
  await db.logs.delete(id)
}

/** Replaces everything on this device with the contents of a backup. */
export async function restoreBackup(backup: Backup): Promise<void> {
  await db.transaction('rw', db.plans, db.logs, async () => {
    await db.plans.clear()
    await db.logs.clear()
    if (backup.active !== null) {
      await db.plans.put({ ...backup.active, id: ACTIVE_ID })
    }
    await db.logs.bulkPut(backup.logs)
  })
}
