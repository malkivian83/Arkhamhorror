# 131 · Fichas del caos selladas

Lote `sealed-tokens`: 19 códigos nuevos, 19 cartas o niveles distintos nuevos y 0 reediciones,
sobre `2b847487`. Fuentes EN/ES de ArkhamDB y SHA-256 en
`packages/cards/src/sealed-tokens/approvals.json`; conversión con `approvedDefinition`
(`scripts/prepare-sealed-tokens.mjs`). Signo de Xelotaph usa el adaptador revisado de Miríada
(`reviewed-myriad-v1`, añadido a `approved.mjs`).

| Código | Carta                      | Nivel | Tipo   |
| ------ | -------------------------- | ----- | ------ |
| 07301  | Consagrar                  | 3     | Evento |
| 07030  | Mareas del destino         | 0     | Evento |
| 07193  | Ríastrad                   | 1     | Evento |
| 10025  | Guiado por la fe           | 0     | Evento |
| 07221  | Escudo de fe               | 2     | Apoyo  |
| 07026  | Ritual oscuro              | 0     | Apoyo  |
| 07271  | El favor de la luna        | 1     | Apoyo  |
| 07272  | El favor del sol           | 1     | Apoyo  |
| 07302  | Lanza sagrada              | 5     | Apoyo  |
| 04030  | La piedra Chthonian        | 0     | Apoyo  |
| 53008  | La piedra Chthonian        | 3     | Apoyo  |
| 04031  | Ensalmo protector          | 1     | Apoyo  |
| 04235  | Símbolo arcano cristalino  | 3     | Apoyo  |
| 04311  | Sello del séptimo signo    | 5     | Apoyo  |
| 11028  | Baluarte                   | 2     | Apoyo  |
| 11043  | Finta                      | 2     | Apoyo  |
| 11070  | Signo de Xelotaph          | 0     | Apoyo  |
| 07018  | Hoja bendecida             | 0     | Apoyo  |
| 10034  | Hoja bendecida             | 4     | Apoyo  |

## Capacidad nueva del motor (aditiva)

- `ReleaseSealedTokens`: libera las fichas selladas en una carta (todas, `count` o solo `token`)
  a la bolsa; con `toPool`, las de Bendición/Maldición vuelven a la reserva y salen del juego
  (Consagrar). Registro `log.sealedReleased`.
- `resolveSealedInstead` admite `{ exhaust, then }`: la carta se agota en lugar de descartarse,
  no se ofrece agotada y `then` se resuelve después (Favor del Sol/Luna). Etiqueta
  `ability.resolveSealedExhaust`.
- Se reutilizan `SealToken` con `holder` (Códice de las eras), la liberación de sellos huérfanos
  al dejar el juego, la reserva de 10 Bendiciones/Maldiciones y `RemoveChaosTokens` del lote 130.
  Las fichas selladas siguen contando para el límite de la reserva.

## Reglas

- Sellar es un coste adicional al entrar en juego (FAQ de La piedra Chthonian): con símbolos
  fijos, sin ficha disponible no se puede jugar; «hasta N» permite sellar 0. Escudo de fe y los
  Favores se descartan al quedar sin fichas (también si se sellan 0).
- Baluarte y Finta: «resolver de nuevo» es una reacción opcional por cada vez que se cumple la
  condición y solo si hay una ficha válida en la bolsa (FAQ de The Drowned City, 2025).
- Mareas del destino puede jugarse al comienzo de la ronda, antes de la fase de Mitos, o en una
  ventana rápida. Retira todas las Maldiciones y añade tantas Bendiciones como permita la
  reserva; al final de la ronda hace lo inverso (FAQ de octubre de 2023).
- Ensalmo protector: límite de grupo 2 en juego; sella cualquier ficha salvo fallo automático.
  Baluarte y Finta: límite 1 por investigador.
- Sello del séptimo signo se retira del juego sin cargas o al dejar el juego; su fallo
  automático vuelve a la bolsa.
- Consagrar permite elegir de dónde devuelve cada Bendición, entre la bolsa y las cartas con
  fichas selladas. Los apoyos que se descartan sin fichas selladas lo hacen al perder la última.
  Consagrar retira 1 perdición del plan, de un Enemigo, de un apoyo o de un investigador (no de
  Lugares ni traiciones, que `RemoveDoom` aún no admite).
- Lanza sagrada, Hoja bendecida, Ríastrad y Guiado por la fe: la opción «antes de revelar» /
  «al iniciar» se elige al activar la habilidad o jugar el evento (no hay ventana intermedia
  relevante). Hoja bendecida (4) devuelve a la bolsa las Bendiciones reveladas al terminar la
  prueba. Guiado por la fe descubre la pista adicional solo si la investigación tiene éxito.
- Baluarte prepara otro apoyo propio agotado (si lo hay). Finta permite al investigador atacado
  moverse a un Lugar conectado o no hacerlo.

FAQ de ArkhamDB consultadas para los 19 códigos; solo hay aclaraciones para La piedra Chthonian,
Mareas del destino, Baluarte y Finta, recogidas arriba.

## Bloqueadas o pendientes

- Rito de santificación (07019): reacción «cuando un investigador juega una carta» que reduce su
  coste; no hay ventana de reducción durante el pago.
- Paz vigilante (07269): ventana «cuando fuese a empezar el paso de robar cartas de Encuentro».
- Destrucción radiante (07153): sella fichas sobre el propio evento mientras se resuelve.
- Nephthys (07262): sustituir la vuelta a la reserva de Bendiciones tras la prueba por sellarlas.
- Fragmentos del vacío (04310): sellar fichas reveladas durante la prueba.
- Nublar (11060), Flauta de los Dioses Exteriores (07268), Penique «de la suerte» (07224),
  Acuerdos (07110, 07113, 07116, 07120, 07122), Rito de equilibrio (07308), La llave de Salomon
  (10104), Athame siniestro (10092) y Anteojos prismáticos (10056): pendientes de revisar.
- Siguen los bloqueos anteriores (Rosario sagrado, Símbolo religioso 3, revelaciones aleatorias
  múltiples).

## Verificación

43 casos de reglas del lote (`rules.test.ts`), 2 del motor (`sealed-tokens.test.ts`) y 19 de
compra/inicio/presentación (`apps/web/src/game/sealed-tokens.test.ts`). Suite de
`packages/engine`, `packages/cards` y `scripts`: 620 archivos y 6598 casos correctos. Tipos de
engine, cards y web; ESLint y Prettier de los archivos tocados; verificador de 5645 imágenes y
miniaturas (38 escaneos y 38 miniaturas nuevos). Sin navegador ni build.

Recuentos: 19 códigos incorporados; 19 cartas o niveles distintos nuevos; 0 reediciones.
Acumulado: 1333 jugables; 784 históricos pendientes, incluidos 409 estándar con impresiones.
