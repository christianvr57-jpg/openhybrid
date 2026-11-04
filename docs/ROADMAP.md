# Hoja de ruta

Cada fase termina con algo usable. No se empieza una fase sin cerrar la anterior.

## Fase 0 — Cimientos

- [x] Proyecto Vite + React + TypeScript (strict) creado y arrancando
- [x] ESLint, Prettier, Vitest configurados; scripts `lint`, `typecheck`, `test`
- [x] Estructura de carpetas de `CLAUDE.md`
- [x] i18n básico (es/en)
- [x] PWA instalable (manifest + service worker)
- [x] LICENSE (AGPL-3.0-or-later), aviso CC BY-SA en `src/plans/`
- [ ] Repositorio en GitHub
- [ ] Despliegue automático en GitHub Pages o Cloudflare Pages

## Fase 1 — MVP para el autor (objetivo: 10k del 7 de marzo de 2027)

- [ ] `src/engine/model.ts`: tipos del dominio según `docs/MODELO-ENTRENAMIENTO.md`
- [ ] `src/engine/paces.ts`: Riegel + zonas, con tests
- [ ] `src/engine/generate.ts`: plan de 10k por fases, con tests de cordura
- [ ] Cuestionario de inicio (objetivo, fecha, marca, volumen actual, días, actividades fijas, material) + aviso de salud
- [ ] Pantalla "Hoy": sesión del día con ritmos concretos
- [ ] Vista del plan completo por semanas
- [ ] Registro de sesión hecha (completada, tiempos, RPE, notas)
- [ ] Historial
- [ ] Exportar/importar copia de seguridad (JSON)

## Fase 2 — HYROX

- [ ] `src/plans/hyrox-divisions.json` verificado contra el reglamento oficial vigente
- [ ] Plan de HYROX (fuerza + carrera + estaciones + carreras comprometidas + simulacros)
- [ ] Sustituciones de estaciones según material disponible
- [ ] Calculadora de parciales: tiempo objetivo → ritmo por km, tiempo por estación, ROXZONE
- [ ] Modo simulacro con cronómetro por tramos y récords por estación

## Fase 3 — Publicación

- [ ] Planes de 5k y media maratón
- [ ] Revisión de las plantillas por un profesional (entrenador / CAFD)
- [ ] Guía para contribuir planes (`CONTRIBUTING.md`)
- [ ] Web del proyecto con demo
- [ ] App nativa con Capacitor (compilada en el Mac): App Store y APK de Android

## Fase 4 — Ecosistema

- [ ] Exportar sesiones como entrenos estructurados (Suunto, Garmin, Apple Watch)
- [ ] Importar actividades desde Strava
- [ ] Ajuste automático del plan según lo registrado
- [ ] Entrenador IA opcional con la clave del propio usuario
