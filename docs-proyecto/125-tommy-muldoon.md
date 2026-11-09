# 125 · Tommy Muldoon

09/11/2026. Petición: incorporar el investigador, sus exclusivas y el mazo inicial completo
del pack [Tommy Muldoon](https://arkhamdb.com/set/tom).

## Alcance

El pack reúne **32 códigos** (`60151`–`60182`). El diagnóstico con
`node scripts/check-decklist.mjs --file <lista del pack>` daba 25 códigos jugables y 7 por
registrar o implementar. Este lote incorpora **7 códigos jugables / 6 cartas o niveles
distintos nuevos / 1 reedición**: Golpe brutal (2), `60176`, equivalente a `02299`.

- Nuevos: Tommy Muldoon (`60151`), Becky (`60152`), Impulsivo (`60153`), Exceso de
  confianza (`60154`), Retenido (`60165`) y Subfusil Thompson (`60182`).
- El lote vive en `packages/cards/src/tommy-muldoon/`, con `approvals.json`, un módulo por
  código, `register.ts`, pruebas de reglas, integración y unicidad, y el mazo inicial
  oficial `starter-deck.json`.
- Mazo inicial `tommy`: Becky, Impulsivo, Exceso de confianza y dos copias de cada carta de
  nivel 0 (`60155`–`60169`); 30 cartas elegidas y 33 en total. Tommy admite Guardián y
  neutrales 0–5, mazo de 30 cartas, con sus dos exclusivas y una debilidad básica aleatoria.
- Los datos del investigador se registran en `core-2026/player-cards.ts` junto a los demás
  packs de investigador, antes de calcular las exclusivas. El inventario congelado
  `3c8ee4b5d8100766` no se modifica; la unicidad de los siete códigos se comprueba frente
  a todos los `data/*.json` y al registro del motor.

## Reglas

- **Tommy Muldoon.** La capacidad [action] provoca ataques de oportunidad. Cada forma de pago
  (gastar 1 recurso o descartar un Apoyo Arma de fuego propio) se ofrece solo si, tras
  pagarla, queda en la mano un Arma de fuego que se pueda jugar pagando su coste; descartar
  libera sus ranuras. La carta se juega por efecto (sin acción de jugar ni nuevo ataque de
  oportunidad) y entra con 2 municiones adicionales. El motor representa un único tipo de
  usos por apoyo: las municiones adicionales se aplican a las Armas de fuego con usos
  (munición), que son todas las del pack.
- **Signo arcano de Tommy.** +1; al revelarse coloca 1 munición en un apoyo propio con usos
  (munición), con independencia del resultado. Si hay varios, elige el jugador.
- **Becky.** Gasta 1 munición: combatir con +2 [combat] y +1 de daño. Su reacción («cuando
  actives la capacidad») se elige junto con la capacidad, antes de fijar el objetivo:
  agota a Becky, permite atacar a un enemigo Indiferente no enfrentado e ignora Represalia.
- **Impulsivo.** Solo se puede elegir una opción que cambie el estado de juego: descartar
  todos los Apoyos Arma de fuego que controlas (si hay alguno) o perder 5 recursos (si
  tienes alguno). Si solo una es posible, se aplica sin preguntar.
- **Exceso de confianza.** Va a tu zona de amenaza; después de que falles cualquier prueba
  de habilidad recibes 1 punto de daño; [action][action] para descartarla.
- **Retenido.** Rápido, tras el ataque de un enemigo que no sea Élite contra ti. Se vincula
  al enemigo y lo evita automáticamente. Mientras esté vinculado, el enemigo no se prepara
  ni en Mantenimiento ni por efectos. Al terminar la ronda se descarta si el enemigo no es
  Humanoide; si el enemigo abandona el juego, vuelve a la pila de descartes de su dueño.
- **Subfusil Thompson.** Gasta 1 munición: combatir con +3 [combat] y +1 de daño. Después
  de resolver esa capacidad puede gastar otra munición para combatir de nuevo (+1 de daño,
  sin bonificación de habilidad) contra cualquier enemigo válido; no es una acción, no
  provoca ataques de oportunidad y no vuelve a activar la reacción.
- **Golpe brutal (2).** Reedición exacta de `02299` (misma huella de equivalencia).

ArkhamDB no publica FAQ para estas cartas a 09/11/2026; se aplica el texto vigente de la API.

## Motor

Capacidades generales y aditivas:

- `InvestigatorBehavior.abilities`: habilidades impresas en el propio investigador, que se
  incorporan a `availableAbilities` con el investigador como objetivo.
- `entryUses` en `PlayCard`, `ResolvePlayedCard` y `PutAssetIntoPlay`: usos adicionales con
  los que entra un apoyo jugado por un efecto.
- Mensaje `AttachPlayerCardToEnemy`: vincula a un enemigo un evento resuelto, tomándolo de
  la pila de descartes de su dueño; se comporta como una traición con dueño.
- `TreacheryBehavior.attachedEnemyCannotReady`: el enemigo vinculado no se prepara
  (`ReadyAll` y `ReadyEnemy`).

## Datos y presentación

`scripts/prepare-tommy-muldoon.mjs` reproduce `data/tommy-muldoon.json` desde el inventario y
la instantánea revisada; el adaptador común de packs de investigador conserva ahora los usos
impresos de las exclusivas (Becky), sin cambiar los datos de Nathaniel y Harvey.
`scripts/present-tommy-muldoon.mjs` reproduce nombres, subtítulos, textos, rasgos, reverso y
las etiquetas nuevas de interfaz EN/ES; es idempotente. Las instantáneas consultadas el
09/11/2026 (`source-en.json`, `source-es.json` y `vicious-blow-source.json`) tienen sus
SHA-256 en `approvals.json`. El pack `tom` se añade a los paquetes en línea de la web.

Imágenes, miniaturas, retrato, novedades y la versión de la caché local quedan para la
integración centralizada.

## Validación

- Pruebas del lote (reglas, integración y unicidad) y reproducción de datos: correctas.
- Suite del motor y lotes relacionados (Nathaniel, Harvey, André, Marie, Pete, mejoras
  vinculadas, armas, modificadores de prueba, mecánicas reutilizadas): correctas.
- Tipos de `packages/engine` y `packages/cards`; formato y lint de los archivos tocados.
- `spanishImages.test.ts` espera imágenes locales de `60151`, pendientes de la integración.
- `check-decklist` sobre el pack completo: 0 por implementar.
