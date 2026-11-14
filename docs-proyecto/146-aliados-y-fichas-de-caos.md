# 146 · Aliados y fichas de caos

Lote `chaos-allies`, sobre `b1b8ebaa`: **20 códigos**, con **14 cartas/niveles
distintos nuevos y seis vinculadas**; cero reediciones. Fuentes EN/ES originales,
huellas SHA-256 y revisión 1 en el manifiesto del lote.

## Cartas y diferencias revisadas

- `06030` Señorita Doyle (1), con `06031` Esperanza, `06032` Fervor y `06033` Augur:
  elige una al azar mediante el RNG de la partida, la pone en juego y baraja las
  otras dos. Cada gato descarta los otros controlados por su investigador y puede
  agotarse para probar con base 5 o descartarse para superar automáticamente, sin
  fichas pero pudiendo asignar cartas. Tras la prueba puede barajarse para poner
  otro gato del descarte en juego, incluidos los asignados durante la prueba.
  Al salir Doyle se recuperan las copias reales en juego, mano, mazo, descarte,
  compromiso o retiradas; no se inventan copias ausentes. Se presenta la
  [errata oficial de Doyle](https://arkhamdb.com/card/06030): apartar, no retirar.
- `10105` Sello de los arquetípicos (5), con `10106` Guardián de la llave y
  `10107` Sirviente de latón: dos Bendiciones o dos Maldiciones reveladas permiten
  invocar la vinculada correspondiente; si se dan ambas condiciones, ambas.
  Cuenta las fichas reveladas e ignoradas. Los aliados reciben horror o daño propio
  y descubren una pista o infligen dos daños en su Lugar o uno conectado; el
  efecto continúa aunque ese pago los derrote. Se apartan por cualquier salida de
  juego, incluyendo devolución a la mano, barajado o retirada.
- `10133` Diadema rota (5) y `10134` Diadema del crepúsculo: una ofrenda tras una
  prueba local con ambos símbolos; al llegar a tres se intercambian conservando
  las ofrendas. La vinculada agota y gasta una para tratar una Bendición o Maldición
  como signo arcano; la ficha física vuelve a la bolsa. Sin ofrendas intercambia
  de nuevo. Ambas respetan el límite de una Máscara.
- `10084` Máscara de gato (0): repone hasta dos ofrendas cuando se coloca perdición
  sobre una carta que no tenía; un segundo punto en esa misma carta no repone.
  Ofrece +2 voluntad o combate una vez por prueba, gastando una ofrenda.
- `10092` Athame siniestro (0): añade de una a tres Maldiciones como coste, según
  la capacidad del suministro, y recibe +2 combate por ficha añadida. No se ofrece
  sin objetivo legal. Al derrotar repone una carga u ofrenda, sin superar la
  cantidad inicial del apoyo elegido.
- `07153` Destrucción radiante (1): elige combate o voluntad y hasta tres
  Bendiciones de la bolsa para sellarlas sobre el Evento en resolución; cada una
  añade uno a habilidad y daño. Si el ataque derrota al objetivo, van al suministro;
  si no, se liberan a la bolsa. Se mantienen en juego mientras están selladas.
- `07031` Salvaguarda radiante (0): revela cinco fichas fuera de una prueba;
  Bendición o signo arcano cancela la revelación de la traición no debilidad de un
  investigador local. Peligro solo permite jugarla al investigador que roba.
- `07155` Mirada de Ouraxsh (2): revela siete fichas, sin resolver sus efectos
  habituales; distribuye un daño más otro por Maldición o fallo automático.
  `07162` Manipular el destino (2): revela hasta encontrar Maldición/fallo para
  dos daños, o Bendición/signo arcano para curar dos daños a un investigador o
  Aliado local. Si no existe símbolo válido en la bolsa, no concede curación.
  Ambos eventos evitan ataques de oportunidad; devuelven las fichas reveladas.
- `07194` Tristan Botley (2): elige dos habilidades diferentes hasta el inicio de
  su próximo turno, incluso entre rondas. Puede jugarse sin coste tras cualquier
  prueba con al menos tres Bendiciones/Maldiciones reveladas, incluidas ignoradas.
- `06328` Percepción mental (2): Miríada y dos espacios arcanos. Sustituye la
  habilidad por voluntad antes del compromiso, usando su base vigente, no
  fijándola al valor impreso. Una copia de la mano añade dos secretos a la de juego.
- `07191` y `07192` Grimorio críptico (4): variantes distintas, ambas Investigadas,
  mejoradas desde nivel 0 tras `translatedGrimoire`. Solo ganan secretos por
  Maldiciones resueltas en pruebas propias. El Heraldo gasta dos para jugar una
  Inspiración como Rápido y con descuento de uno; no inicia una acción dentro de
  otra prueba. Respeta permisos existentes para jugar desde el descarte y acumula
  descuentos de dos Tomos pagando sus secretos por separado. El Guardián gasta cinco para sustituir el robo de Encuentro por uno
  del mazo propio, sin retirar la carta de Encuentro. El texto ES incorpora la
  [errata de Investigado](https://arkhamdb.com/card/07191).
- `10075` Suerte Diabólica (0): puede asignarse reactivamente al revelar Maldición
  en una prueba propia y solo esa copia gana tres comodines adicionales. Una
  segunda copia puede reaccionar a la misma Maldición con su propio bonus. Una
  asignación normal conserva únicamente su icono impreso. Prohibir jugar cartas
  no impide por sí mismo asignarla; se conservan las restricciones de compromiso.

## Motor, presentación y comprobaciones

- Grupos de fichas fuera de pruebas con identidad propia y devolución única; las
  fichas retenidas siguen contando para los límites del suministro y de Helada.
  Se reutilizan las sustituciones de revelación existentes, sin activar Olive.
- Sellado sobre un Evento en resolución; seguimiento de vinculadas realmente
  retiradas y recuperación desde compromiso o juego; elección aleatoria serializable.
- Nuevas ventanas acotadas para perdición sobre una carta vacía y sustitución del
  robo superior del Encuentro. Las partidas sin suscripciones no añaden ventanas.
- 40 escaneos y 40 miniaturas EN/ES. «Novedades» actualizado; muestras locales
  representativas revisadas, sin navegador. Inventarios y huellas históricas conservados.
- Verificaciones y recuentos finales: resumen de continuación. La suite amplia
  detectó la recuperación de copias inexistentes; se corrigió manteniendo el
  registro de las retiradas reales y se repitieron los consumidores afectados.

## Pendiente con causa

- Nephthys: sustituir una retirada por sellado no paga ese coste; falta resolver
  ese reemplazo sin dar por pagado el coste de la otra habilidad
  ([respuesta oficial](https://arkhamdb.com/card/07262)). No se activa parcialmente.
- Olive (0/2): elección de dos fichas y composición con otras sustituciones de
  revelación. El lote no generaliza la selección de una ficha a dos.
- Sabueso invocado y La hoja ávida: Enemigo o traición del mazo del jugador;
  Baratija pesadillesca: compromiso obligatorio y valores negativos; Deseo
  milagroso: resolver el efecto del signo arcano además de las otras fichas.
- Vara de Carnamagos y Podredumbres: adjuntos vinculados con su ciclo de vida y
  diferencias entre la elección aleatoria de nivel 0 y la del nivel 2.
