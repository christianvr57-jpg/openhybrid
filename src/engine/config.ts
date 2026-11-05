import type { Zone } from './model'

/** Exponent of the Riegel race time formula. */
export const RIEGEL_EXPONENT = 1.06

export const TEN_K_METERS = 10_000

/**
 * Training zones as a fraction above (+) or below (-) the equivalent 10k pace.
 * Provisional values from docs/MODELO-ENTRENAMIENTO.md, pending review by a coach.
 * Listed from slowest to fastest. The slow limit of Z1 only applies to prescriptions:
 * any slower logged pace is still Z1.
 */
export const PACE_ZONES: readonly { zone: Zone; fastest: number; slowest: number }[] = [
  { zone: 'z1', fastest: 0.3, slowest: 0.4 },
  { zone: 'z2', fastest: 0.18, slowest: 0.28 },
  { zone: 'z3', fastest: 0.03, slowest: 0.07 },
  { zone: 'z4', fastest: -0.02, slowest: 0.02 },
  { zone: 'z5', fastest: -0.08, slowest: -0.03 },
]
