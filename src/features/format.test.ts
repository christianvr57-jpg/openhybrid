import { describe, expect, it } from 'vitest'
import { formatDate, formatDistance, formatPace, formatPaceRange, todayIso } from './format'

describe('format', () => {
  it('formats paces', () => {
    expect(formatPace(270)).toBe('4:30')
    expect(formatPace(305.4)).toBe('5:05')
    expect(formatPace(299.6)).toBe('5:00')
    expect(formatPaceRange({ fastest: 318.6, slowest: 345.6 })).toBe('5:19–5:46 /km')
  })

  it('formats distances by locale', () => {
    expect(formatDistance(800, 'es')).toBe('800 m')
    expect(formatDistance(8000, 'es')).toBe('8 km')
    expect(formatDistance(15_600, 'es')).toBe('15,6 km')
    expect(formatDistance(15_600, 'en')).toBe('15.6 km')
  })

  it('formats dates without shifting the day', () => {
    expect(formatDate('2026-11-09', 'es')).toBe('lunes, 9 de noviembre')
  })

  it('gives the local date', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
  })
})
