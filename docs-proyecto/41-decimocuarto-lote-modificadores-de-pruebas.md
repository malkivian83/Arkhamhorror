# 41 · Decimocuarto lote: modificadores de pruebas

21/10/2026. Se comprobó la CI y el despliegue de a73238f y se actualizó main preservando cambios ajenos. Se incorporan **cinco códigos, cinco cartas o niveles distintos nuevos y cero reediciones**.

| Código | Carta | Nivel | Comportamiento revisado |
| --- | --- | ---: | --- |
| 02299 | Vicious Blow | 2 | Añade un daño al ataque exitoso, o dos con margen de éxito de al menos dos |
| 06235 | Leadership | 2 | Iconos adicionales al ayudar; dos recursos para quien compromete y también para quien realiza la prueba si son distintos |
| 60167 | Adapt and Overcome | 0 | Solo ataque o evasión; el investigador que realiza la prueba ignora Alerta y Represalia durante ella |
| 06111 | Daring | 0 | Solo ataque o evasión contra un enemigo; el objetivo gana Alerta y Represalia durante la prueba; quien compromete roba al terminar |
| 09112 | Gumption | 1 | Se compromete sin iconos, máximo una copia; reduce la dificultad en dos mientras esté comprometida |

## Motor y revisión

Vicious Blow reutiliza el modificador del daño del propio ataque, incorporado antes de comprobar la derrota del objetivo. Leadership distingue al investigador que compromete del que realiza la prueba, tanto para iconos como para recursos.

Los modificadores de dificultad conservan la base y el factor multiplicativo separados del ajuste de las cartas comprometidas. Los factores se aplican antes de sumar los ajustes y antes del mínimo cero. Las pruebas combinan Gumption y Double or Nothing en ambos órdenes, con dificultades iniciales uno, dos y tres, incluyendo una serialización JSON entre compromisos. Retirar Gumption antes del resultado restaura la dificultad; retirar cartas después de resolver no altera retrospectivamente el resultado ni su margen.

Alerta y Represalia añadidas se guardan en la prueba, sin cambiar las palabras clave impresas. La consulta común de palabras clave reconoce el bono solo para su objetivo. Ignorar esas palabras clave para la prueba prevalece sobre concederlas, sin eliminar las palabras clave del enemigo para otros contextos. Se respetan enemigos agotados y vinculadas que eliminan palabras clave. Los efectos que duran toda la prueba se conservan aunque la carta salga antes de la zona de compromiso y desaparecen al finalizar.

El robo de Daring ocurre después de limpiar las cartas comprometidas. Una regresión con mazo y descarte vacíos comprueba que su propia carta ya puede entrar en el barajado y ser robada. Otra comprueba que la siguiente prueba no conserva las palabras clave temporales. Las pruebas iniciales reprodujeron la ausencia de los modificadores de dificultad y de las palabras clave concedidas antes de añadir su soporte.

Cada carta tiene módulo y prueba propios: éxito, fracaso, ayuda ajena, restricciones, umbrales y uso en un mazo legal o compra con experiencia que llega al inicio de un escenario. Se añaden nombres y resúmenes propios EN/ES mediante el renderizador existente.

## Trazabilidad y recuentos

- Fuente inmutable: packages/cards/src/catalog/imports/3c8ee4b5d8100766. Se conservan los inventarios, manifiestos y huellas históricos.
- Aprobaciones: packages/cards/src/test-modifiers/approvals.json, junto a módulos y pruebas individuales y de regresión.
- Regeneración: node scripts/prepare-dunwich-pilot.mjs test-modifiers.
- Unicidad por código y familia canónica frente al básico y todos los lotes anteriores.
- Acumulado añadido: **207 códigos = 126 cartas o niveles distintos nuevos + 81 impresiones adicionales**.
- Con los 104 registros originales: **311 registros y 230 familias canónicas**.
- Del inventario histórico de 1983 códigos quedan **1672 códigos sin incorporar**, incluyendo reediciones; no son 1672 cartas distintas pendientes.
