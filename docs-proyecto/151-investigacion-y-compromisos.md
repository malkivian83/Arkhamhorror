# 151 · Investigación y cartas comprometidas

Lote `research-commitments`, sobre `e27d766c`: nueve códigos y nueve diseños
distintos nuevos, sin reediciones ni vinculadas nuevas. Fuentes oficiales EN/ES,
huellas y aprobaciones en `packages/cards/src/research-commitments/`. Se conservan
los inventarios históricos. El tamaño responde al grupo de reglas que se ha podido
implementar y comprobar; no se rellena con impresiones equivalentes.

## Reglas y diferencias

- `05153` Sr. "Torre" (0): capacidad rápida impresa, sin aplicar la lista opcional
  de Tabú. Agota y gasta un secreto antes de buscar entre tres, seis o nueve cartas.
  Roba la carta elegida y una Debilidad adicional de entre las buscadas si existe;
  el jugador elige la Debilidad. Los robos son reales y conservan las copias físicas.
- `06023` Revelación asombrosa (0): no se puede jugar. Durante una búsqueda en el
  mazo propio puede descartarse la copia encontrada para obtener dos recursos o
  colocar un secreto en un apoyo controlado que use secretos. Mirar cartas no es buscar.
- `06278` Hallazgo sorprendente (1): su Investigación pone la copia encontrada en
  la zona de juego; debe comprometerse a la siguiente prueba propia elegible. Si se
  encuentra durante una prueba elegible, se compromete a esa misma prueba, según la
  [aclaración oficial de septiembre de 2023](https://arkhamdb.com/card/06278).
  Roba una carta después de que termine con éxito esa prueba. Una copia comprometida
  normalmente desde la mano no recibe esa recompensa.
- Las dos Investigaciones comparten **máximo de una capacidad por búsqueda**.
  No se activan durante la preparación (FAQ 1.26), no amplían el grupo buscado al
  retirar una carta y no sustituyen una Debilidad que cancele la búsqueda.
  Ambas conservan Miríada y su límite de tres copias.
- `06197` La práctica hace al maestro (0): rápida durante una prueba en el mismo
  Lugar. Busca entre nueve cartas una habilidad Practicado que sea elegible y
  compromete esa copia. Baraja las restantes; después de acabar la prueba, devuelve
  esa copia a la mano si tuvo éxito. Puede añadir una carta a una prueba ajena aun
  habiendo comprometido otra, por la
  [aclaración oficial](https://arkhamdb.com/card/06197). Conserva Peril y las demás
  restricciones de compromiso.
- `07223` Guía invisible (3): el investigador que realiza la prueba decide si busca
  en sus tres primeras cartas y elige una carta elegible; el controlador de Guía
  decide después si paga un secreto para comprometerla. Buscar no exige pagar ese
  secreto. El límite es una vez por prueba y por copia, sin agotar el apoyo.
- `09047` Descubrimiento cautivador (0): busca entre seis cartas; permite colocar
  cero, una, dos o tres pistas propias, respetando las restricciones del Lugar, y
  añadir dos cartas buscadas por pista colocada, hasta las disponibles. Añadirlas
  a la mano no cuenta como robarlas. Baraja al terminar.
- `60330` Imitador (3): al comprometerse busca una habilidad elegible en el descarte
  de otro investigador, aunque esté lejos, y la compromete bajo el control de quien
  comprometió Imitador. La carta conserva su propietario y va al fondo del mazo de
  ese propietario al terminar. Si se devuelve a la mano antes, vuelve a la de su
  propietario y no se duplica durante la limpieza.
- `11094` Regalo de Nodens (5): reacción al comprometer cartas a una prueba propia,
  una vez por ronda. Primero elige una habilidad Superviviente ya presente en el
  descarte; después descarta una carta no Debilidad de la mano como coste. Compromete
  la habilidad elegida y la coloca en el fondo del mazo después de la prueba. La
  carta recién descartada para pagar no se convierte en una nueva candidata.
- `09032` Conceder determinación (2): gasta una carga para comprometer una carta no
  Debilidad desde la mano a una prueba en el mismo Lugar o uno conectado. Todos los
  iconos de esa copia, incluidos los concedidos por su texto, cuentan como comodines;
  se conservan sus restricciones. No concede alcance a Lugares unidos únicamente
  por conexiones de movimiento de investigadores.

## Integración y comprobaciones

Las búsquedas y sus continuaciones son serializables. El compromiso conserva por
separado controlador, propietario, permiso de alcance, conversión de iconos y destino
de la copia concreta. Se reutilizan las restricciones existentes y las ventanas de
compromiso; las partidas sin Investigación conservan su flujo de búsqueda habitual.

Presentación completa EN/ES, dieciocho escaneos y miniaturas, registro, compra,
preparación de mazos y «Novedades». Pruebas de reglas, interacción con las búsquedas
existentes, guardados y deshacer; controles de huellas, códigos únicos y datos
aprobados. Los resultados finales se mantienen en el resumen de continuación.

## Pendientes del grupo

No se activa Bengala parcialmente: además de buscar un Aliado necesita elegir su
modo antes de pagar y calcular los ataques de oportunidad, controlar un Aliado de
otro propietario y exiliarse solo cuando la búsqueda lo ponga en juego. La
[FAQ oficial](https://arkhamdb.com/card/02115) confirma que una búsqueda sin resultado
no la exilia. Las cartas con cartas boca abajo, búsquedas para jugarlas desde otras
zonas y personalización mantienen sus bloqueos propios.
