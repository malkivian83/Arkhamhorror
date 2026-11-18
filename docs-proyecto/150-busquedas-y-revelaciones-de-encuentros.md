# 150 · Búsquedas y revelaciones de Encuentros

Lote `encounter-search`: seis códigos y seis cartas/niveles estándar nuevos,
sin vinculadas ni reediciones. Fuentes oficiales EN/ES, huellas y manifiesto en
`packages/cards/src/encounter-search/`; catálogo histórico conservado.

## Reglas revisadas

- `03263` De caza (0): rápida cuando su jugador fuese a robar un Encuentro
  durante el mito. Sustituye exactamente ese robo por buscar un Enemigo entre las
  nueve primeras cartas y engendrarlo enfrentado, incluso si es Élite. Si no hay
  candidato, baraja y roba normalmente una carta de Encuentro.
- `08028` De caza (3): busca en todo el mazo; si no encuentra Enemigo no roba
  otra carta. Se vincula al engendrado; su dueño puede obtener tres recursos al
  derrotar ese Enemigo. No recibe recursos si lo derrota otro investigador o si
  solo se descarta. El adjunto vuelve al descarte al salir su Enemigo; su reacción
  conserva la copia física que existía al derrotarlo, sin activarse por otro Enemigo.
- `09068` Agitar el avispero (0): busca un Enemigo no Élite entre las nueve
  primeras cartas y lo engendra enfrentado. Solo tras engendrarlo descubre una
  pista y gana recursos según su valor de Salud, incluidos escalado por jugadores
  y modificadores continuos. Baraja después de completar el efecto.
- `11053` «¿Dónde es la fiesta?» (0): Negociar. Busca en todo el mazo y descarte
  un Enemigo no Élite; retira exactamente la copia elegida de su zona. Entra
  agotado y enfrentado desde su aparición. Roba cartas según sus valores de daño
  y horror y baraja el mazo buscado.
- `10093` Himno Antediluviano (0): paga dos acciones en total y revela hasta cinco
  cartas disponibles, sin mezclar el descarte para completar el grupo. Por cada
  carta enviada debajo añade una Maldición como coste, comprobando la reserva en
  cada elección. Permite elegir el orden de las cartas de arriba y de abajo;
  conserva las no reveladas en su posición relativa. Puede no enviar ninguna debajo.
- `09111` La naturaleza de la bestia (1): Dilema con Revelación, no jugable desde
  la mano. Revela hasta tres cartas disponibles, elige una y un investigador que
  la roba realmente; descarta las otras. Después elige investigador y Lugar
  revelado para descubrir una pista. Respeta el máximo compartido de dos Dilemas
  por ronda y la prioridad de Debilidades del flujo existente. Con mazo vacío no
  fabrica una carta ni concede el efecto posterior a «A continuación».

## Diferencias compartidas

Buscar y engendrar no es robar: no aplica Oleada ni las instrucciones normales de
aparición. La búsqueda permite elegir entre todos los candidatos y no puede
fallar voluntariamente si encuentra alguno (RR Search). La
[FAQ de De caza](https://arkhamdb.com/card/03263) confirma que sustituye también
la aparición normal de Enemigos Ocultos. Las cartas de Primera guardia que se
hubieran repartido ya no forman parte del mazo y no se incluyen en la búsqueda.
El Dilema sí utiliza el robo de Encuentro normal, con sus ventanas e instrucciones.

La ventana anterior al robo también observa eventos en mano. Al sustituir el
robo se cierra esa ventana, evitando pagar otra sustitución del mismo robo con
otra De caza o el Grimorio críptico. El robo posterior a una búsqueda fallida
es un robo nuevo y sí admite su propia sustitución. Se reutilizan la inspección serializable,
el manejo de Dilemas y las colas de aparición; se conserva el orden entre
aparición, recompensas y barajado.

Presentación, escaneos y miniaturas EN/ES, «Novedades», pruebas de reglas,
compra/preparación, huellas y ausencia de duplicados. Revisión de miniatura
representativa sin navegador. Resultados finales en el resumen de continuación.
Códice de otro mundo permanece pendiente: descartar copias de Lugares requiere
resolver también las consecuencias sobre sus ocupantes, no solo quitar el Lugar.
