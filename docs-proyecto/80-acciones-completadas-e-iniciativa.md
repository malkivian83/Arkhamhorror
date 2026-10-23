# 80 · Acciones completadas y Tomar la iniciativa

Lote `action-history`: **1 código / 1 carta distinta nueva / 0 reediciones**: Tomar la iniciativa (04150), nivel 0.

Solo se compromete a una prueba propia. Sus tres comodines disminuyen en uno por cada acción completada por cualquier investigador durante esta fase, hasta cero. El recuento incluye investigadores eliminados después de actuar y no se reinicia al cambiar de turno. Caduca al cambiar de fase o ronda.

El motor registra `CompleteAction` después de resolver una acción básica o una habilidad de acción. Conserva por investigador la fase, ronda y cantidad. Una habilidad que cuesta dos acciones cuenta una vez; las habilidades rápidas no cuentan. Una acción fallida sí cuenta al terminar. La acción en curso todavía no reduce los iconos: One-Two Punch conserva el mismo recuento durante sus dos ataques y completa una sola acción después de ambos. Las acciones inmediatas cuentan aunque después se restauren los contadores del turno.

Veintidós pruebas cubren vistas previas, reducción y mínimo, compromiso propio, acción en curso, fracaso automático, cambio de fase/ronda, otros investigadores y eliminación, costes múltiples, habilidades rápidas, acciones básicas, acciones inmediatas, One-Two Punch, restauración JSON, finalización tardía y compra/inicio de escenario. Presentación oficial EN/ES, dos escaneos y miniaturas con huellas y revisión visual representativa. Conversión, unicidad y catálogo bajo controles compartidos.

Referencias: [texto oficial](https://arkhamdb.com/card/04150), `Skill/Cards/TakeTheInitiative.hs` y el historial incrementado por `FinishAction` en `Game/Runner.hs` de la aplicación de referencia. La referencia suma historiales de todos los investigadores, incluidos los eliminados, y registra una finalización independientemente del coste de la acción.

Quick Thinking se revisó antes de seleccionar este lote y sigue sin habilitarse. `AfterCurrentSkillTest` permitiría diferir su acción desde los resultados y duplicarla correctamente, pero la revisión de las acciones inmediatas identifica dependencias adicionales: restauran el contador previo incluso durante el turno real del actor (interacción con Pay Day), ofrecen un presupuesto fijo de una acción y pueden restaurar un turno que acaba de terminar. Falta corregir y probar costes adicionales, contadores, final de turno y contextos anidados antes de incorporar esta carta. No se modificó ese comportamiento en este lote.

Acumulado: **576 códigos / 467 familias**. Sobre 104 históricos: **472 altas = 363 registros distintos + 109 reediciones**. Pendientes históricos: **1407 códigos**, incluidas reediciones. Inventarios congelados intactos; publicación y siguiente grupo en el [resumen único](continuacion-importacion.md).
