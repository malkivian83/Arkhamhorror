# Avance visual de actos y planes

19/10/2026. Base: `2f4b01dbc40c081dc3e708581b1257deec248ecd`.

Al avanzar, la mesa muestra una secuencia obligatoria de pantallas con las
cartas y los cambios reales del escenario. Cada pantalla requiere **Aceptar**.
El motor aplica los efectos automáticamente; el jugador no tiene que mover
cartas, repetir pagos ni seguir manualmente las instrucciones del reverso.

## Recorrido

1. Pago de pistas, cuando lo hay, con los valores anterior y posterior.
2. Anverso y reverso del acto en grande, junto con el texto traducido disponible.
3. Cartas que salen, entran o cambian, en el orden de los efectos del motor.
   Los enemigos indican su lugar; los apoyos, su controlador o vinculación.
   Se distingue si una carta está preparada o agotada.
4. Cambios de pistas, recursos, daño, horror y desplazamientos de investigadores.
5. Siguiente acto cuando se ha completado el reverso, o cierre del escenario.

Si el reverso requiere una decisión del jugador, se anuncia y después se
presenta la pregunta de la mesa. Al contestarla, el sistema continúa y muestra
las consecuencias antes de permitir otra decisión. Nunca elige por el jugador
un pago colectivo, un objetivo, una reacción o una opción de historia.
El mismo recorrido se aplica a los planes.

## Guardado y garantías

- Las pantallas pendientes se guardan junto con el estado y el historial.
  Recargar o importar conserva exactamente el punto de lectura.
- Aceptar no añade entradas al historial ni vuelve a ejecutar reglas. Las
  entradas del motor producen el mismo estado con y sin observador visual.
- Mientras hay pantallas pendientes, el almacén bloquea respuestas de la mesa
  y el cierre del escenario. Escape no salta la aceptación.
- Deshacer elimina la secuencia anterior; volver a avanzar genera una nueva.
- Los guardados antiguos sin secuencia siguen siendo compatibles. Si estaban
  a mitad de un reverso, se recupera su lectura y la decisión pendiente.
- Las cartas hechizadas boca abajo no revelan su identidad. Los lugares sin
  revelar usan su cara correspondiente. Las imágenes siguen siendo locales.
- No cambia la revisión de reglas ni el formato del guardado. Se retira el
  detector anterior, que agrupaba únicamente el registro final del avance.

## Comprobación

Regresiones específicas en `advanceReview.test.ts` (12 casos) y
`stores/advanceReview.test.ts` (4 casos): pago, interrupción y continuación del
reverso, dos avances seguidos, cartas ocultas, destinos, guardado, importación,
recarga, deshacer, bloqueo de respuestas y aceptación sin efectos duplicados.

La comprobación de interfaz utilizó importaciones normales del programa:

| Mesa | Alcance | Resultado observado |
| --- | --- | --- |
| Brethren, Spreading Flames | Prefijo de partida legal conservada | Pago, ambas caras, dos lugares, Sirviente, ¡Fuego! y acto 2, con aceptación entre pasos |
| Brethren | Recarga y Escape durante el reverso | Se conserva la pantalla; Escape no la cierra |
| La Gala | Mesa dirigida con cartas registradas, no una victoria legal | El acto 1 espera al interludio; después muestra facción, Declan, Joya y acto 2 |
| La Gala, 390 × 640 | Ventana móvil de comprobación | Cartas apiladas, desplazamiento y botón de aceptación accesible |

El generador reproducible es `scripts/prepare-act-review-ui.mjs`; requiere
primero los archivos de `scripts/prepare-presentation-ui.mjs` en la misma
carpeta de salida. Las capturas se conservan en
[evidencias/avance-actos/](evidencias/avance-actos/).

Esta entrega mejora la presentación y no cierra G17/G18 de La Gala. La prueba
en un teléfono físico continúa pendiente por decisión del usuario.

Validación final: **573 pruebas en 42 archivos**, tipos de los seis proyectos,
lint, formato, compilación web e integridad de las 566 imágenes locales.
El JavaScript compilado ocupa 695,23 kB (208,00 kB comprimido). Continúan los
avisos de compilación ya existentes sobre la fuente de iconos y el tamaño del
bundle. La revisión visual queda registrada en
[comprobacion.json](evidencias/avance-actos/comprobacion.json).
