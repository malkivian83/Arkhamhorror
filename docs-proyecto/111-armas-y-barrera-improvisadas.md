# 111 · Armas y barrera improvisadas

Lote `improvised-survival`: tres códigos y tres cartas/niveles distintos nuevos;
sin reediciones. Escudo improvisado 09103 se excluyó porque ya era jugable en
`charged-assets`.

| Código | Carta | Diferencias revisadas |
| --- | --- | --- |
| 04033 | Arma improvisada (0) | Combate con -1 combate del enemigo; desde el descarte, +1 daño y devolución al mazo después de resolver el ataque. |
| 11092 | Arma improvisada (2) | -2 combate; desde el descarte, +1 daño y robo de una carta después de devolverla al mazo. |
| 04312 | Barrera improvisada (0) | Evasión con -1 evasión del enemigo; desde el descarte, evasión adicional opcional de otro enemigo del mismo lugar cuyo valor de evasión no supere el margen. |

Los eventos se pueden jugar desde mano o descarte. Sus designadores mantienen
las reglas de Combate/Evasión y requieren un primer objetivo legal. La reducción
afecta a la dificultad del enemigo, no al valor de habilidad del investigador.
La evasión adicional no requiere enfrentamiento: admite un enemigo Distante o
enfrentado a otro investigador, conserva las restricciones de evasión y evalúa
sus modificadores de escenario y vinculados.

La devolución se resuelve después de todos los efectos de la prueba, tanto si
tiene éxito como si falla. `ShufflePlayedEvent` verifica que la copia provisional
siga presente antes de barajar; no crea una copia si ya no está en su origen.
Con el amuleto de Wendy se captura el destino original al jugar el evento: se
baraja la copia que está al fondo y se conservan las copias anteriores del
descarte, incluso si el amuleto deja el juego antes de terminar.

Presentación original EN/ES, seis escaneos y seis miniaturas nuevos con huellas
SHA-256. Hoja de las seis caras revisada; sin cambios de Tabú. Inventarios
históricos conservados y duplicados comprobados automáticamente.

Validación: 95 pruebas de reglas, integración/presentación y conversión; 98 del
motor y del amuleto de Wendy. Tipos cards/engine, lint/formato y build web del
alcance. Reutilizar resultados mientras no cambien reglas, contratos, registros,
recursos o dependencias afectados. Sin navegador ni consulta de CI/Deploy.

Acumulado: 1094 códigos jugables, 1016 históricos jugables, 967 históricos
pendientes y 576 estándar pendientes. Los pendientes incluyen impresiones.

Fuentes: [Arma improvisada 0](https://arkhamdb.com/card/04033),
[Arma improvisada 2](https://arkhamdb.com/card/11092) y
[Barrera improvisada](https://arkhamdb.com/card/04312).
