# 44 · Pete «Cubo de Basura», Duke y Roto por las pesadillas

21/10/2026. Se incorpora el Pete original de Dunwich (02005), Duke (02014) y su debilidad original (02015). Son **tres códigos nuevos: un investigador y dos cartas exclusivas, sin reediciones ni variantes paralelas**. La importación automática general sigue detenida; esta subida responde a la petición específica de añadir a Pete.

## Comportamiento y construcción

Pete comienza cada escenario con Duke en juego, fuera del mazo antes de barajar y robar la mano inicial. Su habilidad gratuita descarta una carta que no sea debilidad para preparar un apoyo propio agotado, una vez por ronda. Se aplica el texto corregido de preparar un apoyo, aunque un escaneo de la primera impresión diga carta. Está disponible en las ventanas de jugador, incluidas las pruebas y los turnos de otros investigadores. El signo arcano aporta +2 y prepara a Duke al revelar la ficha, sin pagar carta ni consumir el límite de la habilidad gratuita.

Duke no ocupa ranura de aliado y puede absorber dos daños o tres horrores antes de ser derrotado. Sus acciones cuestan una acción y agotarlo: atacar con combate base cuatro y un daño adicional, o investigar con intelecto base cuatro, pudiendo moverse antes a un lugar conectado legal. El movimiento revela el destino y resuelve sus efectos antes de calcular el velo. Se conservan los costes de entrada y las restricciones de movimiento. La investigación provoca ataques de oportunidad; el ataque no. Las habilidades de Duke no cuentan como acciones básicas para Brute Force, Sharp Vision o Expeditious Retreat.

La base de cuatro se guarda separada de los modificadores, sin cambiar los atributos impresos de Pete. Los bonos pasivos y los iconos se suman después. Rise to the Occasion y su mejora consultan esa base reemplazada al comprobar sus restricciones.

Roto por las pesadillas agota los apoyos propios al revelarse y permanece en la zona de amenaza. Bloquea su preparación por mantenimiento, habilidad gratuita y signo arcano. Se descarta mediante una habilidad de dos acciones; otros investigadores en el mismo lugar pueden ayudar. El bloqueo desaparece al descartarla.

El mazo exige treinta cartas elegidas, Duke, la debilidad exclusiva y una debilidad básica. Admite Superviviente y neutral de nivel 0–5, y hasta cinco cartas de nivel cero de otras clases, contando copias. La validación y las compras comprueban el límite; ninguna carta exclusiva entra en el catálogo de compra de otros investigadores. Se incluye un mazo inicial propio válido y la selección de Pete en nueva partida y en el editor de mazos. Los cinco investigadores y los 104 registros de la caja de 2026 se conservan como conjunto histórico.

## Recursos oficiales y presentación EN/ES

Por petición de la persona usuaria, la convención 06 prioriza ahora los textos e ilustraciones oficiales disponibles. La aplicación de referencia identifica las rutas de cartas y retratos en su CDN mediante frontend/src/arkham/helpers.ts y cardImages.ts. No contiene copias locales de estos tres códigos; se descargan desde esas mismas rutas:

- Ocho imágenes de cartas: anverso y reverso de Pete, Duke y la debilidad, en EN y ES.
- Retrato oficial de Pete en /local-assets/setup/02005.jpg.
- Ocho miniaturas nuevas, generadas de forma selectiva sin rehacer las anteriores.
- Procedencia, tamaños y SHA-256 en evidencias/pete-recursos-oficiales.json y en los inventarios existentes.

Se revisaron visualmente los ocho escaneos y el retrato. El navegador de verificación disponible no alcanza el servidor de desarrollo local; las pruebas web comprueban los nombres, atributos, textos de respaldo y reverso en ambos idiomas. El cargador consulta también el paquete Dunwich de ArkhamDB para mostrar los textos de las tres cartas en su idioma. Filtra el resto del paquete para no activar ni presentar investigadores adicionales. Sin conexión mantiene resúmenes locales y las imágenes oficiales locales. El retrato generado durante el desarrollo no se incorpora a la web.

## Evidencia y continuidad

- Verificación final: pnpm format:check, pnpm lint, pnpm typecheck, pnpm test y pnpm build correctos. Suite completa: **1947 pruebas correctas y 15 omitidas**. Inventario de imágenes: **969 imágenes y 969 miniaturas**, con los 961 registros históricos de cada inventario intactos.
- Datos regenerables desde el inventario inmutable 3c8ee4b5d8100766: node scripts/prepare-ashcan-pete.mjs. Aprobaciones y módulos individuales en packages/cards/src/ashcan-pete/.
- Referencia de reglas revisada: AshcanPete, Duke y WrackedByNightmares del programa de referencia. Se prueban preparación, agotamiento, costes, base, iconos, daño, movimiento, signo arcano real, prohibición de preparación, mazos y compras.
- Unicidad por código y familia canónica frente a todos los lotes anteriores. Inventarios históricos y huellas anteriores conservados.
- Último lote anterior: 6fa771d, CI y Deploy correctos. La automatización permanece eliminada; no hay siguiente lote automático autorizado en ejecución.
- Acumulado: **319 códigos incorporados, 238 familias canónicas**. Frente al inventario histórico de 1983 códigos quedan **1664 códigos**, incluyendo reediciones; no son 1664 cartas distintas pendientes.
