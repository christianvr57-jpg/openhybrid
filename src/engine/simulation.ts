import { hyroxDivisions } from '../plans/hyrox-divisions'
import type { Simulation, SimulationSplit } from './model'

/** Key of the best running kilometre among the records. */
export const BEST_RUN = 'run'

const isRun = (segment: string): boolean => segment.startsWith('run_')

/** The 16 race segments in order: run 1, first station, run 2, second station... */
export const SIMULATION_SEGMENTS: readonly string[] = hyroxDivisions.stations.flatMap(
  (station, index) => [`run_${index + 1}`, station.id],
)

/** Turns lap timestamps in milliseconds into the time of each segment, in seconds. */
export function splitsFromLaps(startedAt: number, laps: readonly number[]): SimulationSplit[] {
  return laps.flatMap((lap, index) => {
    const segment = SIMULATION_SEGMENTS[index]
    const previous = laps[index - 1] ?? startedAt
    return segment === undefined ? [] : [{ segment, seconds: Math.round((lap - previous) / 1000) }]
  })
}

/** Best time per station and best running kilometre, within one division. */
export function bestTimes(
  simulations: readonly Simulation[],
  divisionId: string | undefined,
): Map<string, number> {
  const best = new Map<string, number>()
  for (const simulation of simulations.filter((item) => item.divisionId === divisionId)) {
    for (const { segment, seconds } of simulation.splits) {
      const key = isRun(segment) ? BEST_RUN : segment
      const current = best.get(key)
      if (current === undefined || seconds < current) {
        best.set(key, seconds)
      }
    }
  }
  return best
}

/** Records beaten by a new simulation. A first time is not a beaten record. */
export function beatenRecords(simulation: Simulation, previous: readonly Simulation[]): string[] {
  const records = bestTimes(previous, simulation.divisionId)
  const current = bestTimes([simulation], simulation.divisionId)
  return [...current]
    .filter(([key, seconds]) => {
      const record = records.get(key)
      return record !== undefined && seconds < record
    })
    .map(([key]) => key)
}
