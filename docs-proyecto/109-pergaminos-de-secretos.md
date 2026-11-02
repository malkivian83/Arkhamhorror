# 109 · Pergaminos de secretos

Lote `secret-scrolls`: tres códigos y tres versiones mecánicas nuevas, sin
reediciones. Son dos pares de título/nivel: nivel 0 y dos mejoras diferentes de
nivel 3, una de Buscador y otra de Místico.

| Código | Versión | Diferencias revisadas |
| --- | --- | --- |
| 05116 | Buscador/Místico 0 | Tres secretos; mirar una carta inferior y elegir entre descartar, añadir a la mano de su propietario o colocar arriba/abajo. |
| 05188 | Buscador 3 | Tres secretos; mirar las tres inferiores, descartar hasta una, añadir hasta una a la mano y distribuir el resto entre arriba y abajo en cualquier orden. |
| 05189 | Místico 3 | Cuatro secretos; permite mirar la primera o la última carta. |

Las tres versiones originales requieren una acción, agotarse y gastar un secreto.
No se ha aplicado Tabú. La versión 0 conserva ambas clases mediante aprobación
exacta de su código y facciones; las mejoras conservan sus clases e iconos propios.

La elección admite cualquier mazo de investigador activo o el mazo de Encuentros,
sin restricción de distancia. Las cartas de Encuentro no se añaden a una mano de
jugador. Las debilidades se pueden descartar sin resolverlas; si se añaden a la
mano, se resuelven antes de continuar y devolver el resto al mazo. Añadir una carta
ordinaria no activa reacciones de robo como Dream-Enhancing Serum.

Las cartas miradas se conservan por copia física en los datos serializables de la
continuación, fuera del mazo mientras se resuelve el efecto. Los mensajes nuevos
de inspección, traslado y devolución no buscan ni barajan. Las decisiones y las
cartas retenidas sobreviven a guardar/restaurar el estado. Las barajas cortas no
se rellenan. La devolución admite ordenar ambos extremos por separado, conforme
a la resolución oficial de mayo de 2025 sobre la mejora de Buscador.

Presentación: textos originales EN/ES y tres escaneos EN con sus miniaturas y
huellas SHA-256. Los tres escaneos ES del proveedor incorporan Tabú (habilidad
rápida); se excluyen del manifiesto y se utiliza la imagen EN original también en
la interfaz española. Las seis caras se revisaron visualmente antes de excluirlos.

Verificación: 96 pruebas de reglas, integración/presentación y conversión, más
113 de motor y adivinación anterior. Se repitieron solo las tres de presentación
al ajustar la imagen de respaldo. Tipos cards/engine, lint/formato del alcance y
build web. Reutilizar resultados mientras no cambien los módulos, contratos,
recursos o dependencias afectados. Sin navegador ni consulta de CI/Deploy.

Acumulado: 1088 códigos jugables, 1010 históricos jugables, 973 históricos
pendientes y 582 estándar pendientes. Los pendientes incluyen impresiones.

Fuentes: [nivel 0](https://arkhamdb.com/card/05116),
[Buscador 3 y resolución de reparto](https://arkhamdb.com/card/05188),
[Místico 3](https://arkhamdb.com/card/05189) y
[Revelación y debilidades](https://arkhamdb.com/rules#Revelation).
