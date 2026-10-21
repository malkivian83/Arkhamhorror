# 35 · Octavo lote: reacciones y protección

21/10/2026. Se verificó la CI y el despliegue de a04af03 antes de empezar. Se incorporan **10 cartas o mejoras distintas**, sin impresiones adicionales de cartas ya representadas.

## Alcance

Se prioriza comportamiento nuevo frente al volumen de códigos. Este lote es menor que el objetivo orientativo de 30–50 registros: no se completa con reediciones, y las cartas que requieren ampliar las ventanas de habilidades rápidas se dejan para un lote con esa mecánica revisada.

| Código | Carta | Nivel |
| --- | --- | ---: |
| 01033 | Dr. Milan Christopher | 0 |
| 01075 | Rabbit's Foot | 0 |
| 01046 | Pickpocketing | 0 |
| 02155 | Newspaper | 0 |
| 03021 | True Grit | 0 |
| 05109 | Something Worth Fighting For | 0 |
| 03037 | Gravedigger's Shovel | 0 |
| 51003 | Preposterous Sketches | 2 |
| 50010 | Rabbit's Foot | 3 |
| 03039 | Resourceful | 0 |

- Dr. Milan Christopher añade intelecto y permite ganar un recurso tras cada investigación exitosa. Sigue las reglas originales, sin agotamiento del tabú opcional; se prueban dos investigaciones consecutivas.
- Rabbit's Foot de nivel cero roba una carta tras un fallo y se agota. La mejora de nivel tres busca entre tantas primeras cartas como el margen de fallo; elige una válida y baraja. No se buscan cartas más allá del margen ni se roban debilidades solo por encontrarlas.
- Pickpocketing de nivel cero permite agotarse para robar tras evitar a un enemigo. Se distingue del efecto de recursos de otras cartas ya disponibles.
- Newspaper añade intelecto solo mientras se investiga sin pistas propias. La bonificación desaparece en cuanto el investigador obtiene una pista.
- True Grit absorbe daño de investigadores en el mismo lugar. Something Worth Fighting For hace lo equivalente para horror. Se prueba tanto la asignación a otro investigador cercano como la exclusión de quien está en otro lugar.
- Gravedigger's Shovel ataca con combate adicional sin daño adicional. Su otra acción paga el descarte para descubrir una pista; no se ofrece sin pistas en el lugar.
- Preposterous Sketches de nivel dos conserva su coste y requiere una pista en el lugar, no en la reserva del investigador, para robar tres cartas.
- Resourceful recupera una carta Superviviente del descarte de quien la asignó tras un éxito. Excluye su propio título y otras clases; no recupera al fallar.

## Integración y duplicados

Manifiesto, módulos y pruebas: packages/cards/src/reactive-support/. Datos: packages/cards/src/data/reactive-support.json. Regeneración: node scripts/prepare-dunwich-pilot.mjs reactive-support.

Cada carta tiene módulo, prueba del efecto, coste o restricción relevante, prueba de mazo legal o compra de experiencia seguida de inicio real de escenario, nombre EN/ES y resumen propio. La mejora de Rabbit's Foot se compra con Isabelle: Daniela no admite cartas Superviviente de nivel tres.

Una prueba específica comprueba que cada código y su familia de impresión son nuevos respecto a los siete lotes anteriores y la caja de 2026. Se mantienen las comprobaciones de impresión única en el catálogo y en la tienda. No se modifican los inventarios históricos ni sus huellas.

## Recuento sin confundir cartas con impresiones

- Lotes anteriores: 153 códigos incorporados = 72 cartas o niveles nuevos + 81 impresiones adicionales.
- Este lote: 10 códigos = **10 cartas o niveles nuevos y 0 reediciones**.
- Acumulado: **163 códigos = 82 cartas o niveles nuevos + 81 impresiones adicionales**.
- Junto a los 104 registros iniciales: 267 registros, correspondientes a 186 familias de impresión. Se siguen separando los niveles diferentes.
- Del inventario histórico de 1.983 registros quedan **1.716 códigos pendientes**. Esta cifra incluye reediciones todavía no incorporadas; no equivale a 1.716 cartas distintas nuevas.

La fuente permanece en 3c8ee4b5d8100766, con instantánea inglesa SHA-256 36bdf57ced256a33c3145b1562eea5f8ea6146d38e6a600cb04e27d43ef5749e. Los datos importados pendientes no se consideran jugables.

## Comprobaciones de la entrega

pnpm format:check, pnpm lint, pnpm typecheck, pnpm test y pnpm build correctos. Suite completa: **1.571 pruebas correctas y 15 omitidas**. Se verifica además la integridad de 912 imágenes y miniaturas existentes; este lote no añade escaneos. Permanecen los avisos anteriores de fuente externa y tamaño de paquete web. La prueba de familias nuevas no depende de APIs de Node en el paquete de cartas: importa los JSON revisados.

Los cambios locales ajenos a la importación se conservan y se excluyen del commit. La automatización continúa activa.
