import { describe, expect, it } from 'vitest'
import { es, type MessageKey } from '../../i18n/es.ts'
import { translate, type MessageParams } from '../../i18n/translate.ts'
import { hyroxDivisions } from '../../plans/hyrox-divisions'
import { hyroxSubstitutions } from '../../plans/hyrox-substitutions'
import { hyroxTemplate } from '../../plans/hyrox-template'
import { describeBlock } from './describe'

const t = (key: MessageKey, params?: MessageParams) => translate('es', key, params)

describe('describeBlock', () => {
  it('describes intervals with pace and recovery', () => {
    const text = describeBlock(
      {
        kind: 'run',
        repeats: 6,
        meters: 800,
        zone: 'z5',
        pace: { fastest: 248.4, slowest: 261.9 },
        recovery: { meters: 400 },
      },
      t,
      'es',
    )
    expect(text).toBe('6 × 800 m · Z5 · 4:08–4:22 /km · recuperación 400 m')
  })

  it('describes a run by feel when there is no pace', () => {
    const text = describeBlock({ kind: 'run', repeats: 1, meters: 5000, zone: 'z2' }, t, 'es')
    expect(text).toBe('5 km · Z2 · por sensaciones')
  })

  it('describes a station with its load', () => {
    const text = describeBlock(
      { kind: 'station', station: 'farmers_carry', repeats: 1, meters: 200, loadKg: 16 },
      t,
      'es',
    )
    expect(text).toBe('Farmers Carry · 200 m · 16 kg por mano')
  })

  it('names the station behind a substitute', () => {
    const text = describeBlock(
      { kind: 'station', station: 'sled_push', repeats: 1, meters: 25, substitute: 'bear_crawl' },
      t,
      'es',
    )
    expect(text).toBe('Gateo de oso (en lugar de Sled Push) · 25 m')
  })

  it('describes strength', () => {
    const text = describeBlock(
      { kind: 'strength', exercise: 'back_squat', sets: 4, reps: 6, rir: 2 },
      t,
      'es',
    )
    expect(text).toBe('Sentadilla trasera · 4 × 6 · RIR 2')
  })
})

describe('translations', () => {
  it('names every exercise in the plan data', () => {
    const exercises = [
      ...hyroxTemplate.strength.heavy,
      ...hyroxTemplate.strength.general,
      ...Object.values(hyroxSubstitutions).flat(),
    ].map((item) => item.exercise)
    for (const exercise of exercises) {
      expect(es).toHaveProperty([`exercise.${exercise}`])
    }
  })

  it('names every division', () => {
    for (const division of hyroxDivisions.divisions) {
      expect(es).toHaveProperty([`division.${division.id}`])
    }
  })
})
