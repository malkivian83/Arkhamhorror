# William Yorick · preparación pendiente

Fuentes originales EN/ES para `03005`, `03016` y `03017`, y lista exacta
[FFG 4816](https://arkhamdb.com/decklist/view/4816/william-yorick-starter-deck-ffg-1.0).
La lista conserva sus códigos: treinta cartas normales, ambas exclusivas y `01000`.
Solo se elimina la descripción de la lista archivada.

Este paquete no está registrado ni aprobado para jugar y no incrementa los
recuentos de cartas o investigadores habilitados. Las fuentes no son una
implementación de reglas. No añadir otro lote de datos para estos tres códigos.

Pendiente de implementación y pruebas:

- Yorick: reacción solo tras una derrota propia, una vez por ronda; jugar un
  apoyo del descarte pagando costes y respetando restricciones. Signo arcano
  +2 y recuperación de una carta solo tras éxito.
- Muertos y enterrados: ventana tras derrota de un enemigo no Élite en el
  lugar propio, aunque lo derrote otra persona; enemigo y evento a victoria,
  con el punto de victoria del evento.
- Gules del cementerio: presa exclusiva, Cazador y bloqueo de cualquier salida
  del descarte del investigador enfrentado, incluidos juego, recuperación,
  mezcla al agotar mazo, costes y retirada del juego. El bloqueo termina al
  dejar de estar enfrentados; no se limita a Yorick.
- Registro de mazo, presentación EN/ES, recursos y pruebas de integración.

Validación de fuentes: `node --test packages/cards/src/william-yorick/source.test.mjs`.
El diagnóstico completo con `check-decklist.mjs --file` se interrumpió sin
resultado al no finalizar la carga del registro; no se considera superado.
