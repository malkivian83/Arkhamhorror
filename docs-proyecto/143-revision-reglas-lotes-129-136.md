# 143 · Revisión de reglas de los lotes 129–136

Revisión de reglas y FAQ de las cartas habilitadas en los lotes 129 a 136
([129](129-revelaciones-de-fichas.md), [130](130-bendiciones-y-maldiciones.md),
[131](131-fichas-selladas.md), [133](133-reimpresiones-de-cartas-jugables.md),
[134](134-candidatas-sin-motor-nuevo.md), [135](135-reacciones-a-fichas-reveladas.md),
[136](136-adjuntos-con-duracion.md)). Cada corrección lleva una prueba de comportamiento que
falla sin el arreglo.

## Corregido en `05b28a2e`

- Lote 129: Aliento del durmiente y Ojos del soñador cuentan la coincidencia aunque la ficha la
  ignore otra carta.
- Lote 130: Purificado solo en las pruebas de quien la compromete, Tentar al destino respeta el
  «a continuación», Incitando problemas usa el velo vigente y La mano del destino los valores
  modificados.
- Lote 131: Mareas del destino al comienzo de la ronda, Consagrar elige el origen de cada
  Bendición y descarta los apoyos sin fichas, Hoja bendecida (4) no duplica Bendiciones con
  Amada o Bendición de Isis.
- Lote 135: Maldición de los eones, Anteojos prismáticos (pista adicional solo con éxito),
  Estrella del alba con Acuerdo blasfemo y Acuerdo sagrado con el Penique «de la suerte».
- Lote 136: Ofuda quita Escurridizo, Trampa de lazo y Bajo vigilancia con Enemigos que entran
  enfrentados, Marca del cazador, Cartografiar la zona, Ajar y Exponer la debilidad (3).
- Lote 134: Rito de equilibrio (X limitado por las Maldiciones libres; retirar exige horror que
  curar) y textos ES de presentación con la errata aplicada (Yaotl, Tormenta de espíritus,
  Granadas Mk 1, Katarina Sojka, La llave de Salomón).
- Objetivos de ataque que leían `keywords.includes('aloof')` usan `enemyHasKeyword`.

## Corregido en `25306e7f` y `82acba52`

- Símbolo religioso: máximo compartido. Bestia alterada no inflige el horror dos veces y el
  Martillo ciclópeo no mueve Enemigos inmunes a cartas de Jugador.

## Corregido en esta entrega

- Símbolo religioso (07033) y Espíritu feérico (07222) cuentan las fichas reveladas aunque luego
  se ignoren o cancelen (`revealedTestTokens`, campo `revealedTokens` de `skillTestEnded`).
- Símbolo ancestral (10019): una salud impresa «por investigador» cuenta con su valor resultante.
- Sellar (La piedra Chthonian 0/3, Sello del séptimo signo, Signo de Xelotaph y el resto de
  sellos fijos): sin ficha válida en la bolsa la carta no entra en juego por ningún medio.
  Gancho aditivo `cannotEnterPlay` de cartas de jugador, comprobado en `PutAssetIntoPlay` (antes
  de sacar la carta de la mano o del descarte) y al buscar para poner en juego.
- Hoja bendecida (0 y 4): agotarla para añadir Bendiciones se decide en la ventana previa a
  revelar (tras comprometer cartas), con `testOptions`, no al activar el ataque.
- Palabras clave ganadas o perdidas: ¡Ups! (2) aplica Escurridizo con `testEnemyHasKeyword`, y
  al aparecer desde un encuentro el Distante se calcula con `enemyHasKeyword` (escenario,
  Escondite y pérdidas), no con el texto impreso.

## Limitaciones

- Guiado por la fe (10025) añade sus 2 Bendiciones al jugarse, antes de la ventana de
  compromiso. El motor no tiene un paso obligatorio «antes de revelar» para efectos de eventos y
  añadirlo exigiría tocar el inicio de ST.3; el impacto es mínimo (solo cartas que miran la
  bolsa durante el compromiso).
- Lanza sagrada (07302) no es una limitación: su texto dice «When you initiate this ability».
- `PutAssetIntoPlay` rechazado por `cannotEnterPlay` (o por ser único) desde otras zonas que ya
  hayan retirado la carta no la devuelve a su origen; los usos desde la mano, el descarte y la
  búsqueda en el mazo sí la conservan.
- Siguen leyendo `keywords.includes` palabras clave que ninguna carta ni escenario gana o pierde
  hoy (Masivo, Condenado, Oleada, Peligro, Oculto); si alguna llega a cambiarse, deberán pasar
  a `enemyHasKeyword`.
