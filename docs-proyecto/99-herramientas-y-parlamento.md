# 99 · Herramientas y Parlamento

Lote `tools-parley`: 31 códigos y 31 cartas o niveles distintos nuevos, sin
reediciones. Preparado por un solo agente sobre `010a24d7`, después del lote
`damage-turn` (`b8c4c703`).

## Cartas y reglas

| Grupo                | Códigos                                         | Diferencias revisadas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Armas                | 05115, 08094, 08096, 05118                      | .45 Thompson 0: cinco municiones, +2 Combate y +1 daño. Almádena 0/4 distingue los ataques de una, dos y tres acciones, sus modificadores y daños. Espada encantada 0 permite gastar una carga al iniciar, sin exigir cargas para el ataque normal.                                                                                                                                                                                                                                                                   |
| Herramientas y Tomos | 07021, 07159                                    | Código criptográfico investiga como capacidad rápida a +1 velo o como acción a −2, siempre agotando y gastando un secreto. Los costes adicionales del Lugar se pagan también en el modo rápido, sin convertirlo en una acción ni provocar ataques de oportunidad. Tomo abisal permite Combate, Intelecto o Voluntad, agotamiento, perdición opcional hasta tres y bonificación/daño por la perdición aplicable.                                                                                                       |
| Bastón estoque       | 07029, 11074                                    | Ataque o evasión con la habilidad normal o Voluntad; agotamiento habitual. Al entrar activa la capacidad sin sus costes. Nivel 2 es Rápido, suma 1 y permite infligir antes un daño a un enemigo enfrentado; recalcula los objetivos después.                                                                                                                                                                                                                                                                         |
| Aliados              | 03112, 08086, 10041, 08032, 11033               | Renfield gana según su perdición y obtiene Voluntad si tiene alguna. Michael Leigh suma Intelecto/Combate, acumula hasta tres pruebas al investigar y gasta una con agotamiento al iniciar un ataque para +1 daño. Charles West añade una mano solo para Herramientas e inflige daño tras investigar por exactamente 1/3. Kirby revela cinco, roba costes pares/impares y baraja el resto. Alton suma Agilidad, acumula pruebas al superar por exactamente tres y gasta tantas como el velo para descubrir una pista. |
| Recursos y pruebas   | 08075, 04274, 05159, 11037                      | Pulsera de maleficios obtiene una carga tras un ataque y paga +2 una vez por prueba. Termo cura al investigador local, con bono por el trauma correspondiente del objetivo. Apurando agota, aumenta la dificultad en dos y elige recursos o robo. Mano y mortero coloca recursos al descubrir pistas y permite pagar cartas Hechizo propias con ellos.                                                                                                                                                                |
| Jugar otras cartas   | 03023, 03033, 09095, 06202, 10030               | Ever Vigilant juega hasta tres apoyos secuencialmente, recalculando costes/permisos. Uncage 0 juega Hechizo/Ritual a −3; nivel 3 admite descarte, además de descartar opcionalmente un apoyo válido. Word of Command busca y roba un Hechizo. Hand-Eye Coordination resuelve una capacidad de acción de Herramienta/Arma, conservando sus otros costes y límites.                                                                                                                                                     |
| Recuperación         | 03196, 06284                                    | Quantum Flux baraja el descarte y roba, retirando solo la copia que se está resolviendo. Nothing Left to Lose repone recursos y cartas hasta cinco de forma independiente y se retira del juego. Retirarlas no las exilia del mazo de campaña.                                                                                                                                                                                                                                                                        |
| Parlamento           | 10057, 10094, 10073, 10083, 05020, 11056, 11072 | Confound descubre dos y evita/impide preparar solo al no Élite. Drain Essence mueve daño, sin curarlo ni infligirlo de nuevo: uno contra Élite o hasta dos contra los demás. Stir the Pot 0/5 diferencia daño fijo y X, donde X es daño+horror del objetivo, no el margen; movimiento opcional posterior. Interrogate exige Humanoide y descubre en dos Lugares. Intimidation usa salud restante y baraja o daña a Élite. Whispers excluye debilidades, derrota o daña a Élite y coloca perdición al fallar.          |

La colocación de perdición añade `PlaceDoomOnAsset.checkAgenda: false` para no
comprobar el umbral inmediatamente. Se conserva el valor predeterminado de los
consumidores anteriores y la sustitución de perdición por daño del escenario.
Renfield y el Tomo no obtienen beneficios por una perdición sustituida. Whispers
reutiliza la opción equivalente ya disponible para enemigos.

## Presentación y procedencia

Fuentes oficiales EN/ES del 30/10/2026 incluidas junto al módulo, con SHA-256 en
`approvals.json`; preparación reproducible con `scripts/prepare-tools-parley.mjs`.
Inventario histórico intacto. El adaptador multiclase se amplía únicamente a cinco
códigos revisados y sus combinaciones exactas; ambas clases se prueban en tienda.

Se sigue el texto sin Tabú. La FAQ oficial de
[Kirby](https://arkhamdb.com/card/08032) confirma que X indefinido es cero y, por
tanto, par; las cartas sin coste numérico no son pares ni impares. El Tomo permite
también Combate, como indica el «puedes» de su
[texto](https://arkhamdb.com/card/07159).

Se incorporan 62 escaneos y 62 miniaturas EN/ES con procedencias y huellas en los
inventarios compartidos. Hoja de contacto de 16 caras inspeccionada: Almádena 4,
Espada encantada 0, Código criptográfico, Tomo abisal, Kirby, Bastón estoque 2,
Sembrar cizaña 5 y Susurros de perdición. Sin validación de navegador.

## Validación y límites

Pruebas compartidas del efecto principal de cada carta, diferencias de nivel,
costes, cargas, agotamiento, objetivos y Élite; compra/inicio, unicidad y
presentación EN/ES. Regresiones de perdición para el nuevo permiso y su valor
predeterminado; consumidores anteriores cubiertos por sus pruebas existentes.
Los resultados finales se conservan en el resumen único de continuación.

Fuera del lote: Recuerdos preciados 08114/08115, porque el límite de una copia por
subtítulo requiere distinguirlo del límite por título en construcción de mazos.
No se activa mediante un límite genérico incorrecto. Se conservan los bloqueos
anteriores de ventanas de derrota, asignación a apoyos y movimiento sin
enfrentamientos. La importación general sigue pendiente.
