import { describe, expect, it } from 'vitest'
import { calculateSplits } from './splits'

describe('calculateSplits', () => {
  it.each([3600, 4500, 5401, 7777])('adds up exactly to %i seconds', (target) => {
    const splits = calculateSplits(target)
    const stations = splits.stations.reduce((total, item) => total + item.seconds, 0)
    expect(splits.runSecondsPerKm * 8 + stations + splits.roxzoneSeconds).toBe(target)
  })

  it('shares a 90 minute race', () => {
    const splits = calculateSplits(5400)
    expect(splits.runSecondsPerKm).toBe(338)
    expect(splits.roxzoneSeconds).toBeCloseTo(432, -1)
    expect(splits.stations).toHaveLength(8)
    expect(splits.stations[0]).toEqual({ station: 'ski_erg', seconds: 297 })
  })

  it('keeps the official station order', () => {
    const stations = calculateSplits(5400).stations.map((item) => item.station)
    expect(stations.at(0)).toBe('ski_erg')
    expect(stations.at(-1)).toBe('wall_balls')
  })

  it.each([0, -1, Number.NaN])('rejects the target %d', (target) => {
    expect(() => calculateSplits(target)).toThrow(RangeError)
  })
})
