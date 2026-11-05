# Hoja de ruta

Cada fase termina con algo usable. No se empieza una fase sin cerrar la anterior.

HYROX es el producto principal. El running es secundario: se entrena como complemento en los periodos sin competiciones oficiales.

## Fase 0 — Cimientos

- [x] Proyecto Vite + React + TypeScript (strict) creado y arrancando
- [x] ESLint, Prettier, Vitest configurados; scripts `lint`, `typecheck`, `test`
- [x] Estructura de carpetas de `CLAUDE.md`
- [x] i18n básico (es/en)
- [x] PWA instalable (manifest + service worker)
- [x] LICENSE (AGPL-3.0-or-later), aviso CC BY-SA en `src/plans/`
- [x] Repositorio en GitHub
- [x] Despliegue automático en GitHub Pages

## Fase 1 — MVP de HYROX

- [x] `src/plans/hyrox-divisions.json` verificado contra el reglamento oficial vigente
- [x] `src/engine/model.ts`: tipos del dominio según `docs/MODELO-ENTRENAMIENTO.md`
- [x] `src/engine/paces.ts`: Riegel + zonas, con tests
- [x] `src/engine/generate.ts`: plan de HYROX por fases (fuerza + carrera + estaciones + carreras comprometidas + simulacros) y ciclos continuos sin fecha, con tests de cordura
- [x] Sustituciones de estaciones según material disponible
- [ ] Cuestionario de inicio (objetivo, fecha opcional, categoría, marca, tiempo de HYROX opcional, volumen actual, días, actividades fijas, material) + aviso de salud
- [ ] Pantalla "Hoy": sesión del día con ritmos y cargas concretos
- [ ] Vista del plan completo por semanas
- [ ] Registro de sesión hecha (completada, tiempos, RPE, notas)
- [ ] Historial
- [ ] Exportar/importar copia de seguridad (JSON)

## Fase 2 — Herramientas de HYROX

- [ ] Calculadora de parciales: tiempo objetivo → ritmo por km, tiempo por estación, ROXZONE
- [ ] Modo simulacro con cronómetro por tramos y récords por estación

## Fase 3 — Running como complemento

- [ ] Planes de 5k, 10k y media maratón para los periodos sin competiciones oficiales

## Fase 4 — Publicación

- [ ] Revisión de las plantillas por un profesional (entrenador / CAFD)
- [ ] Guía para contribuir planes (`CONTRIBUTING.md`)
- [ ] Web del proyecto con demo
- [ ] App nativa con Capacitor (compilada en el Mac): App Store y APK de Android

## Fase 5 — Ecosistema

- [ ] Exportar sesiones como entrenos estructurados (Suunto, Garmin, Apple Watch)
- [ ] Importar actividades desde Strava
- [ ] Ajuste automático del plan según lo registrado
- [ ] Entrenador IA opcional con la clave del propio usuario
