// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App.tsx'
import {
  loadActivePlan,
  loadLogs,
  loadSimulations,
  saveActivePlan,
  saveLog,
  saveSimulation,
} from './data/index.ts'
import { generatePlan } from './engine/generate'
import type { Athlete } from './engine/model'
import { todayIso } from './features/format'
import { I18nProvider } from './i18n/index.tsx'

vi.mock('./data/index.ts', () => ({
  loadActivePlan: vi.fn(),
  saveActivePlan: vi.fn(),
  clearActivePlan: vi.fn(),
  loadLogs: vi.fn(),
  saveLog: vi.fn(),
  deleteLog: vi.fn(),
  restoreBackup: vi.fn(),
  loadSimulations: vi.fn(),
  saveSimulation: vi.fn(),
  deleteSimulation: vi.fn(),
}))

function renderApp() {
  return render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  )
}

function choose(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } })
}

describe('App', () => {
  beforeEach(() => {
    vi.mocked(loadActivePlan).mockResolvedValue(undefined)
    vi.mocked(saveActivePlan).mockResolvedValue()
    vi.mocked(saveLog).mockResolvedValue()
    vi.mocked(loadLogs).mockResolvedValue([])
    vi.mocked(loadSimulations).mockResolvedValue([])
    vi.mocked(saveSimulation).mockResolvedValue()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('shows the legal and health notices in Spanish by default', async () => {
    renderApp()
    expect(await screen.findByText(/Consulta con un profesional/)).toBeTruthy()
    expect(screen.getByText(/no afiliado, respaldado ni patrocinado por HYROX/)).toBeTruthy()
    expect(document.documentElement.lang).toBe('es')
  })

  it('switches to English and remembers the choice', async () => {
    const { unmount } = renderApp()
    await screen.findByText(/Consulta con un profesional/)
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByText(/not affiliated with, endorsed by or sponsored by HYROX/)).toBeTruthy()
    expect(document.documentElement.lang).toBe('en')

    unmount()
    renderApp()
    expect(screen.getByText(/not affiliated with, endorsed by or sponsored by HYROX/)).toBeTruthy()
    await screen.findByText(/Check with a professional/)
  })

  it('creates and saves a plan from the questionnaire', async () => {
    renderApp()
    await screen.findByText(/Consulta con un profesional/)
    choose('Compito en', 'women')
    choose('Categoría', 'singles_women')
    choose('Nivel', 'intermediate')
    choose('Kilómetros', '20')
    for (const day of ['Martes', 'Jueves', 'Sábado', 'Domingo']) {
      fireEvent.click(screen.getByLabelText(day))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Crear mi plan' }))

    expect(await screen.findByRole('heading', { name: 'Hoy' })).toBeTruthy()
    expect(saveActivePlan).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: 'Plan' }))
    expect(await screen.findByText('Semana 1')).toBeTruthy()
    expect(screen.getByText(/En qué se basa/)).toBeTruthy()
  })

  describe('with a plan that starts with a test today', () => {
    const everyDay: Athlete['availableDays'] = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ]
    const athlete: Athlete = {
      level: 'intermediate',
      racer: 'women',
      weeklyRunMeters: 20_000,
      availableDays: everyDay,
      fixedActivities: [],
      equipment: [],
    }

    function storedPlanWithTestToday() {
      const startDate = todayIso()
      const plan = generatePlan({
        athlete,
        goal: { race: 'hyrox', divisionId: 'singles_women' },
        startDate,
      })
      const weekday = everyDay[(new Date(`${startDate}T00:00:00Z`).getUTCDay() + 6) % 7]
      const [first, ...rest] = plan.weeks
      if (first === undefined || weekday === undefined) {
        throw new Error('Plan without weeks')
      }
      const test = {
        type: 'test' as const,
        weekday,
        estimatedSeconds: 1200,
        blocks: [{ kind: 'run' as const, repeats: 1, meters: 3000, zone: 'z5' as const }],
      }
      return {
        athlete,
        startDate,
        plan: { ...plan, weeks: [{ ...first, sessions: [test] }, ...rest] },
      }
    }

    it('turns the test result into paces for the whole plan', async () => {
      vi.mocked(loadActivePlan).mockResolvedValue(storedPlanWithTestToday())
      renderApp()
      fireEvent.click(await screen.findByText('Registrar sesión'))
      fireEvent.change(screen.getByLabelText('Tiempo del test', { exact: false }), {
        target: { value: '13:00' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

      expect(await screen.findByText('Registrada: Hecha')).toBeTruthy()
      expect(saveLog).toHaveBeenCalledOnce()
      const saved = vi.mocked(saveActivePlan).mock.calls[0]?.[0]
      expect(saved?.athlete.mark).toEqual({ distanceMeters: 3000, timeSeconds: 780 })
    })

    it('asks for the time of a completed test', async () => {
      vi.mocked(loadActivePlan).mockResolvedValue(storedPlanWithTestToday())
      renderApp()
      fireEvent.click(await screen.findByText('Registrar sesión'))
      fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

      expect((await screen.findByRole('alert')).textContent).toMatch(/45:00/)
      expect(saveLog).not.toHaveBeenCalled()
    })

    it('recalculates the plan with a new race date', async () => {
      vi.mocked(loadActivePlan).mockResolvedValue(storedPlanWithTestToday())
      renderApp()
      fireEvent.click(await screen.findByRole('button', { name: 'Plan' }))
      const raceDay = new Date(Date.now() + 100 * 86_400_000)
      fireEvent.change(screen.getByLabelText('Fecha de la carrera', { exact: false }), {
        target: { value: todayIso(raceDay) },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Recalcular plan' }))

      expect(await screen.findByText('Día de carrera', { exact: false })).toBeDefined()
      expect(vi.mocked(saveActivePlan).mock.calls[0]?.[0].plan.goal.date).toBe(todayIso(raceDay))
    })

    it('does not show the logs of an earlier plan on the same day', async () => {
      const stored = { ...storedPlanWithTestToday(), planId: 'new' }
      vi.mocked(loadActivePlan).mockResolvedValue(stored)
      vi.mocked(loadLogs).mockResolvedValue([
        { id: `old:${todayIso()}:0`, date: todayIso(), type: 'test', status: 'done' },
      ])
      renderApp()
      expect(await screen.findByText('Registrar sesión')).toBeTruthy()
      expect(screen.queryByText('Registrada: Hecha')).toBeNull()
    })

    it('shares a target time in the split calculator', async () => {
      vi.mocked(loadActivePlan).mockResolvedValue(storedPlanWithTestToday())
      renderApp()
      fireEvent.click(await screen.findByRole('button', { name: 'Herramientas' }))
      fireEvent.change(screen.getByLabelText('Tiempo objetivo', { exact: false }), {
        target: { value: '1:30:00' },
      })
      expect(screen.getByText('5:38 /km')).toBeTruthy()
    })

    it('times a simulation and saves what was done', async () => {
      vi.mocked(loadActivePlan).mockResolvedValue(storedPlanWithTestToday())
      renderApp()
      fireEvent.click(await screen.findByRole('button', { name: 'Herramientas' }))
      fireEvent.click(screen.getByRole('button', { name: 'Empezar simulacro' }))
      expect(screen.getByText('Carrera 1')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Siguiente tramo' }))
      expect(screen.getByText('SkiErg')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Terminar aquí' }))

      expect(saveSimulation).toHaveBeenCalledOnce()
      expect(vi.mocked(saveSimulation).mock.calls[0]?.[0].splits).toHaveLength(1)
      expect(localStorage.getItem('openhybrid.simulation')).toBeNull()
    })

    it('recovers a simulation in progress after closing the app', async () => {
      vi.mocked(loadActivePlan).mockResolvedValue(storedPlanWithTestToday())
      localStorage.setItem(
        'openhybrid.simulation',
        JSON.stringify({ startedAt: Date.now() - 60_000, laps: [Date.now() - 1000] }),
      )
      renderApp()
      fireEvent.click(await screen.findByRole('button', { name: 'Herramientas' }))
      expect(screen.getByText('SkiErg')).toBeTruthy()
    })

    it('explains why a date cannot be used', async () => {
      vi.mocked(loadActivePlan).mockResolvedValue(storedPlanWithTestToday())
      renderApp()
      fireEvent.click(await screen.findByRole('button', { name: 'Plan' }))
      fireEvent.change(screen.getByLabelText('Fecha de la carrera', { exact: false }), {
        target: { value: todayIso(new Date(Date.now() + 7 * 86_400_000)) },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Recalcular plan' }))

      expect((await screen.findByRole('alert')).textContent).toMatch(/muy cerca/)
      expect(saveActivePlan).not.toHaveBeenCalled()
    })
  })

  it('creates a running plan without HYROX questions or tools', async () => {
    renderApp()
    await screen.findByText(/Consulta con un profesional/)
    choose('Objetivo', '10k')
    expect(screen.queryByLabelText('Compito en', { exact: false })).toBeNull()
    expect(screen.queryByText('Material al que tienes acceso')).toBeNull()
    choose('Nivel', 'beginner')
    choose('Kilómetros', '15')
    for (const day of ['Martes', 'Jueves', 'Domingo']) {
      fireEvent.click(screen.getByLabelText(day))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Crear mi plan' }))

    expect(await screen.findByRole('heading', { name: 'Hoy' })).toBeTruthy()
    expect(vi.mocked(saveActivePlan).mock.calls[0]?.[0].plan.goal).toEqual({ race: '10k' })
    expect(screen.queryByRole('button', { name: 'Herramientas' })).toBeNull()
  })

  it('explains why a plan cannot be created', async () => {
    renderApp()
    await screen.findByText(/Consulta con un profesional/)
    choose('Compito en', 'men')
    choose('Categoría', 'singles_men')
    choose('Nivel', 'beginner')
    choose('Kilómetros', '10')
    fireEvent.click(screen.getByLabelText('Lunes'))
    fireEvent.click(screen.getByRole('button', { name: 'Crear mi plan' }))

    expect((await screen.findByRole('alert')).textContent).toMatch(/al menos 3 días/)
    expect(saveActivePlan).not.toHaveBeenCalled()
  })
})
