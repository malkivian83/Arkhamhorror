# 42 · Decimoquinto lote: resultados distribuidos

21/10/2026. Se verificaron CI y despliegue de 5e5213e y se actualizó main conservando el cambio ajeno del workflow. Este lote incorpora **dos códigos, dos cartas o niveles distintos nuevos y cero reediciones**. Se limita a estas dos cartas para cerrar y probar sus decisiones opcionales y su selección de objetivos; no se completa el tamaño con impresiones ya representadas.

| Código | Carta | Nivel | Comportamiento revisado |
| --- | --- | ---: | --- |
| 11077 | Enraptured | 2 | Tras investigar con éxito, permite repartir hasta tres cargas y/o secretos entre apoyos controlados por investigadores en el lugar de quien compromete; máximo una copia por prueba |
| 10076 | Lightfooted | 0 | Tras una evasión con éxito, quien compromete puede evitar automáticamente a otro enemigo en su lugar |

## Reglas, integración y presentación

Se revisaron las descripciones EN/ES del inventario y los módulos de referencia Enraptured2 y Lightfooted, con implementación propia. La distribución conserva el presupuesto pendiente en mensajes serializables, permite detenerse sin colocar nada o después de cualquier colocación y vuelve a consultar objetivos tras cada decisión. Admite mezclar cargas y secretos entre distintos apoyos. Excluye propietarios eliminados, investigadores en otros lugares y apoyos sin el tipo de uso apropiado; respeta los límites de usos declarados por su comportamiento.

Lightfooted excluye al enemigo de la evasión original y permite elegir otro enemigo local aunque esté enfrentado a otro investigador. El efecto pertenece a quien compromete, también al ayudar en una prueba ajena. El agotamiento y la retirada del enfrentamiento reutilizan la evasión automática del motor.

Cada carta tiene módulo y prueba propios. Las pruebas cubren éxito, fracaso, otro tipo de acción, ayuda ajena, rechazo del efecto, distribución mixta, interrupción voluntaria, persistencia JSON, actualización de objetivos, ausencia de objetivos y límite de compromiso. Ambas pasan por construcción de mazo o compra con experiencia y llegan al inicio de un escenario. Se añaden nombres y resúmenes propios EN/ES mediante la presentación renderizada existente.

Comprobaciones locales correctas: pnpm format:check, pnpm lint, pnpm typecheck, pnpm test y pnpm build. La suite completa termina con **1889 pruebas correctas y 15 omitidas**; el lote cuenta con 21 pruebas, además de la regeneración de datos aprobados. Se verifican también 961 imágenes y sus 961 miniaturas existentes.

## Trazabilidad y recuentos

- Fuente inmutable: packages/cards/src/catalog/imports/3c8ee4b5d8100766. Se conservan los inventarios, manifiestos y huellas históricos.
- Aprobaciones y pruebas: packages/cards/src/distributed-results/.
- Regeneración: node scripts/prepare-dunwich-pilot.mjs distributed-results.
- Unicidad por código y familia canónica frente al básico y todos los lotes anteriores.
- Acumulado añadido: **209 códigos = 128 cartas o niveles distintos nuevos + 81 impresiones adicionales**.
- Con los 104 registros originales: **313 registros y 232 familias canónicas**.
- Del inventario histórico de 1983 códigos quedan **1670 códigos sin incorporar**, incluyendo reediciones; no son 1670 cartas distintas pendientes.
