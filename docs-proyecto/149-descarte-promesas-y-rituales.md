# 149 · Descarte, promesas y rituales

Lote `discard-rituals`: siete códigos y siete cartas/niveles estándar nuevos;
cero vinculadas o reediciones. Fuentes EN/ES, huellas y aprobaciones conservadas
en `packages/cards/src/discard-rituals/`, sobre el catálogo histórico `3c8ee4b5d8100766`.

## Reglas revisadas

- `06203` Piedra lunar (0): no se juega ni se compromete desde la mano. Tras
  descartarse de ella puede jugarse desde el descarte pagando sus recursos, sin
  acción ni ataque de oportunidad. Conserva restricciones de participación y juego;
  exiliarla no cuenta como descartarla. En juego concede +1 Voluntad y Agilidad.
- `07265` Geis (2), Excepcional: elige una promesa al entrar en juego, guardada
  en ese apoyo físico; +1 a las cuatro habilidades. Romperla durante el turno
  propio descarta el apoyo y añade hasta diez maldiciones según la reserva.
  Robar incluye cartas de Encuentro y otras procedencias, según la
  [aclaración oficial de mayo de 2025](https://arkhamdb.com/card/07265).
  Jugar la propia Geas ocurre antes de escoger la promesa y no la incumple.
- `10091` Hablar con los muertos (0): acción de parlamentar, sin ataque de
  oportunidad; gasta las ofrendas elegidas y revela esa cantidad de fichas físicas,
  retenidas hasta terminar. Una calavera o maldición permite recuperar el evento
  Hechizo/Ritual elegido del descarte. Fuera de una prueba no se resuelven los
  efectos de esas fichas; se conserva el tratamiento compartido de cancelación,
  fichas retenidas y revelaciones durante una prueba. No se ofrece gastar cero:
  no permitiría cambiar el estado con el efecto de la capacidad.
- `10099` Llamar al más allá (2): añadir tres maldiciones es coste adicional;
  exige reserva suficiente. Rellena cargas o secretos hasta la cantidad inicial
  impresa/calculada, sin bonificaciones por entrar en juego, sin retirar usos
  sobrantes ni preparar el apoyo. Puede resolver una capacidad de ese apoyo o
  declinar, después de reponer efectivamente usos (RR Then); conserva usos, agotamiento, recursos, límites y acciones posteriores
  al primer símbolo. Incluye capacidades rápidas.
- `08076` Quemar después de leer (1): exilia directamente desde la mano una
  carta de nivel 0–5; descubre dos pistas; retira una perdición del plan actual
  si el nivel exiliado era al menos dos; se exilia a sí misma. Los niveles de
  personalización se calculan con el investigador. Son efectos independientes,
  sin «entonces»: aplica cuanto puede si no hay otra carta elegible, de acuerdo
  con RR Effects / Do as Much as You Can. Se usa el texto impreso, sin Tabú.
- `09052` Acertijo existencial (1): parlamentar con un Enemigo no Élite en el
  Lugar, a elección con Voluntad o Intelecto; dificultad 8 menos las cartas que
  quedan en mano, incluidas Debilidades. Al superar evita y se adjunta desde
  el descarte; concede Indiferente mientras permanezca adjunta. Al fallar no
  evita ni se adjunta. El adjunto vuelve al descarte al salir su Enemigo.
- `09088` Sucesión de maldiciones (0): parlamentar con un Enemigo no Élite del
  Lugar. Evitarlo, añadir perdición sin comprobar avance, impedir todo daño
  hasta el final de ronda y descubrir una pista; o derrotarlo si ya tiene
  perdición y obtener tantos recursos como perdición tenía. Impedir daño no
  impide derrotar. Ambos eventos excluyen objetivos inmunes.

## Motor y presentación

Se añaden estado serializable de capacidades en apoyos, reacción desde descarte,
restricción de juego/compromiso desde la mano, exilio desde mano sin descarte,
palabras clave concedidas por adjuntos y prevención temporal de daño a Enemigos.
La resolución gratuita compartida admite capacidades rápidas expresamente;
los consumidores anteriores conservan su selección de capacidades de acción.

Nombres, textos, rasgos, escaneos y miniaturas oficiales EN/ES. «Novedades»
actualizado. Sin pruebas de navegador; se reutiliza la presentación existente.
Las pruebas cubren reglas, registro, compra/preparación, presentación, fuentes
y duplicados. Resultados finales y siguiente grupo en el resumen de continuación.
