# CLAUDE.md — openHybrid

Contexto del proyecto para las sesiones de Claude Code. Léelo entero antes de tocar nada.

## Qué es

openHybrid es una app gratuita y de código abierto que genera planes de entrenamiento de **HYROX** y permite seguirlos y registrarlos. El **running** (5k, 10k, media maratón) es secundario: se entrena como complemento en los periodos sin competiciones oficiales. Existe para que cualquiera tenga acceso a buenos planes sin suscripciones.

Inspiración: openGym (gym tracker de Duarte Santos). Tomamos ideas, **nunca código** (es AGPL y este proyecto empieza de cero).

## Principios (no negociables)

1. **Gratis de verdad.** Ninguna función de entrenamiento detrás de pago, cuenta o suscripción.
2. **Sin servidor y sin cuentas.** Todos los datos viven en el dispositivo del usuario (IndexedDB). No hay backend propio, ni analítica, ni tracking.
3. **Planes por reglas, no por IA.** El generador es determinista y funciona offline. Una IA opcional (con la clave del usuario) podrá llegar más adelante, pero nada depende de ella.
4. **Planes como datos abiertos.** Las plantillas de plan son archivos de datos validados por esquema, separados del código, para que la comunidad pueda contribuir.
5. **Explicable.** Cada plan dice en qué principios se basa. Nada de "plan con IA" sin explicación.
6. **Web primero.** PWA instalable en la pantalla de inicio. Más adelante se empaqueta con Capacitor para iOS/Android sin reescribir.

## Stack

- React 19 + TypeScript (strict) + Vite
- PWA: `vite-plugin-pwa`
- Datos locales: IndexedDB con Dexie
- Estado: Zustand
- Validación de datos de planes: Zod
- Tests: Vitest (+ Testing Library para componentes)
- i18n desde el principio: español por defecto, inglés como segundo idioma. Nada de textos sueltos en el código.
- Despliegue: GitHub Pages o Cloudflare Pages (estático)
- Futuro: Capacitor para app nativa (se compilará en el Mac del autor)

Mantén pocas dependencias. Antes de añadir una, justifica por qué no basta con lo que hay.

## Estructura prevista

```
src/
  engine/        Generador de planes. TypeScript puro, sin React ni DOM. 100 % testeado.
    model.ts     Tipos del dominio (ver docs/MODELO-ENTRENAMIENTO.md)
    paces.ts     Cálculo de ritmos y zonas a partir de una marca
    generate.ts  Cuestionario -> plan completo
  plans/         Plantillas de plan (JSON) + esquema Zod. Licencia CC BY-SA 4.0.
  data/          Persistencia local (Dexie): planes activos, sesiones registradas
  features/      Pantallas: onboarding/cuestionario, hoy, plan, registro, historial
  i18n/          Traducciones
docs/            Documentación del proyecto
```

Regla clave: **`src/engine` no importa nada de la interfaz.** Debe poder ejecutarse en Node y en tests sin navegador.

## Convenciones

- Código, nombres y comentarios en inglés; documentación y textos de la app en español (traducidos vía i18n).
- Unidades: métrico. Distancias en metros, tiempos en segundos, ritmos en s/km internamente; se formatean solo en la interfaz.
- Las series de carrera se prescriben **por distancia** (p. ej. 6 × 800 m), no por tiempo.
- Fechas: ISO 8601. La semana empieza en lunes.
- Commits pequeños, en inglés, en imperativo. Un cambio = un propósito.

## Calidad

- Todo cambio en `src/engine` lleva tests.
- Tests de "cordura" del generador: ningún plan puede subir el volumen semanal de carrera más del mayor de 10 % o +3 km respecto a la última semana normal (sin contar las de descarga), debe incluir semanas de descarga, y, si tiene fecha de carrera, debe terminar en una puesta a punto antes de ella. Si un test así falla, el plan está mal, no el test.
- `npm run lint`, `npm run typecheck` y `npm test` deben pasar antes de dar algo por terminado.

## Legal

- HYROX® es marca registrada de Upsolut Sports GmbH. No la uses en el nombre, el logo ni el icono. En la app y el README debe figurar: "openHybrid es un proyecto independiente, no afiliado, respaldado ni patrocinado por HYROX ni por Upsolut Sports GmbH".
- Aviso de salud visible en el onboarding: consultar con un profesional antes de empezar un plan.
- Licencias: código AGPL-3.0-or-later; plantillas de planes (`src/plans/`) CC BY-SA 4.0.
- Pesos y distancias oficiales de HYROX por categoría cambian según la temporada: viven en datos, nunca en el código, y se verifican contra el reglamento oficial vigente.

## Estado actual

Fases 0 (cimientos) y 1 (MVP de HYROX) cerradas. La app se publica en <https://christianvr57-jpg.github.io/openhybrid/> con cada subida a `main`, si pasan lint, typecheck y tests. Siguiente paso: Fase 2 (herramientas de HYROX): calculadora de parciales y modo simulacro. Ver `docs/ROADMAP.md` y actualiza esta sección al cerrar cada fase.

Decisiones técnicas de la Fase 0:

- TypeScript se queda en 6.0 porque `typescript-eslint` aún no admite la 7. Subirlo cuando lo admita.
- i18n propio en `src/i18n/` (sin librería): con dos idiomas no compensa una dependencia.
- Dexie y Zod se instalaron en la Fase 1. Zustand no se instala por ahora: con pocas pantallas basta el estado de React.
- Los iconos PNG se generan con `node scripts/generate-icons.mjs`.
- ESLint impide que `src/engine` importe la interfaz o use APIs del navegador.
- Estilo visual: negro y amarillo de competición, solo en modo oscuro, con títulos en Barlow Condensed incluida en la app (sin Google Fonts). Es una inspiración: nunca el logo, el nombre ni la tipografía de HYROX.
- GitHub Pages sirve la app bajo `/openhybrid/`: la ruta llega por la variable `BASE_PATH`. En local sigue siendo la raíz.

## Sobre el autor

Christian, gestor de proyectos (no desarrollador profesional). Explica las decisiones técnicas en lenguaje claro y en español. La app se diseña para quien entrena HYROX y carreras en general, no para un caso personal.
