import { describe, expect, it } from 'vitest'
import type { Simulation } from './model'
import {
  beatenRecords,
  BEST_RUN,
  bestTimes,
  SIMULATION_SEGMENTS,
  splitsFromLaps,
} from './simulation'

const simulation = (
  id: string,
  splits: Simulation['splits'],
  divisionId = 'singles_women',
): Simulation => ({
  id,
  date: '2026-11-10',
  divisionId,
  splits,
  totalSeconds: splits.reduce((total, item) => total + item.seconds, 0),
})

describe('SIMULATION_SEGMENTS', () => {
  it('alternates 8 runs and 8 stations', () => {
    expect(SIMULATION_SEGMENTS).toHaveLength(16)
    expect(SIMULATION_SEGMENTS.slice(0, 3)).toEqual(['run_1', 'ski_erg', 'run_2'])
    expect(SIMULATION_SEGMENTS.at(-1)).toBe('wall_balls')
  })
})

describe('splitsFromLaps', () => {
  it('measures each segment from the previous lap', () => {
    expect(splitsFromLaps(1000, [301_000, 541_400])).toEqual([
      { segment: 'run_1', seconds: 300 },
      { segment: 'ski_erg', seconds: 240 },
    ])
  })

  it('ignores laps beyond the last segment', () => {
    const laps = Array.from({ length: 20 }, (_, index) => (index + 1) * 1000)
    expect(splitsFromLaps(0, laps)).toHaveLength(16)
  })
})

describe('bestTimes', () => {
  const first = simulation('1', [
    { segment: 'run_1', seconds: 300 },
    { segment: 'ski_erg', seconds: 250 },
    { segment: 'run_2', seconds: 290 },
  ])
  const second = simulation('2', [
    { segment: 'run_1', seconds: 310 },
    { segment: 'ski_erg', seconds: 240 },
  ])

  it('keeps the best station and the best running kilometre', () => {
    const best = bestTimes([first, second], 'singles_women')
    expect(best.get('ski_erg')).toBe(240)
    expect(best.get(BEST_RUN)).toBe(290)
  })

  it('does not mix divisions, because the weights differ', () => {
    const other = simulation('3', [{ segment: 'ski_erg', seconds: 100 }], 'singles_men')
    expect(bestTimes([first, other], 'singles_women').get('ski_erg')).toBe(250)
  })
})

describe('beatenRecords', () => {
  const previous = [simulation('1', [{ segment: 'ski_erg', seconds: 250 }])]

  it('reports only times that beat an earlier one', () => {
    const next = simulation('2', [
      { segment: 'run_1', seconds: 300 },
      { segment: 'ski_erg', seconds: 240 },
    ])
    expect(beatenRecords(next, previous)).toEqual(['ski_erg'])
  })

  it('does not count a tie', () => {
    const next = simulation('2', [{ segment: 'ski_erg', seconds: 250 }])
    expect(beatenRecords(next, previous)).toEqual([])
  })
})
