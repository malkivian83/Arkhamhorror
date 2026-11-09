# 130 · Bendiciones y maldiciones

Lote `bless-curse`: 27 códigos nuevos, 27 cartas o niveles distintos nuevos y 0 reediciones,
sobre `22863f49`. Fuentes EN/ES de ArkhamDB y SHA-256 en
`packages/cards/src/bless-curse/approvals.json`; conversión con `approvedDefinition`
(`scripts/prepare-bless-curse.mjs`), sin adaptadores nuevos.

| Código | Carta                      | Nivel | Tipo   |
| ------ | -------------------------- | ----- | ------ |
| 07034  | Mantener la fe             | 0     | Evento |
| 10124  | Mantener la fe             | 2     | Evento |
| 07037  | Tentar al destino          | 0     | Evento |
| 07023  | Conocimiento profundo      | 0     | Evento |
| 07028  | Pacto fáustico             | 0     | Evento |
| 07112  | Incitando problemas        | 1     | Evento |
| 07230  | Armonía restaurada         | 2     | Evento |
| 07263  | El ojo estigio             | 3     | Evento |
| 10046  | Variable de control        | 0     | Evento |
| 07020  | La mano del destino        | 0     | Evento |
| 07017  | Libro de salmos            | 0     | Apoyo  |
| 07229  | Espíritu de la humanidad   | 2     | Apoyo  |
| 10052  | Gabriel Carillo            | 1     | Apoyo  |
| 10068  | Amuleto de talla de marfil | 0     | Apoyo  |
| 07156  | Sacerdote de dos cultos    | 1     | Apoyo  |
| 10019  | Símbolo ancestral          | 0     | Apoyo  |
| 07033  | Símbolo religioso          | 0     | Apoyo  |
| 07032  | Promesa de poder           | 0     | Habilidad |
| 07035  | Predestinado               | 0     | Habilidad |
| 07197  | Señal de la cruz           | 2     | Habilidad |
| 07306  | Justificar los medios      | 3     | Habilidad |
| 10029  | Purificado                 | 0     | Habilidad |
| 10055  | Método Esotérico           | 1     | Habilidad |
| 10095  | Réprobo                    | 0     | Habilidad |
| 07115  | Escéptico                  | 1     | Habilidad |
| 07222  | Espíritu feérico           | 1     | Habilidad |
| 10125  | Providencial               | 2     | Habilidad |

## Capacidad nueva del motor

Fichas de Bendición y Maldición (`ChaosSymbol` `bless`/`curse`): +2 / −2 y revela otra ficha
(`resolveBaseToken`). Proceden de la reserva de fichas: como máximo 10 de cada una entre bolsa,
selladas y reveladas en la prueba (`poolTokensAvailable`, `withinPoolLimit`); nunca se anotan
en la bolsa de campaña. Al terminar la prueba (ST.8) las resueltas vuelven a la reserva
(`pooledTokens`); las ignoradas y las reveladas fuera de pruebas vuelven a la bolsa, como en la
implementación de referencia. `RemoveChaosTokens` devuelve fichas de la bolsa a la reserva.
Las cartas comprometidas pueden fijar su modificador (`committedTokenModifiers`). Los
desencadenantes `afterSkillTest`/`skillTestEnded` incluyen las fichas resueltas (`tokens`) y hay
uno nuevo al final de la fase de Mantenimiento (`upkeepPhaseEnds`). Presentación EN/ES de las
fichas (ayuda, nombre y registro). Aditiva: sin estas fichas no cambia ningún flujo. Empeño
(07196) ya cuenta una Bendición sellada entre sus fichas de robo.

## Reglas

- Costes adicionales (Conocimiento profundo, Pacto fáustico, Incitando problemas, Justificar
  los medios): deben poder añadirse todas las Maldiciones; si no, no se juega o no se compromete.
  Reparto «en total» entre investigadores del Lugar de una unidad en una.
- Promesa de poder: si no quedan Maldiciones en la reserva, 2 de horror (asignable).
- Predestinado, Purificado y Justificar los medios se comprometen a cualquier prueba; los dos
  primeros, máximo 1 por prueba. Justificar los medios tiene éxito automático antes de revelar
  (como Esperanza en la FAQ: no se revelan fichas).
- Señal de la cruz: solo tu prueba con dificultad mayor que tu valor básico; X Bendiciones.
- Réprobo y Escéptico: tratan el modificador de la Maldición como 0 o de ambas como +1.
- Espíritu feérico vuelve a la mano desde el descarte al terminar la prueba si salió Maldición.
- Sacerdote de dos cultos: si no puedes añadir la Maldición, se descarta.
- Símbolo ancestral: salud impresa del Enemigo, máximo 5. Símbolo religioso cuenta Maldiciones
  y fallos automáticos resueltos en la prueba terminada.
- La mano del destino cancela el ataque y añade daño + horror del atacante en Bendiciones.

FAQ v2.5A y ArkhamDB: sin aclaraciones ni erratas para estas cartas (ArkhamDB no respondió
para 17 de ellas en la consulta; se revisaron las 9 accesibles).

## Bloqueadas o pendientes

- Rosario sagrado (07220), «prueba sobre una traición»: el motor no distingue
  aún el origen de las pruebas de efecto.
- Símbolo religioso (3, `10126`): repetir la prueba fallada tras resolver sus efectos.
- Sellar Bendiciones/Maldiciones (Rito de santificación, Escudo de fe, Favor del Sol/Luna,
  Lanza sagrada…), Pactos (Covenant), cambios de cara (Moneda de la suerte, Mareas del
  destino) y revelaciones aleatorias múltiples (Absolución, Vara de Carnamagos): pendientes de
  revisar sobre la capacidad nueva.

## Verificación

54 casos de reglas del lote, 4 del motor (`bless-curse.test.ts`) y 27 de compra/inicio/
presentación. Suite de `packages/engine`, `packages/cards` y `scripts`: 618 archivos y 6560
casos correctos; `apps/web` y `apps/server`: 1211 correctos y 26 omitidos. Tipos de engine,
cards y web; ESLint y Prettier de los archivos tocados; verificador de 5607 imágenes y
miniaturas (54 escaneos y 54 miniaturas nuevos). Sin navegador ni build.

Recuentos: 27 códigos incorporados; 27 cartas o niveles distintos nuevos; 0 reediciones.
Acumulado: 1314 jugables; 803 históricos pendientes, incluidos 428 estándar con impresiones.
