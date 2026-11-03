# 117 · Beneficios del próximo turno

Lote `next-turn-benefits`: Consejo (09053, nivel 1) y Aguardar tu momento
(10129, nivel 0). Dos códigos y cartas/niveles distintos nuevos, sin reediciones.

Consejo elige a otro investigador local que aún no haya jugado su turno esta ronda.
Durante ese turno obtiene una acción y +1 a todos sus atributos. No provoca ataques
de oportunidad. Caduca si no llega a aplicarse en esa ronda.

Aguardar tu momento cuesta una acción adicional: normalmente se pagan dos acciones
en total. Concede dos acciones en el siguiente turno real, aunque sea de otra ronda.
Las acciones «como si fuera tu turno» no consumen el beneficio. Los efectos se pueden
acumular y se consumen una sola vez, respetando las pérdidas de acciones pendientes.

El motor guarda beneficios opcionales para el siguiente turno; los aplica al comenzar
el turno real y elimina la reserva. Los atributos usan el identificador del turno,
por lo que no se arrastran a turnos posteriores. Los guardados anteriores siguen válidos.

Validación: reglas, acumulación y serialización, restricciones de objetivo, caducidad,
compra, registro único, inicio de escenario y presentación EN/ES; pruebas de consumidores
del inicio de turno, conversión de aprobaciones, tipos cards/engine, lint/formato y build
web. Cuatro escaneos y miniaturas con huellas y hoja de contacto revisada. Reutilizar salvo
cambios en reglas, contratos, registros, recursos o dependencias cubiertos. Sin navegador
ni seguimiento de CI/Deploy.

Acumulado: 1107 jugables; 1029 históricos jugables, 954 históricos pendientes,
incluidos 563 estándar (con impresiones).

Fuentes: [Consejo](https://arkhamdb.com/card/09053),
[Aguardar tu momento](https://arkhamdb.com/card/10129).
