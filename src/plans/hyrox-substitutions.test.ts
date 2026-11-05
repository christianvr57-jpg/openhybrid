import { describe, expect, it } from 'vitest'
import data from './hyrox-substitutions.json'
import { hyroxDivisions } from './hyrox-divisions'
import { hyroxSubstitutions } from './hyrox-substitutions'
import { hyroxSubstitutionsSchema } from './schema'

describe('hyrox substitutions data', () => {
  it('covers every station that needs equipment', () => {
    const stations = hyroxDivisions.stations.map((station) => station.id)
    const expected = stations.filter((id) => id !== 'burpee_broad_jumps')
    expect(Object.keys(hyroxSubstitutions).sort()).toEqual([...expected].sort())
  })

  it('rejects a station with no equipment-free option', () => {
    const broken = { ...data, ski_erg: data.ski_erg.slice(0, 1) }
    expect(hyroxSubstitutionsSchema.safeParse(broken).success).toBe(false)
  })
})
