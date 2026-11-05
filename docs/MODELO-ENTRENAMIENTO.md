# Modelo de entrenamiento (borrador v0)

Este documento define el dominio antes de escribir código. Es un **borrador para validar**: los números son puntos de partida razonables, no verdades. Cualquier cambio aquí se refleja en `src/engine/model.ts` y en sus tests.

## 1. Entidades

```
Athlete      Datos del usuario: nivel, marca de referencia, tiempo de HYROX opcional, volumen semanal actual de carrera, días disponibles, actividades fijas, material.
FixedActivity  Otro deporte con día fijo (p. ej. pádel): nombre y día de la semana. Cuenta como día duro.
Goal         Carrera objetivo: tipo (5k | 10k | 21k | hyrox), fecha opcional, categoría HYROX si aplica, tiempo objetivo opcional.
Plan         Resultado del generador: lista de semanas desde hoy hasta la carrera o, sin fecha, ciclos continuos.
Phase        Base | Construcción | Específica | Puesta a punto (taper).
Week         Número, fase, si es de descarga, volumen objetivo, sesiones.
Session      Un entreno: tipo, bloques, duración estimada, intensidad. Un día puede tener varias sesiones (p. ej. fuerza y carrera).
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
| `test` | Test para estimar los ritmos (p. ej. 3 km a tope o 30 min continuos) |
| `race` | La carrera objetivo |
| `rest` | Descanso |

### Prescripción de un bloque

Un bloque de carrera se prescribe **por distancia** con un ritmo objetivo (rango en s/km) y una recuperación (distancia o tiempo). Un bloque de estación se prescribe por distancia o repeticiones (según la estación) y una carga de referencia. Un bloque de fuerza: ejercicio, series, repeticiones, RIR objetivo.

## 2. Ritmos

Entrada: una marca elegida por el usuario (distancia + tiempo), p. ej. 10k en 45:00. No hay límite de antigüedad: el usuario decide qué marca le representa hoy.

La marca fija los ritmos. El tiempo objetivo nunca los cambia: solo se compara con la marca para mostrar si es realista.

1. Calcular tiempos equivalentes en otras distancias con la fórmula de Riegel: `T2 = T1 × (D2 / D1)^1.06`.
2. Definir zonas a partir del ritmo de 10k equivalente (s/km). Propuesta inicial:

| Zona | Uso | Ritmo respecto al de 10k |
| --- | --- | --- |
| Z1 | Recuperación | +30 % o más |
| Z2 | Suave / tirada larga | +18 % a +28 % |
| Z3 | Tempo / umbral | +3 % a +7 % |
| Z4 | Series largas (1–2 km) | −2 % a +2 % |
| Z5 | Series cortas (200–800 m) | −8 % a −3 % |

Estos porcentajes son provisionales y deben revisarse con un entrenador. Viven en un archivo de configuración (`src/engine/config.ts`), no repartidos por el código. Para prescribir Z1 se usa +30 % a +40 %; un ritmo registrado más lento sigue siendo Z1.

Las zonas tienen huecos a propósito: esos ritmos no se prescriben. Solo para clasificar lo registrado, cada hueco se reparte entre sus dos zonas por el punto medio (p. ej. entre Z2 y Z3, el límite es +12,5 %).

Sin marca: estimar desde una sesión `test` que la app propone en la primera semana. Hasta tener el resultado, las sesiones se prescriben por sensaciones (RPE), sin ritmos.

Un tiempo de HYROX no sirve como marca: mezcla carrera, estaciones y transiciones, y sus kilómetros se corren ya cansado. Se guarda solo para comparar el progreso y el tiempo objetivo.

## 3. Reglas del generador

- **Periodización** hacia atrás desde la fecha de la carrera: puesta a punto (1–2 semanas), específica, construcción, base. Si hay poco tiempo, se recorta primero la base, salvo a principiantes: a ellos no se les recorta y la app avisa de que el plazo es corto.
- **Sin fecha de carrera:** el plan avanza en ciclos continuos de 4 semanas (3 de carga y 1 de descarga), con fases de base y construcción, sin fase específica ni puesta a punto. Al añadir una fecha, el plan se recalcula hacia atrás desde ella. Esto sirve también para los bloques de running entre competiciones.
- **Volumen:** el plan parte del volumen semanal actual del usuario. La subida semanal de carrera no supera el mayor de estos dos valores: 10 % o +3 km (provisional). Se compara siempre con la última semana normal, no con una de descarga. Cada 3–4 semanas, una semana de descarga (−20 a −30 %).
- **Semana parcial:** si el plan empieza a mitad de semana, esos días son suaves y no cuentan para el volumen. La primera semana completa empieza el lunes siguiente.
- **Distribución de intensidad:** la mayor parte del volumen de carrera (≈ 80 %) en Z1–Z2; el resto de calidad.
- **Días duros:** son los que tienen series, tempo, tirada larga, fuerza pesada de pierna, simulacro, carrera o una actividad fija. Nunca dos días duros seguidos. Dos sesiones el mismo día cuentan como un solo día.
- **Días:** como máximo 2 sesiones de calidad de carrera por semana. La tirada larga, normalmente en fin de semana. Las actividades fijas no se mueven: el plan organiza la semana a su alrededor.
- **Prioridad si no cabe todo:** tirada larga, primera sesión de calidad, primera sesión de fuerza, rodaje, segunda sesión de calidad.
- **Fuerza:** mínimo 1–2 sesiones por semana en todos los planes (en HYROX, más). No poner fuerza pesada de pierna el día antes de series.
- **HYROX:** desde la fase de construcción, al menos una sesión semanal combinada (carrera + estaciones). Carreras comprometidas en la fase específica. Uno o dos simulacros parciales antes de la puesta a punto.
- **Carga de estaciones:** progresa por fases como porcentaje de lo oficial en la categoría del usuario (distancia o repeticiones, y peso), p. ej. del 50 % al 100 %. En cada paso sube una sola variable. Los porcentajes son provisionales y viven en datos, no en el código.
- **Carga de fuerza:** se regula por RIR (repeticiones en reserva): el usuario elige el peso que le deja las repeticiones en reserva indicadas.
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

Distancias, cargas por categoría (Individual, Doubles y Relay; Open y Pro; hombre y mujer) y altura del objetivo de wall balls viven en `src/plans/hyrox-divisions.json`, nunca en el código. Verificados contra los reglamentos oficiales de la temporada 2026/27 el 5 de noviembre de 2026. Hay que revisarlos al empezar cada temporada. La categoría Adaptive queda fuera por ahora: tiene reglamento propio y no se ha revisado.

### Calculadora de parciales (fase 2)

Entrada: tiempo objetivo total y categoría. Salida: ritmo por cada km de carrera, tiempo por estación y tiempo estimado de ROXZONE. El reparto inicial se basará en proporciones configurables, refinables con datos.

## 5. Preguntas abiertas

- ¿Qué porcentajes de zona usamos definitivamente? → revisar con un entrenador o graduado en CAFD.
- ¿Es adecuado el margen de +3 km por semana para quien parte de poco volumen? → revisar con un entrenador o graduado en CAFD.
- Si un principiante tiene poco tiempo y no se le recorta la base, ¿qué fase se acorta?
- ¿Qué porcentajes de distancia y peso usamos en cada fase para las estaciones? → revisar con un entrenador o graduado en CAFD.
- En ciclos continuos, ¿hasta dónde sube el volumen? Sin fecha de carrera, la regla del 10 % o +3 km no tiene final y hace falta un techo.
- ¿Cómo sustituimos estaciones si el usuario no tiene trineo, SkiErg o remo? (tabla de sustituciones por material)
- ¿Cuántas semanas mínimas y máximas admite un plan? (propuesta: 6–24)
- ¿Formato exacto de las plantillas de plan para que sea fácil contribuir?
