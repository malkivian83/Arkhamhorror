# 43 · Decimosexto lote: habilidades de acciones básicas

21/10/2026. Se verificaron CI y despliegue de 43a2782 y se actualizó main conservando el workflow ajeno. Se incorporan **tres códigos, tres cartas o niveles distintos nuevos y cero reediciones**.

| Código | Carta | Nivel | Comportamiento revisado |
| --- | --- | ---: | --- |
| 06166 | Brute Force | 1 | Dos iconos de combate adicionales durante un ataque básico; con éxito por al menos dos, añade dos daños a ese ataque |
| 06204 | Sharp Vision | 1 | Dos iconos de intelecto adicionales durante una investigación básica; con éxito por al menos dos, añade una pista al resultado |
| 06246 | Expeditious Retreat | 1 | Dos iconos de agilidad adicionales durante una evasión básica; con éxito por al menos dos, permite evitar automáticamente a otro enemigo local |

Las tres conservan su icono impreso en pruebas de otro origen y tienen máximo una copia comprometida por prueba. Este lote cierra la mecánica compartida de acciones básicas; no se añaden reediciones para aumentar artificialmente su tamaño.

## Revisión e implementación

El motor marca expresamente las pruebas iniciadas por las acciones estándar de atacar, investigar y evitar. La marca se guarda en la prueba y sobrevive a la serialización. Una prueba sin apoyo de origen no se considera automáticamente básica: los eventos y efectos de escenario también pueden iniciar pruebas sin ese origen. La siguiente prueba comienza con su propia identidad, sin heredar la anterior.

Brute Force usa el modificador del daño del ataque antes de comprobar la derrota, sin crear otra instancia de daño. Sharp Vision añade la pista al descubrimiento original, antes de sus disparadores; respeta efectos que sustituyen ese descubrimiento. Ambos beneficios modifican el resultado para quien realiza la prueba, incluso cuando otra persona aporta la habilidad.

Expeditious Retreat reutiliza la selección opcional de evasión automática de Lightfooted. Quien compromete decide y puede rechazarla. Se excluye el objetivo original y se consulta la localización actual. La revisión de la referencia detectó que su módulo no comprueba el margen de dos; aquí se sigue el texto del inventario y se prueba expresamente el éxito por uno sin evasión adicional.

Fuentes de revisión: inventario EN/ES inmutable, módulos BruteForce1, SharpVision1 y ExpeditiousRetreat1 del programa de referencia; [Rules Reference oficial](https://images-cdn.fantasyflightgames.com/filer_public/c4/b0/c4b0d66c-d79e-411b-bdb5-b5d8c457d4bc/ahc01_rules_reference_web.pdf) y [FAQ oficial, beneficios de habilidades comprometidas por otro investigador](https://images-cdn.fantasyflightgames.com/filer_public/4b/03/4b032c44-5d3c-4436-bda6-c160e4319b91/ahc_faq_v21-compressed.pdf). Se implementan comportamientos y resúmenes propios, sin copiar código ni texto completo.

## Pruebas y presentación

Cada carta tiene módulo y prueba propios. Se prueban acciones básicas reales, ayuda ajena, margen dos, margen uno, fracaso, pruebas no básicas sin apoyo de origen, tipo de acción distinto, máximo una copia, compra con experiencia e inicio de escenario. Las regresiones comprueban descubrimiento único de pistas, sustitución del descubrimiento, daño antes de derrota, daño colateral de ataque fallido, rechazo de la evasión y ausencia de marca residual en la siguiente prueba. Se incluyen nombres y resúmenes EN/ES mediante presentación renderizada.

Comprobaciones locales correctas: pnpm format:check, pnpm lint, pnpm typecheck, pnpm test y pnpm build. La suite completa termina con **1921 pruebas correctas y 15 omitidas**. El lote tiene 31 pruebas y añade su regeneración al control de datos aprobados. Se verifican también las 961 imágenes y sus 961 miniaturas existentes.

## Trazabilidad y recuentos

- Fuente inmutable: packages/cards/src/catalog/imports/3c8ee4b5d8100766; inventarios históricos y huellas conservados.
- Aprobaciones y pruebas: packages/cards/src/basic-action-skills/.
- Regeneración: node scripts/prepare-dunwich-pilot.mjs basic-action-skills.
- Unicidad por código y familia canónica frente al básico y todos los lotes anteriores.
- Acumulado añadido: **212 códigos = 131 cartas o niveles distintos nuevos + 81 impresiones adicionales**.
- Con los 104 registros originales: **316 registros y 235 familias canónicas**.
- Del inventario histórico de 1983 códigos quedan **1667 códigos sin incorporar**, incluyendo reediciones; no equivalen a 1667 cartas distintas.
