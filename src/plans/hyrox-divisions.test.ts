import { describe, expect, it } from 'vitest'
import data from './hyrox-divisions.json'
import { hyroxDivisions } from './hyrox-divisions'
import { hyroxDivisionsSchema } from './schema'

const divisionsIn = (format: string) =>
  hyroxDivisions.divisions.filter((division) => division.format === format)

describe('hyrox divisions data', () => {
  it('matches the 26/27 rulebook loads', () => {
    expect(hyroxDivisions.season).toBe('2026/27')
    expect(hyroxDivisions.loads.light).toEqual({
      sledPushKg: 102,
      sledPullKg: 78,
      farmersCarryKgPerHand: 16,
      sandbagLungesKg: 10,
      wallBallKg: 4,
    })
    expect(hyroxDivisions.loads.medium).toEqual({
      sledPushKg: 152,
      sledPullKg: 103,
      farmersCarryKgPerHand: 24,
      sandbagLungesKg: 20,
      wallBallKg: 6,
    })
    expect(hyroxDivisions.loads.heavy).toEqual({
      sledPushKg: 202,
      sledPullKg: 153,
      farmersCarryKgPerHand: 32,
      sandbagLungesKg: 30,
      wallBallKg: 9,
    })
  })

  it('lists the divisions of each rulebook', () => {
    expect(divisionsIn('singles')).toHaveLength(4)
    expect(divisionsIn('doubles')).toHaveLength(5)
    expect(divisionsIn('relay')).toHaveLength(3)
  })

  it('covers 8 km of running', () => {
    const { segments, segmentMeters } = hyroxDivisions.run
    expect(segments * segmentMeters).toBe(8000)
  })

  it('rejects a file with a station missing', () => {
    const broken = { ...data, stations: data.stations.slice(1) }
    expect(hyroxDivisionsSchema.safeParse(broken).success).toBe(false)
  })

  it('rejects a file with stations out of order', () => {
    const broken = { ...data, stations: [...data.stations].reverse() }
    expect(hyroxDivisionsSchema.safeParse(broken).success).toBe(false)
  })

  it('rejects a negative load', () => {
    const broken = {
      ...data,
      loads: { ...data.loads, light: { ...data.loads.light, wallBallKg: -4 } },
    }
    expect(hyroxDivisionsSchema.safeParse(broken).success).toBe(false)
  })
})
