# 148 · Acciones y activaciones adicionales

Lote `extra-actions`: ocho códigos, ocho cartas o niveles estándar nuevos y cero
reediciones. Incluye los dos niveles de Carta de los evos; no incorpora cartas
vinculadas. Fuentes EN/ES, huellas y aprobaciones en
`packages/cards/src/extra-actions/`; catálogo histórico `3c8ee4b5d8100766` conservado.

## Reglas revisadas

- `05040` As de bastos (1): puede entrar desde cada copia de la mano inicial.
  Retirarlo durante el turno guarda una acción adicional hasta usarla o terminar
  ese turno. El botón de su acción permanece disponible al agotar las ordinarias.
  Solo durante esa acción y sus pruebas se reciben las cuatro bonificaciones de
  +2; no se aplican a las acciones ordinarias realizadas mientras está guardada.
- `06239` Celeridad (2): límite de una por investigador. Observa acciones realmente
  realizadas, no habilidades rápidas, y conserva todos los tipos simultáneos de
  una acción. Dos activaciones de Linterna permiten otra activación o investigación.
  Parlamentar cuenta como tipo propio según la
  [FAQ 2.3](https://arkhamdb.com/card/06239). El tipo anterior se captura al iniciar
  cada acción y su ventana se abre al completarla: una activación que contiene
  otras acciones no pierde su pareja de activaciones anterior al resolverse.
- `08062` Cerrar el círculo (1): cargas iniciales según las clases controladas,
  incluida la de la propia carta; Neutral no añade clase. Permite acciones básicas,
  incluidas jugar o activar sin designadores de acción en negrita. Ofrece Voluntad
  como sustitución opcional en cada prueba durante la acción, incluidas reacciones
  dentro de ella. Puede usarse fuera del turno propio y restaura el turno original.
  [Definiciones y FAQ oficial](https://arkhamdb.com/card/08062).
- `08098` Carta de los evos (1): un secreto y agotarla para una acción de moverse,
  evitar o investigar durante el turno propio.
- `08100` Carta de los evos (4): el mismo coste para dos tipos distintos en el
  orden elegido; la segunda elección usa el estado después de la primera. No
  abre una ventana gratuita de jugador entre ambas; las ventanas de reacción
  y las pruebas siguen sus reglas. Se aplican los textos impresos sin el Tabú que
  las restringe a básicas. El texto ES incorpora la distinción de dos acciones
  diferentes de la [errata oficial](https://arkhamdb.com/card/08100); se conserva
  intacta la fuente española anterior y su huella.
- `54008` Signo mágico (3): un espacio arcano restringido a Hechizos/Rituales.
  Tras activar una capacidad de acción de uno de ellos, permite activar otra de
  un apoyo distinto. Dos copias del mismo Hechizo son apoyos diferentes. Agotarse,
  cargas, recursos, límites y las acciones posteriores al primer símbolo se pagan.
- `10027` Fuerza especial (0): paga la acción adicional al jugarse. Cada uno de
  sus tres efectos se elige una vez, en cualquier orden; se vuelve a comprobar
  quién está en el Lugar del jugador y qué puede resolver en cada paso. Las
  conexiones para moverse se eligen desde la posición física, también durante
  una resolución «como si» en otro Lugar. Moverse y
  descubrir pistas por este efecto no son acciones. Resolver la capacidad elegida
  conserva los costes distintos del primer símbolo de acción.
- `10037` Lluvia de golpes (5): requiere un apoyo Cuerpo a Cuerpo y paga dos
  acciones para jugarse. Puede tomar hasta cuatro acciones de combatir con apoyos
  de ese rasgo, eligiendo de nuevo en cada repetición. No ofrece armas de fuego
  que carezcan de él. Termina el turno propio después de la última, no el turno
  ajeno. Una capacidad con tres símbolos todavía requiere pagar dos acciones:
  [FAQ de costes](https://arkhamdb.com/card/10030).

## Motor y presentación

Las restricciones y bonificaciones de una acción concedida se guardan en su marco
serializable y terminan al restaurarlo. Los costes adicionales siguen el flujo
normal. Las habilidades resueltas sin tomar una acción conservan su activación
impresa para las reacciones de Signo mágico, sin sumar una acción al historial.
El registro de tipos se actualiza por investigador y las ventanas de Celeridad
solo se generan cuando hay una carta que las observa.

Textos, nombres, subtítulos, rasgos, escaneos y miniaturas EN/ES; «Novedades»
actualizado. Se reutilizan los selectores de acciones y habilidades existentes;
sin navegador. Se corrige además la aserción de Putrefacción escarlata del lote
147 para comprobar daño recibido (`damageTaken`), no su daño de ataque impreso.

## Verificación y continuidad

Pruebas de reglas y conexiones, adquisición/preparación/presentación web, huellas
y ausencia de códigos duplicados entre lotes. Controles y recuentos finales en el
resumen de continuación; los recuentos suman las ocho altas verificadas a la
base del lote 147, sin repetir la inspección SSR que agotó su transporte.

Pelear sucio permanece pendiente: hay que identificar el Enemigo concreto de
las pruebas de parlamentar antes de aplicar correctamente su bonificación de +2.
Lifeline necesita la ventana anterior al fin del turno y su recuento de pruebas
falladas; las promesas de Geas requieren observar robos, juegos y compromisos.
No se activan parcialmente ni se rellenan los lotes con impresiones equivalentes.
