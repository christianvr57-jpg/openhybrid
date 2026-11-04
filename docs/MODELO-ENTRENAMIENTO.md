# Modelo de entrenamiento (borrador v0)

Este documento define el dominio antes de escribir código. Es un **borrador para validar**: los números son puntos de partida razonables, no verdades. Cualquier cambio aquí se refleja en `src/engine/model.ts` y en sus tests.

## 1. Entidades

```
Athlete      Datos del usuario: nivel, marca de referencia, días disponibles, material.
Goal         Carrera objetivo: tipo (5k | 10k | 21k | hyrox), fecha, categoría HYROX si aplica, tiempo objetivo opcional.
Plan         Resultado del generador: lista de semanas desde hoy hasta la carrera.
Phase        Base | Construcción | Específica | Puesta a punto (taper).
Week         Número, fase, si es de descarga, volumen objetivo, sesiones.
Session      Un entreno de un día: tipo, bloques, duración estimada, intensidad.
Block        Unidad mínima: calentamiento, serie, estación, fuerza, vuelta a la calma.
Station      Estación HYROX (ver sección 4).
LoggedSession  Lo que el usuario hizo de verdad: fecha, bloques completados, tiempos, RPE, notas.
```

### Tipos de sesión

| Tipo | Descripción |
| --- | --- |
| `easy_run` | Rodaje suave en zona 2 |
| `long_run` | Tirada larga suave |
| `intervals` | Series por distancia (p. ej. 6 × 800 m) con recuperación |
| `tempo` | Ritmo umbral continuo o fraccionado |
| `strength` | Fuerza (tren inferior, superior, completo) |
| `stations` | Trabajo técnico/específico de estaciones HYROX |
| `compromised_run` | Carrera inmediatamente después de una estación ("correr cansado") |
| `simulation` | Simulacro parcial o completo de HYROX |
| `rest` | Descanso |

### Prescripción de un bloque

Un bloque de carrera se prescribe **por distancia** con un ritmo objetivo (rango en s/km) y una recuperación (distancia o tiempo). Un bloque de estación se prescribe por distancia o repeticiones (según la estación) y una carga de referencia. Un bloque de fuerza: ejercicio, series, repeticiones, RIR objetivo.

## 2. Ritmos

Entrada: una marca reciente (distancia + tiempo), p. ej. 10k en 45:00.

1. Calcular tiempos equivalentes en otras distancias con la fórmula de Riegel: `T2 = T1 × (D2 / D1)^1.06`.
2. Definir zonas a partir del ritmo de 10k equivalente (s/km). Propuesta inicial:

| Zona | Uso | Ritmo respecto al de 10k |
| --- | --- | --- |
| Z1 | Recuperación | +30 % o más |
| Z2 | Suave / tirada larga | +18 % a +28 % |
| Z3 | Tempo / umbral | +3 % a +7 % |
| Z4 | Series largas (1–2 km) | −2 % a +2 % |
| Z5 | Series cortas (200–800 m) | −8 % a −3 % |

Estos porcentajes son provisionales y deben revisarse con un entrenador. Viven en un archivo de configuración, no repartidos por el código.

Sin marca reciente: estimar desde un test (p. ej. 3 km a tope o 30 min continuos) que la app propone en la primera semana.

## 3. Reglas del generador

- **Periodización** hacia atrás desde la fecha de la carrera: puesta a punto (1–2 semanas), específica, construcción, base. Si hay poco tiempo, se recorta primero la base.
- **Volumen:** subida semanal de carrera ≤ ~10 %. Cada 3–4 semanas, una semana de descarga (−20 a −30 %).
- **Distribución de intensidad:** la mayor parte del volumen de carrera (≈ 80 %) en Z1–Z2; el resto de calidad.
- **Días:** como máximo 2 sesiones de calidad de carrera por semana. Nunca dos días duros seguidos. La tirada larga, normalmente en fin de semana.
- **Fuerza:** mínimo 1–2 sesiones por semana en todos los planes (en HYROX, más). No poner fuerza pesada de pierna el día antes de series.
- **HYROX:** desde la fase de construcción, al menos una sesión semanal combinada (carrera + estaciones). Carreras comprometidas en la fase específica. Uno o dos simulacros parciales antes de la puesta a punto.
- **Ajuste por registro:** si el usuario falla o marca RPE muy alto en varias sesiones seguidas, la semana siguiente baja carga. (Fase 1 puede limitarse a mostrarlo; el ajuste automático puede venir después.)

## 4. HYROX: formato de carrera

Formato estándar: 8 tramos de 1 km de carrera, cada uno seguido de una estación, en este orden:

| # | Estación | Distancia / reps |
| --- | --- | --- |
| 1 | SkiErg | 1000 m |
| 2 | Sled Push | 50 m |
| 3 | Sled Pull | 50 m |
| 4 | Burpee Broad Jumps | 80 m |
| 5 | Remo | 1000 m |
| 6 | Farmers Carry | 200 m |
| 7 | Sandbag Lunges | 100 m |
| 8 | Wall Balls | 100 reps |

Entre carrera y estación está la ROXZONE (zona de transición), que también cuenta en el tiempo.

**Pendiente de verificar contra el reglamento oficial de la temporada vigente:** distancias exactas, cargas por categoría (Open, Pro, Doubles, Relay; hombre/mujer) y altura del objetivo de wall balls. Todo esto vive en un archivo de datos (`src/plans/hyrox-divisions.json`), nunca en el código.

### Calculadora de parciales (fase 2)

Entrada: tiempo objetivo total y categoría. Salida: ritmo por cada km de carrera, tiempo por estación y tiempo estimado de ROXZONE. El reparto inicial se basará en proporciones configurables, refinables con datos.

## 5. Preguntas abiertas

- ¿Qué porcentajes de zona usamos definitivamente? → revisar con un entrenador o graduado en CAFD.
- ¿Cómo sustituimos estaciones si el usuario no tiene trineo, SkiErg o remo? (tabla de sustituciones por material)
- ¿Cuántas semanas mínimas y máximas admite un plan? (propuesta: 6–24)
- ¿Formato exacto de las plantillas de plan para que sea fácil contribuir?
