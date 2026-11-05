import { hyroxDivisions } from '../plans/hyrox-divisions'
import { hyroxSplits } from '../plans/hyrox-splits'
import type { StationId } from './model'

export interface RaceSplits {
  /** Average time for each running kilometre, in seconds. */
  runSecondsPerKm: number
  stations: { station: StationId; seconds: number }[]
  /** Total time in the transition zone. It absorbs rounding so the parts add up. */
  roxzoneSeconds: number
}

/** Shares a target race time between running, stations and the transition zone. */
export function calculateSplits(targetSeconds: number): RaceSplits {
  if (!(targetSeconds > 0)) {
    throw new RangeError('The target time must be positive')
  }
  const { segments } = hyroxDivisions.run
  const runSecondsPerKm = Math.round((targetSeconds * hyroxSplits.runShare) / segments)
  const stations = hyroxDivisions.stations.map(({ id }) => ({
    station: id,
    seconds: Math.round(targetSeconds * hyroxSplits.stationShares[id]),
  }))
  const stationSeconds = stations.reduce((total, item) => total + item.seconds, 0)
  return {
    runSecondsPerKm,
    stations,
    roxzoneSeconds: targetSeconds - runSecondsPerKm * segments - stationSeconds,
  }
}
