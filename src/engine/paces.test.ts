import { describe, expect, it } from 'vitest'
import type { Plan, RaceMark } from './model'
import { applyMark, classifyPace, equivalentTimeSeconds, tenKPace, zonePace } from './paces'

const tenK45: RaceMark = { distanceMeters: 10_000, timeSeconds: 2700 }
const fiveK20: RaceMark = { distanceMeters: 5000, timeSeconds: 1200 }

describe('equivalentTimeSeconds', () => {
  it('returns the mark itself at the same distance', () => {
    expect(equivalentTimeSeconds(tenK45, 10_000)).toBe(2700)
  })

  it('applies the Riegel formula', () => {
    expect(equivalentTimeSeconds(fiveK20, 10_000)).toBeCloseTo(2501.9, 0)
    expect(equivalentTimeSeconds(tenK45, 5000)).toBeCloseTo(1295, 0)
  })

  it.each([
    { distanceMeters: 0, timeSeconds: 1200 },
    { distanceMeters: 5000, timeSeconds: 0 },
    { distanceMeters: -5000, timeSeconds: 1200 },
    { distanceMeters: Number.NaN, timeSeconds: 1200 },
  ])('rejects the invalid mark %o', (mark) => {
    expect(() => equivalentTimeSeconds(mark, 10_000)).toThrow(RangeError)
  })

  it('rejects an invalid target distance', () => {
    expect(() => equivalentTimeSeconds(tenK45, 0)).toThrow(RangeError)
  })
})

describe('tenKPace', () => {
  it('gives the pace of a 10k mark', () => {
    expect(tenKPace(tenK45)).toBe(270)
  })

  it('converts marks at other distances', () => {
    expect(tenKPace(fiveK20)).toBeCloseTo(250.2, 1)
  })
})

describe('zonePace', () => {
  it('derives Z2 from the 10k pace', () => {
    const pace = zonePace(tenK45, 'z2')
    expect(pace.fastest).toBeCloseTo(318.6)
    expect(pace.slowest).toBeCloseTo(345.6)
  })

  it('derives Z5 faster than the 10k pace', () => {
    const pace = zonePace(tenK45, 'z5')
    expect(pace.fastest).toBeCloseTo(248.4)
    expect(pace.slowest).toBeCloseTo(261.9)
  })

  it('keeps every zone faster than the one below it', () => {
    const zones = (['z1', 'z2', 'z3', 'z4', 'z5'] as const).map((zone) => zonePace(tenK45, zone))
    for (const [index, zone] of zones.entries()) {
      const faster = zones[index + 1]
      expect(zone.fastest).toBeLessThan(zone.slowest)
      if (faster !== undefined) {
        expect(faster.slowest).toBeLessThan(zone.fastest)
      }
    }
  })
})

describe('classifyPace', () => {
  it('classifies paces inside each zone', () => {
    expect(classifyPace(360, tenK45)).toBe('z1')
    expect(classifyPace(330, tenK45)).toBe('z2')
    expect(classifyPace(283, tenK45)).toBe('z3')
    expect(classifyPace(270, tenK45)).toBe('z4')
    expect(classifyPace(255, tenK45)).toBe('z5')
  })

  it('splits the Z2/Z3 gap at +12.5 %', () => {
    expect(classifyPace(304, tenK45)).toBe('z2')
    expect(classifyPace(303, tenK45)).toBe('z3')
  })

  it('keeps extreme paces in the outer zones', () => {
    expect(classifyPace(900, tenK45)).toBe('z1')
    expect(classifyPace(120, tenK45)).toBe('z5')
  })
})

describe('applyMark', () => {
  const run = { kind: 'run', repeats: 1, meters: 5000, zone: 'z2' } as const
  const plan: Plan = {
    goal: { race: 'hyrox' },
    warnings: [],
    weeks: [
      {
        number: 1,
        startDate: '2026-11-09',
        phase: 'base',
        isDeload: false,
        isPartial: false,
        runMeters: 10_000,
        sessions: [
          { type: 'easy_run', weekday: 'tuesday', blocks: [run], estimatedSeconds: 1800 },
          { type: 'test', weekday: 'thursday', blocks: [run], estimatedSeconds: 1800 },
        ],
      },
    ],
  }

  it('adds paces and keeps the test by feel', () => {
    const [week] = applyMark(plan, tenK45).weeks
    expect(week?.sessions[0]?.blocks[0]).toMatchObject({ pace: zonePace(tenK45, 'z2') })
    expect(week?.sessions[1]?.blocks[0]).toEqual(run)
  })
})
