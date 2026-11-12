# 140 · Escape por los pelos

Lote `narrow-escape`, sobre `ff3806ca`: **1 código, 1 carta/nivel nuevo,
0 reediciones**. Activa `03267` Escape por los pelos (0).

Solo se ofrece cuando un Enemigo realiza un ataque de oportunidad contra quien
la juega. Cancela ese ataque y concede +2 a la siguiente prueba de ese
investigador durante el turno actual. El evento es rápido y gratuito.
Una investigación que provoca el ataque recibe la bonificación antes de su prueba.

El motor añade duración de turno a `NextTestBonus`, manteniendo las duraciones
anteriores. La identidad usa el inicio del turno real, por lo que no se conserva
al repetir turno en la misma ronda. Las bonificaciones se acumulan durante ese
turno, se consumen juntas en la siguiente prueba propia y sobreviven al guardado.
No se consumen por la prueba de otro investigador ni se aplican fuera del turno.

Fuentes oficiales EN/ES y huellas en el manifiesto; conversión reproducible con
`node scripts/prepare-narrow-escape.mjs`. Referencias:
[Escape por los pelos](https://arkhamdb.com/card/03267) y
[reglamento oficial: ataques de oportunidad, cancelación y efectos duraderos](https://cdn.svc.asmodee.net/production-fantasyflightgames/uploads/2026/09/ahc60_rules_reference_eng-compressed.pdf).
Se añaden escaneos y miniaturas EN/ES. La miniatura española se revisó sin navegador.

Diez pruebas específicas cubren cancelación, rechazo, otros ataques y objetivos,
investigación real, consumo único, duración de turno, acumulación y serialización.
La prueba compartida cubre registro único, compra, inicio y presentación EN/ES.

Verificación: los 10 casos específicos y 219 de regresión/presentación/conversión
son correctos. Pasan tipos cards/engine, lint/formato y build web. Se verificaron
las huellas de los dos escaneos, sus miniaturas y ambas fuentes del lote; los
recursos anteriores conservan su verificación del lote 139.

Acumulado: **1431 jugables, 686 históricos pendientes, 311 estándar con impresión**.
Siguen pendientes Primera guardia y Liberación (reparto privado y sustitución del
siguiente Mito), además de las capacidades del inventario 132.
