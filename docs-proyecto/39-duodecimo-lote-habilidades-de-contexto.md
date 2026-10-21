# 39 · Duodécimo lote: habilidades según el contexto y el resultado

21/10/2026. CI y despliegue de 2d09578 comprobados. El lote incorpora **nueve códigos, nueve cartas o niveles distintos nuevos y cero reediciones**.

| Código | Carta | Nivel | Comportamiento revisado |
| --- | --- | ---: | --- |
| 60168 | Armed to the Teeth | 0 | Dos comodines adicionales en pruebas de un apoyo Objeto propio |
| 60369 | Easy Street | 0 | Prueba propia, máximo una copia; comodines según recursos, con límite tres adicionales |
| 03272 | "Not without a fight!" | 0 | Exige enfrentamiento; iconos según enemigos enfrentados |
| 11057 | Crack Shot | 0 | Exige una prueba de un apoyo propio Arma de fuego o A distancia |
| 60467 | Blood Curse | 0 | Máximo una copia; daño directo a quien la compromete si tiene éxito |
| 60468 | Cosmic Guidance | 0 | Cura daño al investigador que realiza la prueba si tiene éxito |
| 60370 | Out the Door | 0 | El investigador que realiza la prueba gana dos recursos al comprometerla y pierde dos si falla |
| 60373 | Out the Door | 1 | Versión de cuatro recursos; cuenta como nivel distinto, no como reedición |
| 60568 | Do-or-Die | 0 | Recupera un apoyo o evento Superviviente del descarte propio tras un éxito |

## Revisión e integración

Los bonos y restricciones reutilizan los mecanismos de compromiso e iconos variables ya revisados. El origen de una prueba se contrasta con la instancia del apoyo en juego, sus rasgos y su controlador. Un código de evento o un apoyo de otro investigador no cumple esa condición. El recuento de enemigos enfrentados incluye los Enormes preparados en la localización.

Se distingue al investigador que realiza la prueba del que compromete la habilidad: Cosmic Guidance y Out the Door afectan al primero; Blood Curse y Do-or-Die afectan al segundo. La recuperación consulta el descarte al resolver cada copia y filtra clase y tipo, evitando decisiones obsoletas cuando se comprometen dos copias. La pérdida de recursos respeta el mínimo cero, aunque parte de los recursos ganados ya se haya gastado.

Se reprodujeron dos defectos en la interacción con Isabelle: el camino especial desde descartes omitía los efectos al comprometer y la selección mostraba habilidades cuyas restricciones no se cumplían. El compromiso especial utiliza ahora el mismo camino validado que las demás cartas, incluyendo efectos y disparadores; conserva explícitamente el barajado posterior de Isabelle. Sus opciones usan la misma comprobación de legalidad, incluidos iconos variables y límites por título. Las pruebas cubren el efecto inmediato de ambas versiones de Out the Door desde descartes y su destino al terminar la prueba, y se ejecuta la prueba de cierre del investigador.

Cada carta cuenta con módulo y prueba propios. Se comprueban éxito, fracaso cuando corresponde, ayuda de otro investigador, umbrales, origen, control, límites y entrada en un mazo legal o compra con experiencia que llega al inicio de un escenario. Se incorporan nombres y resúmenes propios EN/ES mediante el renderizador existente.

## Trazabilidad y recuentos

- Fuente inmutable: packages/cards/src/catalog/imports/3c8ee4b5d8100766. No se modifican manifiestos, inventarios ni huellas históricos.
- Revisión: packages/cards/src/context-skills/approvals.json y pruebas individuales y de regresión en la misma carpeta.
- Regeneración: node scripts/prepare-dunwich-pilot.mjs context-skills.
- La prueba de unicidad compara códigos y familias canónicas con todos los lotes anteriores y el básico.
- Acumulado añadido: **196 códigos = 115 cartas o niveles distintos nuevos + 81 impresiones adicionales**.
- Con los 104 registros originales: **300 registros y 219 familias canónicas**.
- Del inventario histórico de 1983 códigos quedan **1683 códigos sin incorporar**; incluyen reediciones y no equivalen a 1683 cartas distintas pendientes.
