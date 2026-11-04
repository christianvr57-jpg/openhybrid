# Primer mensaje para Claude Code

Copia el texto de abajo y pégalo como primer mensaje en Claude Code, abierto dentro de la carpeta `openhybrid`.

---

Hola. Vamos a empezar el proyecto openHybrid desde cero.

Antes de nada, lee `CLAUDE.md`, `docs/MODELO-ENTRENAMIENTO.md` y `docs/ROADMAP.md`. Son el contexto y las reglas del proyecto.

Hoy quiero cerrar la **Fase 0 (cimientos)** de la hoja de ruta:

1. Crea el proyecto con Vite + React + TypeScript (strict) en esta misma carpeta, sin borrar los archivos que ya hay.
2. Configura ESLint, Prettier y Vitest, con los scripts `lint`, `typecheck` y `test`.
3. Crea la estructura de carpetas descrita en `CLAUDE.md`, con un archivo vacío o de ejemplo donde haga falta.
4. Deja i18n preparado (español por defecto, inglés de segundo) y la app configurada como PWA instalable.
5. Añade el archivo LICENSE con la AGPL-3.0-or-later y un aviso de licencia CC BY-SA 4.0 en `src/plans/`.
6. Inicializa git y haz un primer commit.

Reglas para trabajar conmigo:
- No soy desarrollador profesional: explícame en español y en lenguaje claro qué haces y por qué.
- Antes de instalar cada dependencia, dime para qué sirve.
- Si algo del modelo de entrenamiento te parece mal planteado, dímelo antes de programarlo.
- Al terminar, comprueba que `npm run lint`, `npm run typecheck` y `npm test` pasan, y dime cómo arrancar la app para verla en el navegador y en el iPhone.

Cuando termines la Fase 0, para y espera a que lo revise antes de empezar la Fase 1.
