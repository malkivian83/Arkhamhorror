# 119 · Fortuna caprichosa

Lote `fortune-dilemmas`: Fortuna caprichosa (09118, nivel 3). Un código y una carta/nivel
nuevo, sin reediciones. En una encrucijada (09109) ya estaba implementada en
`survivor-deck`; se excluyó antes de registrar datos para evitar duplicaciones.

Se resuelve al robarla, con el máximo compartido de dos Dilemas por ronda. Una
opción coloca una perdición en el plan y cura tres puntos de daño y horror de cada
investigador; la otra retira una perdición, inflige un daño y un horror directos a
cada investigador y retira esta copia del juego. No es Exiliar: no modifica el mazo
de campaña. La retirada no afecta a otra copia que ya esté en el descarte. Ambas
opciones se resuelven hasta donde sea posible, también cuando no hay perdición.

El motor permite retirar la disposición final de la revelación en curso, conservando
las demás copias y continuaciones. La cola pendiente sigue siendo serializable y
los guardados anteriores no requieren campos nuevos. Se prueba la elección entre
dos planes, las asignaciones directas que no puede absorber un aliado y el tercer
Dilema de la ronda, que se descarta sin resolver.

Validación: seis pruebas del lote, consumidores del motor, Dilemas y revelaciones,
conversión de aprobaciones, compra, registro único, comienzo de escenario y
presentación EN/ES. Tipos cards/engine, lint/formato y build web. Escaneos y
miniaturas originales EN/ES con huellas y hoja de contacto revisada, sin navegador
ni seguimiento de CI/Deploy. Reutilizar salvo cambios en reglas, contratos,
registros, recursos o dependencias cubiertos.

Acumulado: 1110 jugables; 1032 históricos jugables y 951 históricos pendientes,
incluidos 560 estándar (con impresiones).

Fuente: [Fortuna caprichosa](https://arkhamdb.com/card/09118).
