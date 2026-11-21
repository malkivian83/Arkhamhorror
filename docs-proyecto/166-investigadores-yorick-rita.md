# 166 · William Yorick y Rita Young

Dos investigadores completos con sus exclusivas, debilidades y mazos iniciales
seleccionables. **Seis códigos habilitados**: 03005/03016/03017 y
05005/05016/05017. Los tres de Yorick ya estaban preparados; los tres de Rita
son datos nuevos. Seis diseños distintos habilitados, ninguna reedición de
relleno y ninguna carta estándar nueva. Las copias físicas de una lista no se
cuentan como diseños adicionales.

## Reglas y conexiones

- Yorick juega un apoyo del descarte tras derrotar personalmente a un enemigo,
  paga los costes y respeta restricciones y límite por ronda. Su signo arcano
  da +2 y permite recuperar una carta solo si la prueba tiene éxito.
- Muertos y enterrados acepta una derrota de otra persona en el lugar propio,
  excluye Élite y mueve el enemigo y el evento a victoria. No duplica los
  enemigos que ya fueron a victoria al ser derrotados.
- Gules del cementerio conserva sus valores, Cazador y presa exclusiva. El
  bloqueo afecta al descarte de quien esté enfrentado al enemigo, incluso si
  está agotado, y termina al cesar el enfrentamiento.
- Los eventos normales tienen una identidad de resolución separada de las
  copias antiguas del descarte, aunque el almacenamiento interno conserve un
  búfer provisional. `actualDiscard` expone solo el descarte físico y
  `movableDiscard` aplica además el bloqueo. La excepción para mover la propia
  fuente exige su identidad y procedencia; no permite retirar una segunda copia.
  La mesa local y la vista online no muestran ese búfer como descarte.
- Flujo cuántico mueve cartas desde su zona real en una sola operación de mezcla;
  si el descarte está bloqueado no crea copias, pero resuelve el robo posible.
  Salvamento, Encuentro fortuito y las demás selecciones de recuperación afectadas
  excluyen objetivos bloqueados antes de pagar o gastar usos.
- Rita puede infligir un daño al enemigo evitado o moverse a un lugar conectado,
  una vez por ronda. Su signo arcano da +2 e ignora el límite durante esa ronda,
  incluso si ya había usado la reacción.
- «¡Se acabó el huir!» solo se juega durante su turno: prepara y enfrenta los
  enemigos locales y permite sustituir agotamiento/desenfrentamiento por daño
  durante el resto del turno. Conserva las demás consecuencias de evitar con
  éxito, incluida la reacción de Rita. Es una sustitución opcional y no persiste
  en otro turno.
- Encapuchados conservan Alerta, Cazador y presa exclusiva; atacan tras ser
  evitados incluso agotados y sin estar enfrentados.

Las pruebas cubren reglas, límites, costes, procedencia, copias antiguas,
resoluciones anidadas, guardados, mazos exactos, registro único, recuperación,
presentación EN/ES y proyección online. Las comprobaciones finales y el estado
de CI se mantienen únicamente en el resumen de continuación.

## Listas y presentación

- [William Yorick, FFG 4816](https://arkhamdb.com/decklist/view/4816/william-yorick-starter-deck-ffg-1.0).
- [Rita Young, FFG 11961](https://arkhamdb.com/decklist/view/11961/rita-young-starter-deck-ffg-1.0).

Listas archivadas sin descripción, conservando códigos y cantidades. Cada una
tiene treinta cartas ordinarias, dos exclusivas y el marcador de debilidad básica
aleatoria 01000, sustituido en el inicio de campaña por 12104 como en los mazos
anteriores. La integración comprueba todas las cartas implementadas, construcción
legal y comienzo de campaña. Se usa esta validación ante el bloqueo de carga SSR
ya documentado del diagnóstico CLI; no se declara superado ese comando.

Textos, narraciones y reversos oficiales EN/ES, dieciséis escaneos y miniaturas,
dos retratos y sus huellas en
[recursos originales](evidencias/yorick-rita-recursos-oficiales.json).
Se conservan los registros y huellas históricos. Revisadas muestras españolas en
el visor local; sin navegador. Novedades añadidas al changelog y caché v18.

Tras el lote: **33 personajes habilitados y 35 pendientes**, excluyendo
alternativas, reediciones y Homúnculo perdido. Quedan **134 cartas estándar**
pendientes. Los seis códigos de este lote ya están registrados y no deben
reimportarse al preparar otros investigadores.
