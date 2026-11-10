# 129 · Revelaciones de fichas y ataques de área

Lote `token-reveals`: 16 códigos nuevos, 14 cartas o niveles distintos nuevos y 2 reediciones,
sobre `91c7430e`. Fuentes EN/ES de ArkhamDB (texto con erratas) y SHA-256 en
`packages/cards/src/token-reveals/approvals.json`; conversión con `approvedDefinition`
(`scripts/prepare-token-reveals.mjs`), sin adaptadores nuevos.

| Código | Carta                  | Nivel | Nota                     |
| ------ | ---------------------- | ----- | ------------------------ |
| 01071  | Estatua grotesca       | 4     |                          |
| 01571  | Estatua grotesca       | 4     | Reedición de `01071`     |
| 60421  | Estatua grotesca       | 2     |                          |
| 04032  | Profecía oscura        | 0     |                          |
| 60417  | Profecía oscura        | 0     | Reedición de `04032`     |
| 04202  | Contra viento y marea  | 2     |                          |
| 11066  | Aliento del durmiente  | 0     |                          |
| 11067  | Ojos del soñador       | 0     |                          |
| 11069  | Katarina Sojka         | 0     | Errata FAQ v2.5 aplicada |
| 05155  | Henry Wan              | 0     |                          |
| 08048  | 21 o nada              | 0     |                          |
| 03153  | Tormenta de espíritus  | 0     | Errata FAQ v2.0 aplicada |
| 52008  | Tormenta de espíritus  | 3     | Errata FAQ v2.0 aplicada |
| 05273  | Granadas Mk 1          | 4     | Errata FAQ v2.0 aplicada |
| 04273  | Viejo fusil de caza    | 3     |                          |
| 04305  | Lanzallamas            | 5     |                          |

## Capacidad nueva del motor

«Cuando fueses a revelar una ficha de Caos»: sustitución declarada de la siguiente revelación
(`ReplaceNextTokenReveal`, `GameState.nextTokenReplacement`). Se sacan N fichas y quien la
declaró elige una (`ChooseRevealedToken`/`ResolveChosenToken`); las demás quedan ignoradas
(`ignoredTokens`, fuera de la bolsa hasta el paso ST.8) y la elegida se resuelve con sus
ventanas normales. Puede exigir caras concretas (Profecía oscura) o revelar hasta un símbolo
(`RevealUntilSymbolToken`, Katarina). Fuera de pruebas, `RevealTokenOutsideTest` abre la
ventana (`wouldRevealOptions` de apoyos y eventos con `playWhenWouldReveal`); las ignoradas
vuelven a la bolsa con la elegida o, en revelaciones retenidas, se entregan al efecto en
`data.ignored` (Voz de Ra lo usa). `SkillTest.tokenChoice` registra la elección y su origen.
Es aditiva: sin sustitución declarada no cambia ningún flujo.

## Reglas

- Estatua grotesca: 1 carga, 2 fichas, se descarta sin cargas. FAQ: una ficha ignorada no
  cuenta como revelada (el Viejo fusil no se atasca con una calavera ignorada).
- Profecía oscura: rápida, en pruebas o fuera de ellas; 5 fichas y, si hay alguna calavera,
  sectario, tablilla, Antiguo o fallo automático, se elige entre ellas. Solo quien revela.
- Contra viento y marea: en tu prueba, si la dificultad supera el valor básico de tu
  habilidad; revela X adicionales (X = diferencia).
- Aliento del durmiente y Ojos del soñador: combate o investigación con [willpower]; antes de
  revelar, hasta 3 cargas añaden fichas. Si la elegida es igual que una ignorada, incluso por otra carta
  (FAQ v2.5), +2 daño o 1 pista adicional en tu Lugar.
- Katarina Sojka (errata): solo en tus pruebas; agotar, revelar hasta un símbolo, resolverlo
  e ignorar el resto.
- Henry Wan y 21 o nada: revelan de una en una, retienen las fichas y las devuelven al final.
  Henry Wan permite elegir carta o recurso por ficha al parar, o renunciar a las recompensas
  restantes. Si sale un símbolo, no hay recompensa. 21 o nada: símbolos
  5, fallo automático 10, signo arcano 1 u 11, números sin signo; FAQ (Confines): Helada,
  bendición y maldición valen 0. 18 o menos 4 recursos, 19 5, 20 6, 21 9, más de 21 nada.
- Tormenta de espíritus y Granadas Mk 1: en lugar del daño normal, daño a cada Enemigo del
  Lugar del Enemigo atacado; el daño adicional (Golpe salvaje, Puntería…) solo al atacado
  (FAQ). Tormenta: un símbolo daña a cada investigador de ese Lugar, con éxito o sin él.
  Granadas: también a cada otro investigador; descarte sin suministros. Daño simultáneo.
- Viejo fusil de caza: una calavera o fallo automático resuelto atasca el arma y la prueba
  falla; hasta «[action]: desatascas el fusil» no puede atacar.
- Lanzallamas: objetivo forzoso, el Enemigo enfrentado con mayor combate (empates a elegir);
  +4 y reparto opcional de hasta 4 daños más el adicional entre Enemigos enfrentados.

Aliento del durmiente y Ojos del soñador pueden combinar sus fichas adicionales con Katarina:
ella sustituye una extracción y las fichas que ignora pueden dar la coincidencia.
Las demás sustituciones se aplican de una en una. Dentro de una prueba, la ventana se ofrece
antes de la primera ficha, como Mask of Silenus.

Referencias: [Estatua grotesca y FAQ](https://arkhamdb.com/card/01071),
[Tormenta de espíritus](https://arkhamdb.com/card/03153),
[21 o nada](https://arkhamdb.com/card/08048), [Katarina Sojka](https://arkhamdb.com/card/11069).

## Bloqueadas o pendientes

- Olive McBride (`04197`, `10097`): resuelve dos fichas; fuera de pruebas no hay una
  resolución exacta de dos fichas para una sola revelación.
- Dados de la suerte (`02230`; `07307` usa maldición): ignorar la ficha ya revelada y revelar
  otra fuera de pruebas necesita retener la ignorada.
- Ajar y Sexto sentido (`05157`, `05158`, `05321`, `05322`): modificadores temporales de
  Enemigo e investigar «como si» estuvieras en otro Lugar. Bendición/maldición sigue ausente.

## Verificación

49 casos de reglas del lote y 16 de compra/inicio/presentación (las reediciones se ofrecen
por su original; `01571` muestra el escaneo inglés al no existir el español). Conversión
reproducible y unicidad de códigos. Suite de `packages/engine` y `packages/cards`: 603
archivos y 6342 casos correctos. Tipos de engine, cards y web; ESLint y Prettier de los
archivos tocados; verificador de 5553 imágenes y miniaturas (31 escaneos y 31 miniaturas
nuevos). Sin navegador ni build. Reutilizable salvo cambios en revelación de fichas,
pruebas, registros o recursos.

Recuentos: 16 códigos incorporados; 14 cartas o niveles distintos nuevos; 2 reediciones.
Acumulado: 1287 jugables; 830 históricos pendientes, incluidos 455 estándar con impresiones.
