import { PACE_ZONES, RIEGEL_EXPONENT, TEN_K_METERS } from './config'
import type { PaceRange, Plan, RaceMark, Zone } from './model'

function assertValidMark(mark: RaceMark): void {
  if (!(mark.distanceMeters > 0) || !(mark.timeSeconds > 0)) {
    throw new RangeError('A race mark needs a positive distance and time')
  }
}

/** Equivalent race time at another distance, using the Riegel formula. */
export function equivalentTimeSeconds(mark: RaceMark, distanceMeters: number): number {
  assertValidMark(mark)
  if (!(distanceMeters > 0)) {
    throw new RangeError('The target distance must be positive')
  }
  return mark.timeSeconds * (distanceMeters / mark.distanceMeters) ** RIEGEL_EXPONENT
}

/** Equivalent 10k pace in seconds per kilometre. */
export function tenKPace(mark: RaceMark): number {
  return equivalentTimeSeconds(mark, TEN_K_METERS) / (TEN_K_METERS / 1000)
}

/** Prescribed pace range for a zone, in seconds per kilometre. */
export function zonePace(mark: RaceMark, zone: Zone): PaceRange {
  const definition = PACE_ZONES.find((item) => item.zone === zone)
  if (definition === undefined) {
    throw new RangeError(`Unknown zone: ${zone}`)
  }
  const pace = tenKPace(mark)
  return {
    fastest: pace * (1 + definition.fastest),
    slowest: pace * (1 + definition.slowest),
  }
}

/**
 * Zone of a logged pace. Gaps between zones are never prescribed, so each one is
 * split at its midpoint. Paces beyond Z1 or Z5 stay in those zones.
 */
export function classifyPace(paceSecondsPerKm: number, mark: RaceMark): Zone {
  const offset = paceSecondsPerKm / tenKPace(mark) - 1
  for (const [index, current] of PACE_ZONES.entries()) {
    const next = PACE_ZONES[index + 1]
    if (next === undefined) {
      return current.zone
    }
    if (offset >= (current.fastest + next.slowest) / 2) {
      return current.zone
    }
  }
  throw new RangeError('No pace zones configured')
}

/** Adds paces to an existing plan, keeping its schedule. Test and race stay by feel. */
export function applyMark(plan: Plan, mark: RaceMark): Plan {
  return {
    ...plan,
    weeks: plan.weeks.map((week) => ({
      ...week,
      sessions: week.sessions.map((session) =>
        session.type === 'test' || session.type === 'race'
          ? session
          : {
              ...session,
              blocks: session.blocks.map((block) =>
                block.kind === 'run' ? { ...block, pace: zonePace(mark, block.zone) } : block,
              ),
            },
      ),
    })),
  }
}
