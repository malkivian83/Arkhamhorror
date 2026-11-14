# 145 · Movimiento y apoyos

18 códigos y 18 cartas/niveles distintos nuevos; cero reediciones. Lote
`movement-support`, sobre `a18a4ce0`. Fuentes EN/ES y huellas conservadas en su
manifiesto; no se modifican los inventarios históricos.

## Reglas y diferencias

- Atajo (03232, nivel 2): evento vinculado al Lugar; cualquier investigador allí
  puede agotar esa copia para moverse. Abrir portal (06029): Miríada, límite de
  grupo de tres; sus conexiones solo sirven para movimiento de investigadores,
  no para rutas de Enemigos ni para otras distancias.
- Caza virtuosa (07109): designador Enfrentarse, selección a distancia de hasta
  dos conexiones normales, movimiento paso a paso y bendiciones según el horror.
  La verdad te llama (07154): sigue una ruta mínima y se detiene al revelar,
  quedar enfrentado o bloquearse el movimiento. Exploración avanzada (08047):
  hasta tres movimientos sin nuevos enfrentamientos durante el recorrido; al
  terminar se comprueba el enfrentamiento en el destino. Los Enemigos ya
  enfrentados siguen al investigador y jugar el evento puede provocar ataques.
- Tras el rastro (08084/08085, niveles 1/3): el primero permite movimiento o pista
  en un Lugar intermedio vacío; el segundo termina los movimientos y después
  descubre una pista en cada Lugar en que entró. Se conservan restricciones de
  entrada, costes y ventanas de movimiento.
- Colmillo de Tyr'thrha (08029): ataca en cualquier Lugar revelado, con movimiento
  opcional previo, suma agilidad y añade tres daños. Rescate heroico (06234, nivel
  2): movimiento a un investigador conectado, enfrentamiento, resolución del mismo
  ataque contra el rescatador y un daño posterior. No cancela el ataque.
  Se recalculan los modificadores dependientes del nuevo objetivo y se registra
  el investigador que realmente recibe el ataque.
- Prophesiae Profana (08045): aplica el texto impreso, sin Taboo. El locus es
  opcional; sin elegirlo, o si abandona el juego, se mantienen las bonificaciones
  y la posibilidad de ignorar ataques de oportunidad, según su
  [respuesta oficial](https://arkhamdb.com/card/08045).
- Telescopio de bolsillo (08097): mirar no revela; investigar no exige agotarlo.
  Los ataques de oportunidad se resuelven desde el Lugar físico antes del efecto.
  Durante la investigación se usa el Lugar virtual, conservando la posición real
  para el mapa y para cualquier movimiento intercalado, conforme a la
  [respuesta oficial de julio de 2025](https://arkhamdb.com/card/08097).
  Los efectos rápidos sin otra prueba no se aplazan al final de la prueba actual.
- Gené Beauregard (08099): +1 intelecto/agilidad; tras moverse durante su turno,
  agota y mueve una pista o un Enemigo no Élite entre el nuevo Lugar y uno
  conectado. Mover pistas no es descubrirlas.
- Forma etérea (06164/10100, niveles 0/2): evasión con voluntad añadida;
  superar impide enfrentamientos, ataques y daño propio a Enemigos hasta acabar
  la ronda. El nivel 2 vuelve al final del turno si se reveló un símbolo, incluso
  al fallar o si la ficha fue ignorada.
- Capucha de Sejmet (11109): restricción de rasgos del investigador; reacción al
  entrar, antes del enfrentamiento, contra los no Élite presentes. La protección
  incluye el enfrentamiento implícito de los Masivos y solo impide el daño de su
  controlador a esos Enemigos.
- Arco encantado (08118): ataque local sin gastar cargas; gasto opcional para un
  objetivo no Élite conectado, ignorando Indiferente y Represalia solo en ese
  ataque. Voluntad o agilidad, +1 habilidad y +1 daño.
- Perro de trineo (08127): límite de cuatro por mazo y dos por espacio de aliado;
  elección sucesiva de las copias a agotar, X movimientos o ataque con +X y daño
  estándar X. Seguimiento (06114): elige el Enemigo antes de resolver ataques de
  oportunidad; solo el elegido queda excluido. Bonificación por daño, máximo +5,
  y una pista adicional al superar la investigación.

## Revisión anterior y presentación

- Seguimiento de la revisión de 141–142: Cartas náuticas utiliza el velo
  modificado del Lugar, tanto desde la mano como en juego; prueba de regresión.
- «Novedades» incluye este lote, los lotes 139–142 y su revisión de reglas, con
  textos EN/ES. Se conservan las entradas posteriores traídas de `origin/main`.
- 36 escaneos EN/ES y 36 miniaturas nuevas. Revisión visual de muestras locales,
  sin navegador. Inventario comprobado: 6287 escaneos y 6287 miniaturas.
- Verificación: engine/cards/card-import, 647 archivos y 7356 casos; inicialmente
  7354 correctos, un timeout en las 960 preparaciones de Smoke y una omisión del
  permiso remoto del Arco en Carnevale. Corregida la omisión, los tres archivos
  afectados pasan (89 casos); las reglas finales del lote pasan 47 casos,
  incluidos cuatro adicionales de regresión. Web: 73 casos de presentación,
  compra y preparación. Tipos cards y controles finales de formato/lint; build
  web y tipos tras el cierre anotados en la continuación.
- Acumulado medido con `inspectRuntime()`: 1514 cartas con comportamiento,
  611 códigos pendientes del catálogo congelado, de ellos 242 estándar con
  impresión. El lote anterior aportó 11 cartas/niveles y seis vinculadas;
  sus vinculadas no se cuentan como diseños estándar nuevos de este lote.
