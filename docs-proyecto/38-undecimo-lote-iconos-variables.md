# 38 · Undécimo lote: habilidades con iconos variables

21/10/2026. Se confirmó la CI y el despliegue del lote anterior (ddaa154). Este lote incorpora **diez códigos, diez cartas o niveles distintos nuevos y cero reediciones**.

| Código | Carta | Nivel | Condición de los iconos adicionales |
| --- | --- | ---: | --- |
| 05022 | Steadfast | 0 | Salud y cordura restantes en conjunto: umbrales 5 y 10 |
| 05026 | Curiosity | 0 | Mano actual: umbrales 4 y 7 |
| 05030 | Cunning | 0 | Recursos actuales: umbrales 5 y 10 |
| 05034 | Prophesy | 0 | Perdición en juego: umbrales 3 y 6 |
| 05038 | Able Bodied | 0 | Apoyos Objeto controlados: hasta 1, 2 o más de 2 |
| 02260 | Leadership | 0 | Ayuda a otro investigador |
| 51010 | Rise to the Occasion | 3 | Diferencia entre dificultad y habilidad básica, con límite 3 |
| 10051 | Well-Funded | 0 | Apoyos Ciencia o Herramienta controlados: 1 y 3 |
| 10130 | Well-Dressed | 0 | Prueba durante una acción de negociar |
| 60572 | Rough | 1 | Daño propio dividido entre dos, redondeando hacia arriba |

## Motor y revisión

El registro de comportamiento permite declarar iconos adicionales evaluados con el estado actual, la prueba y el investigador que compromete la carta. El mismo cálculo alimenta las opciones de compromiso, las aportaciones ajenas, el compromiso desde descartes, las ventanas tardías y el valor final de la prueba. Se conservan los iconos impresos y se añaden únicamente los iconos coincidentes con la habilidad de la prueba y los comodines.

Curiosity deja de contar su propia carta en mano al comprometerla. Leadership cuenta los iconos adicionales del ayudante, aunque la prueba la resuelva otro investigador. Well-Funded cuenta una vez cada apoyo que tenga ambos rasgos y no cuenta apoyos de otros investigadores. Prophesy incluye la perdición del plan, investigadores, enemigos, apoyos controlados y apoyos colocados. Rise to the Occasion de nivel tres exige una prueba propia cuya dificultad supere la habilidad básica; el cálculo del bono no incluye modificadores temporales.

Las pruebas reprodujeron primero la ausencia de iconos adicionales en el cálculo y en la interfaz. Las pruebas individuales cubren los umbrales y límites, la presentación del número actual de iconos y la entrada en un mazo legal o compra con experiencia que llega al inicio de un escenario. Las regresiones comprueban además un éxito real gracias al bono, la ayuda de Leadership, la perdición repartida en distintas cartas y la combinación de rasgos y propietarios.

Se añadieron nombres y resúmenes propios EN/ES y presentación por el renderizador existente. Las relaciones de reedición se usan para comprobar que ninguna de las diez familias estaba ya representada; no se activa automáticamente el resto del inventario.

## Trazabilidad y recuentos

- Fuente inmutable: packages/cards/src/catalog/imports/3c8ee4b5d8100766. Se mantienen los inventarios y huellas históricos.
- Aprobaciones y revisión: packages/cards/src/variable-icons/approvals.json, junto con un módulo y una prueba por carta.
- Regeneración: node scripts/prepare-dunwich-pilot.mjs variable-icons.
- Acumulado añadido: **187 códigos = 106 cartas o niveles distintos nuevos + 81 impresiones adicionales**.
- Con los 104 registros originales: **291 registros y 210 familias canónicas**.
- Del inventario histórico de 1983 códigos quedan **1692 códigos sin incorporar**. Este número incluye reediciones y no representa el número de cartas distintas pendientes.
