# 60 · Jenny Barnes y la lista «Campaign-Breaker»

22/10/2026. Petición: subir la [lista 1179 de ArkhamDB](https://arkhamdb.com/decklist/view/1179/jenny-campaign-breaker-barnes-1.0)
con su investigadora y todas sus cartas. El procedimiento general está en la
[guía 59](59-guia-importar-lista-arkhamdb.md).

## Recuento

Lote `jenny-barnes`: **6 códigos / 6 cartas distintas nuevas / 0 reediciones**:
02003 Jenny Barnes, 02010 Jenny's Twin .45s, 02011 Searching for Izzie,
01024 Dynamite Blast, 01050 Elusive y 02147 Bandolier. Las otras 16 entradas de
la lista ya eran jugables; `01000` es el marcador de debilidad aleatoria. La lista
tiene 30 cartas que cuentan para el tamaño, cinco de ellas de nivel 0 de otras
clases (Dynamite Blast, dos Arcane Studies, Bandolier y Prepared for the Worst),
justo el máximo permitido. Solo se incorpora la Jenny original con sus exclusivas
primarias; sus variantes 90084–90086 y 98002–98003 quedan fuera.

## Reglas

- **Jenny Barnes.** Construcción: Rebelde y neutral 0–5, más hasta cinco cartas de
  nivel 0 de otras clases, con el límite compartido de Pete. Recibe 1 recurso
  adicional en el paso de recursos del mantenimiento (no en la acción Recurso).
  Signo arcano: +1 por cada recurso que tenga al revelarse la ficha.
- **Jenny's Twin .45s.** Coste X: al jugarla se elige X entre 0 y los recursos
  disponibles, se paga X y entra con X municiones. Si se pone en juego sin
  jugarla, X es 0. La acción gasta 1 munición: Combatir con +2 y +1 daño.
  Ocupa las dos manos.
- **Searching for Izzie.** Se vincula al lugar más alejado de Jenny por
  conexiones; si hay empate, elige Jenny. Cualquier investigador en ese lugar
  puede usar su habilidad de dos acciones (provoca ataques de oportunidad):
  investigar con el velo del lugar y, si tiene éxito, descartarla en lugar de
  descubrir pistas. Si sigue en juego al terminar la partida o al eliminar a
  Jenny, ella sufre 1 trauma mental. El motor ahora incluye las debilidades
  propias vinculadas fuera de la zona de amenaza en esos efectos finales.
- **Dynamite Blast.** Tu lugar o uno conectado; 3 daños a cada enemigo y a cada
  investigador allí, incluido quien la juega. Primero se coloca el daño de los
  enemigos sin comprobar derrotas, después reciben daño los investigadores y al
  final se comprueban las derrotas de los enemigos, atribuidas a quien la jugó.
- **Elusive.** Rápido y solo en tu turno. Deja de estar enfrentado a todos los
  enemigos y se mueve a cualquier lugar revelado sin enemigos, respetando las
  restricciones de salida y entrada. Si no hay ninguno, solo desenfrenta. El
  escaneo español de primera impresión dice «Lugar conectado»; se aplica el texto
  vigente de ArkhamDB en ambos idiomas: «Lugar revelado», sin exigir conexión.
- **Bandolier.** Una ranura de mano adicional solo para apoyos Arma. Un arma de
  dos manos puede ocuparla junto con una mano normal. Al jugar un apoyo sin sitio
  se ofrecen solo los descartes que liberan espacio. Si Bandolier abandona el
  juego, el dueño descarta apoyos hasta que los restantes quepan.

## Motor

Capacidades generales añadidas, reutilizables por otras cartas:

- `InvestigatorBehavior.upkeepResources`: recursos adicionales del mantenimiento.
- `PlayerCardBehavior.costX`: pregunta por X al pagar; un apoyo entra con X usos.
- `PlayerCardBehavior.restrictedSlots`: ranuras extra limitadas a un rasgo. La
  comprobación de ranuras pasa a ser una asignación de cada ranura ocupada a una
  normal o a una restringida compatible; se aplica al jugar, al cambiar de
  control y cuando una carta que da ranuras abandona el juego (`CheckSlots`).
  `restrictedSlotCapacity` se exporta para la interfaz.
- `DamageEnemy.deferDefeat` y `CheckEnemyDefeat.by` para daño simultáneo.

Esto levanta dos bloqueos de la [continuación](continuacion-importacion.md):
«ranuras por rasgo» (otras cartas como Sign Magick o Familiar Spirit pueden usar
`restrictedSlots` tras revisar sus diferencias) y «Dynamite Blast simultáneo»
para el nivel 0. Dynamite Blast 2/3 no se ha revisado.

**Limitación conocida:** el daño de los investigadores se asigna uno a uno y cada
investigador comprueba su derrota al terminar de asignar el suyo, antes de las
derrotas de enemigos. Si la explosión derrota al último investigador, la partida
termina sin derrotar a esos enemigos.

## Presentación y recursos

Textos oficiales EN/ES de ArkhamDB como respaldo local; el paquete `dwl` en línea
amplía su filtro a los tres códigos de Jenny (caché `v5`). Catorce escaneos
oficiales (anverso y reverso de Jenny y las otras cinco cartas en EN y ES), sus
miniaturas y el retrato `/local-assets/setup/02003.jpg`, descargados con
`scripts/import-card-images.mjs` desde las rutas de la referencia. Procedencia,
tamaños y SHA-256 en `evidencias/jenny-recursos-oficiales.json` y en los
inventarios existentes, sin alterar las entradas anteriores. Se revisó una hoja de
contacto de las siete artes en español. La pantalla de nueva partida ofrece a
Jenny con un mazo inicial igual a la lista, con Wounded como debilidad básica.

## Validación

- 32 pruebas dirigidas del lote y de la reproducción de datos, más la prueba web
  de presentación (escaneos, reverso, coste X y nombres EN/ES).
- Controles completos sobre una copia de `main` 58dfbe8: formato, lint, tipos y
  build correctos. Suite: 2555 pruebas correctas, 17 omitidas y el timeout
  preexistente de la matriz de 960 preparaciones, que pasa al repetirla aislada
  con 30 s (44 correctas).
- Una partida grabada (equipo 2 en normal) detectó que filtrar los descartes por
  falta de ranura cambiaba las opciones de siempre; el filtro se aplica solo
  cuando hay ranuras restringidas y la grabación vuelve a coincidir.
- 1343 miniaturas en el inventario: las 14 nuevas y las 1329 anteriores intactas.
- Revisión en el build servido: Jenny aparece en nueva partida como Rebelde con
  su retrato; los escaneos se sirven como AVIF.
- Datos regenerables con `node scripts/prepare-jenny-barnes.mjs` desde el
  inventario congelado `3c8ee4b5d8100766`.
- `node scripts/check-decklist.mjs 1179` tras el lote: 22 jugables y 0 por
  implementar.
