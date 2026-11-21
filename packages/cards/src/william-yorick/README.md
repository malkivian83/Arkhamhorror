# William Yorick · preparación pendiente

Fuentes originales EN/ES para `03005`, `03016` y `03017`, y lista exacta
[FFG 4816](https://arkhamdb.com/decklist/view/4816/william-yorick-starter-deck-ffg-1.0).
La lista conserva sus códigos: treinta cartas normales, ambas exclusivas y `01000`.
Solo se elimina la descripción de la lista archivada.

Este paquete no está registrado ni aprobado para jugar y no incrementa los
recuentos de cartas o investigadores habilitados. Las fuentes no son una
implementación de reglas. No añadir otro lote de datos para estos tres códigos.

Reglas implementadas y probadas de forma aislada en `rules.test.ts`:

- Yorick: derrota propia, apoyo pagado desde descarte, límite por ronda y signo
  arcano +2 con recuperación solo mediante la continuación de éxito.
- Muertos y enterrados: derrota de cualquier investigador en el lugar propio,
  exclusión de Élite, traslado del enemigo derrotado desde su descarte y del
  evento a victoria, sin duplicar enemigos que ya tenían victoria.
- Gules del cementerio: valores impresos, Humanoide/Monstruo/Gul, Cazador, presa
  exclusiva y bloqueo del descarte del investigador enfrentado.

El motor protege mezcla, compromiso directo y sus menús, victoria, vinculaciones
con enemigos/lugares/apoyos, sellado, almacenamiento y cartas puestas aparte.
Se conservan las cartas físicas y el estado del generador aleatorio al bloquear
un movimiento. Las copias de eventos que no están en descarte no se bloquean.

Pendiente antes de registrar el paquete y habilitar su mazo:

- Separar el evento normal en resolución de las cartas que ya estaban en
  descarte: actualmente se guarda provisionalmente allí y el bloqueo impediría
  retirarlo o vincularlo, aunque todavía no debería considerarse descartado.
- Revisar productores de movimientos compuestos, especialmente Flujo cuántico
  (03196): retirar cartas y añadirlas después al mazo en mensajes separados
  permite duplicarlas cuando la primera parte queda bloqueada. Conectar los
  movimientos a su zona de origen y cubrir el caso.
- Filtrar objetivos y costes de recuperación/retirada; Salvamento (09116) no
  debe dar recursos sin retirar el objeto, ni Encuentro fortuito ofrecer un
  aliado del descarte bloqueado.
- Registro global, diagnóstico de la lista exacta, imágenes/miniaturas/retrato,
  caché y changelog. Los textos y narraciones oficiales EN/ES ya se incorporaron.

Verificación: 344 pruebas de fuentes, motor, Yorick, copias de Sefina y vinculaciones;
tipos cards (incluye motor), formato y lint. Cambios en descarte, derrota,
victoria, juego, copias, vinculaciones o estado del enfrentamiento invalidan
los controles afectados. Las fuentes originales conservan sus bytes.

Validación de fuentes: `pnpm test packages/cards/src/william-yorick/source.test.mjs`.
El diagnóstico completo con `check-decklist.mjs --file` se interrumpió sin
resultado al no finalizar la carga del registro; no se considera superado.
