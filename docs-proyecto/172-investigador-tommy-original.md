# 172 · Tommy Muldoon original

Cuatro códigos y diseños nuevos: investigador 06001, Becky 06006, Error de
novato 06007 y la carta estándar Voto solemne 06020. Cero reediciones. Las dos
exclusivas quedan contabilizadas con su perfil para no reimportarlas después.
Total: 43 perfiles habilitados, 25 pendientes y 132 cartas estándar pendientes.

El perfil `tommy-original` conserva el mazo [FFG 50689](https://arkhamdb.com/decklist/view/50689)
con sus códigos y cantidades, incluidas las tres copias de Voto solemne. Solo
se sustituye 01000 por 12104. `tommy`, el investigador de 2026 (60151), mantiene
su mazo y reglas independientes.

## Reglas y conexiones

- La reacción del Tommy original se ofrece cuando su apoyo es derrotado, antes
  de que se descarte. Gana recursos por todo el daño y horror que tenga y baraja
  esa copia en el mazo de su propietario. No consume copias anteriores del
  descarte, no tiene límite por ronda y puede rechazarse.
- La ventana de derrota se activa expresamente mediante
  `observesAssetDefeat`; los demás investigadores conservan su resolución.
  Las sustituciones obligatorias del propio apoyo se resuelven primero. Los
  compañeros de expedición pueden generar la recompensa pero siguen su destino
  de campaña: nunca entran en el mazo de jugador.
- Becky ocupa dos manos. Su ataque gasta una munición, da +2 combate y añade un
  daño. Cada recurso de la reacción puede sustituirse por una munición en Becky;
  se elige cuántos se convierten y se reciben los restantes. Sin su texto activo
  no se ofrece esa conversión.
- El signo arcano da +2 y permite mover hasta dos fichas de daño/horror entre
  Tommy y un único apoyo controlado, en una dirección elegida. Se puede parar
  tras una ficha; se respetan los valores de salud/cordura y las derrotas.
  Mover fichas no es curar ni infligir daño.
- Error de novato descarta todos los apoyos controlados con daño u horror, sin
  derrotarlos ni generar la recompensa. Se comprueba el descarte efectivo: si
  ninguno se descartó, incluso por una prohibición de abandonar el juego, la
  debilidad vuelve al mazo y no se duplica en el descarte.
- Voto solemne se juega bajo el control de otro investigador presente, sin
  perder su propietario original. La entrada ocurre directamente bajo ese
  control; el evento «después de jugar» se atribuye a quien lo jugó, no al nuevo
  controlador. Su capacidad mueve una ficha desde una carta del controlador a
  otra que controle el propietario, presente en su localización, y agota el
  Voto. Se permite que el propietario recupere después su control, pero nunca
  se ofrece mover la ficha de una carta a sí misma. Myriad admite tres copias.

Fuentes: [Tommy original](https://arkhamdb.com/card/06001),
[Becky](https://arkhamdb.com/card/06006),
[Error de novato](https://arkhamdb.com/card/06007) y
[Voto solemne](https://arkhamdb.com/card/06020). Se aplican las reglas de derrota,
ventanas «cuando/después», propiedad/control, sustituciones, movimiento de
daño/horror y Myriad. Se archivan las fuentes oficiales EN/ES y sus SHA-256.

## Presentación y validación

Textos y narración oficiales EN/ES, anverso/reverso, retrato, miniaturas,
changelog y caché v24. Los inventarios conservan 8042 originales y 8042
miniaturas, verificados por huella. Muestras españolas revisadas sin navegador.

Pruebas del efecto principal y restricciones de los cuatro códigos; integración
del mazo oficial, campañas, perfiles separados, Myriad, tienda, unicidad,
reproducción de fuentes, EN/ES y restauración de una reacción pendiente. Se
amplía al motor y a consumidores de derrota, movimiento, apoyos y expedición.
Formato/lint propios, tipos de engine/cards/server, selector local de CI y
bundle Vite (sin copiar `public`, cuyos recursos se verifican por separado).

La primera CI completa detectó 19 fallos en cuatro archivos de pruebas
anteriores: duplicados de habilidades con máximo de una por prueba y la
preparación de Amanda sin terminar su elección obligatoria. Se corrigieron los
casos de prueba con Fey (dos comodines sin ese máximo) y se resolvió la elección
antes del primer turno, incluyendo los robos de debilidades. Los 111 casos de
esos cuatro archivos quedan comprobados, manteniendo efectos, iconos, límites,
grupos mínimos y copias físicas; las reglas de producción no se modifican.

## Trabajo viable y pendientes

Darrell no se habilita con una lista incompleta. La lista popular 39472 requiere
27 XP y varias cartas aún pendientes. Las listas iniciales revisadas 40149,
41048, 43198, 46920, 40462 y 65688 dependen de Hipótesis empírica 09041;
50223 depende de la personalizable 09101. Faltan las mejoras completas y, entre
otras conexiones, atribuir descartes desde el juego y observar transiciones de
mano vacía. No se sustituyen esas cartas ni se crea un mazo propio.

La selección independiente del Tommy original permitió incorporar un perfil y
una carta estándar completos. Patrice y los bloqueos anteriores permanecen
descritos en el resumen de continuación.
