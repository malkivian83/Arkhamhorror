# 144 · Cartas vinculadas

Cartas «Enlazadas» en la edición española (RR «Bonded»).

Lote `bonded-cards`: **17 códigos**: **11 cartas o niveles distintos nuevos** del
inventario estándar, sus **6 cartas vinculadas** y **0 reediciones**. Se conserva el
inventario histórico y sus huellas; solo se activa el grupo revisado.

| Código | Carta                    | Nivel | Vinculada                     |
| ------ | ------------------------ | ----: | ----------------------------- |
| 05313  | Espejo sagrado           |     0 | 05314 Melodía apaciguadora ×3 |
| 54002  | Espejo sagrado           |     3 | 05314 Melodía apaciguadora ×3 |
| 05316  | Repertorio ocultista     |     0 | 05317 Rito de sangre ×3       |
| 54004  | Repertorio ocultista     |     3 | 05317 Rito de sangre ×3       |
| 06112  | Diario onírico (Sin traducir)          | 0 | 06113 Esencia del sueño |
| 06236  | Diario onírico (Sueños de un explorador) | 3 | 06113 Esencia del sueño |
| 06237  | Diario onírico (Sueños de un demente)  | 3 | 06113 Esencia del sueño |
| 06238  | Diario onírico (Sueños de un niño)     | 3 | 06113 Esencia del sueño |
| 10044  | Micónido voraz           |     0 | 10045 Crecimiento prodigioso  |
| 06021  | Segmento de ónice        |     1 | 06022 Colgante de la reina    |
| 06276  | Receptáculo vacío        |     4 | 06277 Devorador de deseos     |

## Capacidad del motor

- `Investigator.outOfPlay`: cartas de jugador apartadas, fuera del juego. Al preparar la
  partida recibe las vinculadas de las cartas del mazo (`PlayerCardDef.bonded`), con el
  número del producto una sola vez aunque haya varias copias o niveles que las convoquen
  ([FAQ v1.7](https://arkhamdb.com/card/05317)). Una vinculada (`bondedCard`) nunca forma
  parte del mazo: no es estándar, no aparece en el conjunto de cartas ni en la tienda y la
  validación la rechaza.
- Mensajes `TakeSetAside` (a la mano, al mazo barajado o a juego; `bonded` limita la
  búsqueda a las vinculadas), `SetAsidePlayerCards` (todas las copias de mano, mazo y
  descarte, y apoyos concretos) y `SwapSetAsideAsset` (intercambio con traspaso opcional
  de usos). Módulo `packages/engine/src/bonded.ts`.
- Reglas continuas tras cada mensaje: `setsAsideBondedOnLeave` aparta las vinculadas
  cuando el apoyo abandona el juego por cualquier vía, y `setAsideInsteadOfDiscard` aparta
  la carta en lugar de entrar en la pila de descartes o en el mazo.

## Reglas y diferencias

- Espejo sagrado y Repertorio ocultista (0/3): obligado tras entrar en juego, una copia a la
  mano y hasta dos barajadas. Solo el nivel 0 aparta las copias al abandonar el juego, con la
  errata de la [FAQ v2.0](https://arkhamdb.com/card/05313) (apartar en lugar de retirar);
  el texto ES se presenta con ella. El nivel 3 permite, al jugar la copia, cambiar cada «2»
  por «3» (curación; robo y descarte) o barajarla en el mazo en lugar de descartarla.
- Melodía apaciguadora cura de punto en punto entre investigadores y Aliados de tu Lugar,
  sin omitir curación posible, y después roba. Rito de sangre no provoca ataques de
  oportunidad; cada carta descartada da 1 recurso o, pagando 1, 1 daño a un Enemigo de tu
  Lugar.
- Diario onírico (0): acción para buscar la Esencia; su reacción anota «has interpretado los
  sueños» solo si tú superas por 3 o más una prueba con la Esencia comprometida. Los niveles
  3 son Investigados (requieren esa nota) y dan [wild][wild] a tu Esencia con su condición:
  velo actual ≥ 4, enfrentado a un Enemigo u 8 cartas en mano; reaccionan al comenzar tu
  turno. La Esencia vuelve a las apartadas en lugar de ir al descarte o al mazo.
- Micónido voraz: busca el Crecimiento; con 3 o más crecimientos los mueve a recursos y anota
  «has clasificado una especie nueva». El Crecimiento investiga; tras la prueba coloca un
  crecimiento por punto de margen y se aparta, o vuelve a la mano si falla.
- Segmento de ónice (Miríada, Rápido): con tres copias en juego, una sola habilidad las
  aparta y pone en juego el Colgante (3 cargas). El Colgante elige un Lugar revelado:
  moverse, descubrir 1 pista o evitar automáticamente, sin prueba
  ([FAQ v1.7](https://arkhamdb.com/card/06022)). Sin cargas se aparta y baraja los tres
  Segmentos apartados. Se aplica el texto impreso, no el Taboo.
- Receptáculo vacío: carga tras derrotar tú a un Enemigo; con 3 o más se intercambia con el
  Devorador de deseos moviendo las cargas. Este cancela calavera, sectario, tablilla o
  primigenio que reveles en una prueba, cura 1 daño y 1 horror, y sin cargas vuelve al
  Receptáculo (sin cargas). Cancelar no revela otra ficha.

## Bloqueadas con causa

- La hoja ávida (06018): Sed de sangre es una traición del mazo del jugador que se adjunta
  al apoyo pagando ofrendas.
- Señorita Doyle (06030): elección aleatoria entre tres aliados que se descartan entre sí y
  pruebas automáticamente superadas con regreso desde el descarte.
- Sabueso invocado (06282): Bestia desatada es un Enemigo vinculado del mazo del jugador
  (Presa: portador, aparición enfrentada y retirada del Sabueso).
- Baratija pesadillesca (06330): Parásito onírico adjunto como carta, compromiso obligatorio
  e iconos que restan.
- Deseo milagroso (10038): resolver el efecto del signo arcano además de las demás fichas.
- Ojos de Valusia (10035): bonificación de habilidad contra un Enemigo elegido para todos
  los investigadores (`ENEMY_MODS`).
- Combinadas con otra capacidad: Micónido voraz 4 (`ENC_DRAW`), Cristalizador de sueños
  (`FACEDOWN`), Observar las estrellas (`ENC_DECK`), Sello de los arquetípicos y Diadema
  rota (`TOKEN_TRIGGERS`), Bianca (`PARLEY`) y Vara de Carnamagos (`CHAOS_MULTI`).

## Evidencia y recursos

- `approvals.json` conserva el paquete `3c8ee4b5d8100766`, la revisión 1 y las huellas
  SHA-256 EN/ES. El adaptador `reviewed-bonded-v1` exige la relación de vinculadas del
  catálogo por código; el generador `scripts/prepare-bonded-cards.mjs` reproduce los datos y
  rechaza códigos ya presentes en otros lotes.
- 34 escaneos EN/ES y 34 miniaturas; verificador: 6073 escaneos y miniaturas.
- Verificación: suites engine, cards y card-import completas (644 archivos, 7207 casos) por el cambio del motor; dirigidas: 3 de motor, 41 de reglas del lote, 109 de conversión/importación y 121 web (presentación EN/ES, compra, preparación y lotes previos). Tipos engine/cards/web (tras el changelog), ESLint y Prettier de lo tocado; 6073 escaneos y miniaturas verificados. Sin navegador ni build.

Acumulado medido con `inspectRuntime()`: **1496 cartas con comportamiento** (+17, de ellas 6
vinculadas) y **260 estándar con impresión pendientes**.
