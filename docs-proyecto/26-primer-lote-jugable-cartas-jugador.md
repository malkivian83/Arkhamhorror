# 26 · Primer lote jugable de cartas de jugador

> Estado posterior: [piloto completo de 24 cartas](27-cierre-piloto-cartas-jugador.md).
> Este documento conserva el informe de su etapa inicial.

20/10/2026. Continuación del [inventario inicial](25-primer-inventario-cartas-jugador.md).
Se incorporan **siete cartas** de `dwl` y `tmm` al registro jugable, al constructor
y a la compra con experiencia. El inventario histórico de 1.983 registros se
conserva intacto.

## Cartas incorporadas

| Código  | Carta                   | Contrato verificado                                                                                                                                               |
| ------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `02020` | Ayudante de laboratorio | Amplía el límite de mano mientras está controlado. Al entrar en juego ofrece robo opcional, también si entra por un efecto.                                       |
| `02030` | Claridad mental         | Acción y carga como costes; cura a un investigador con horror en el mismo Lugar. Excluye objetivos sanos, lejanos o eliminados.                                   |
| `02033` | Peter Sylvestre         | Modifica agilidad y recupera opcionalmente su propio horror al terminar el turno del controlador. Se respeta su condición de único.                               |
| `02105` | Cura de urgencia        | Cura daño de un investigador del mismo Lugar o de uno de sus apoyos con rasgo Aliado. No admite otros apoyos.                                                     |
| `02109` | Contrabando             | Duplica la munición o los suministros restantes del apoyo elegido, incluido uno de otro investigador cercano. No repone usos vacíos ni duplica secretos o cargas. |
| `02116` | Pipa                    | Agotamiento, suministro y daño como costes de una habilidad sin acción; después cura horror propio. El coste admite asignación a apoyos.                          |
| `02117` | Analgésicos             | Agotamiento, suministro y horror como costes de una habilidad sin acción; después cura daño propio. El coste admite asignación a apoyos.                          |

Las dos últimas habilidades se ofrecen también antes de revelar fichas de una
prueba del controlador. Gastar el último uso no descarta estos apoyos ni Claridad
mental.

La [matriz de las 24 cartas](26-matriz-piloto-jugador.csv) distingue las siete
verificadas de las **17 aplazadas**, con el motivo técnico de cada una. Entre las
pendientes hay duplicación de resultados, redirección de daño, costes dentro de
un ataque, ventanas anteriores a aparición, intercambio de control y cálculo
dinámico del daño. Los datos representables no sustituyen esas implementaciones.

## Datos y procedencia

- Datos: [`dunwich-pilot.json`](../packages/cards/src/data/dunwich-pilot.json).
- Selección: [`approvals.json`](../packages/cards/src/dunwich-pilot/approvals.json),
  con lote de origen, revisión de reglas, módulo y prueba por carta.
- Generador: [`prepare-dunwich-pilot.mjs`](../scripts/prepare-dunwich-pilot.mjs).
  Verifica la huella del catálogo fuente, exige aprobación explícita y rechaza
  modelos, costes simbólicos y palabras clave no soportados por su adaptador.
- Comportamiento y pruebas: un módulo por carta en
  [`dunwich-pilot/`](../packages/cards/src/dunwich-pilot/).

Para regenerar los siete datos revisados:

```powershell
node scripts/prepare-dunwich-pilot.mjs
```

El catálogo de origen mantiene `activation: "not-reviewed"`: refleja el momento
de su importación. La aprobación posterior vive en el manifiesto del piloto,
sin reescribir aquella evidencia. El JSON básico conserva sus 104 registros y el
registro inicial añade siete, además del contenido registrado por escenarios.

Se estudiaron los módulos homónimos de `Asset/Assets` y `Event/Events` de la copia
externa y las instantáneas EN/ES. El comportamiento es propio. Las páginas de
[Pipa](https://arkhamdb.com/card/02116) y [Analgésicos](https://arkhamdb.com/card/02117)
permiten contrastar sus costes; las pruebas citan las secciones de reglas.

## Presentación EN/ES

Las siete cartas utilizan presentación renderizada, datos locales, nombres EN/ES
y resúmenes propios. **No se han incorporado escaneos ni textos íntegros.**
`presentation: "rendered"` es explícito y la sincronización de imágenes lo
respeta. Las comprobaciones siguen exigiendo las imágenes del contenido anterior.
La presentación del piloto no necesita consultar ArkhamDB.

## Mazos y disponibilidad

La importación conserva códigos y cantidades, incluido un investigador todavía
desconocido. Los códigos pendientes aparecen en el editor y pueden retirarse de
uno en uno. El mensaje de importación informa de que el mazo sigue completo.

Se rechazan cantidades inválidas y entradas de más de 1.000 cartas sin alterar
los mazos guardados. No se sustituyen ediciones automáticamente.

Una carta desconocida o sin comportamiento bloquea el inicio. La protección se
aplica a la selección de mazos y también al crear una campaña o preparar un
escenario directamente. Constructor y compra consultan el registro ampliado y
ofrecen contenido implementado que cumple sus demás reglas.

Las copias de Ayudante de laboratorio de ambas ediciones cuentan juntas para el
límite por título. Esto no habilita alias automáticos para otras reimpresiones
ni resuelve todavía la identidad general de títulos y versiones de reglas.

## Ajustes del motor y verificación

Dos protecciones necesarias para el lote:

1. Un apoyo único no se puede jugar ni introducir por efecto si ya hay una copia
   del mismo título entre los apoyos controlados, aunque tenga otro controlador.
2. Una curación pendiente no afecta a un investigador eliminado al pagar su coste.

Las pruebas cubren efectos, objetivos inválidos, costes, opcionalidad, límite de
mano, otros controladores, usos restantes, asignación de costes, eliminación y
ventana previa a las fichas. También se comprueban conservación y persistencia
de mazos, bloqueo de contenido pendiente, compras, títulos compartidos y datos
generados desde aprobaciones.

```powershell
pnpm test --project cards src/dunwich-pilot
```

Siguen pendientes las 17 cartas aplazadas, el versionado general de reglas en los
guardados y las ventanas/mecánicas nuevas que requieran. Este lote utiliza las
ventanas actuales del motor; no acredita todas las interacciones del catálogo.

Verificación de esta entrega: formato, lint, tipos, compilación y suite completa
correctos; las pruebas de integración comprueban además el arranque real con cada
carta en un mazo válido. Las 15 pruebas omitidas no acreditan cobertura en este
entorno. Sin commit ni push.
