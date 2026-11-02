# 110 · Psicoanálisis y Alivio

Lote `therapeutic-recovery`: tres códigos y tres cartas/niveles distintos nuevos,
sin reediciones. Datos originales, reglas revisadas y presentación EN/ES.

| Código | Carta | Comportamiento |
| --- | --- | --- |
| 60264 | Psicoanálisis (0) | Elegir un investigador local y revelar sus tres cartas superiores. Su propietario decide entre robar una y barajar el resto o curar dos horrores y ordenar las cartas. |
| 60278 | Psicoanálisis (3) | Resolver cada investigador local por separado: revelar, robar una de esas cartas, barajar el resto y curar dos horrores. |
| 60577 | Alivio (2) | Sin enemigos en el lugar, recuperar hasta tres copias de eventos/habilidades de nivel 0 del descarte, barajarlas en el mazo y robar una carta. |

El robo de una carta inspeccionada es explícito: abre las ventanas de robo,
incluida Dream-Enhancing Serum, y resuelve revelaciones antes de continuar. La
adición a la mano del Pergamino de secretos conserva su comportamiento anterior.
Las cartas reveladas y retenidas permanecen en datos serializables mientras se
resuelven las decisiones y debilidades. El propietario elige la carta que roba.

La inspección de un mazo vacío ahora continúa con una lista vacía: permite la
curación posterior sin robar cartas inexistentes ni barajar el descarte. Una
lista vacía de cartas restantes no provoca una baraja adicional. La rama de
curación también permite ordenar cuando no hay horror que curar. La mejora
resuelve completamente a cada investigador antes de pasar al siguiente, sin
incluir a los que estaban en otro lugar al jugarla.

Alivio cuenta copias físicas; permite detenerse entre cero y tres. Excluye apoyos
y niveles superiores. Un enemigo agotado o no enfrentado también impide jugarla.

Presentación: seis escaneos originales y seis miniaturas EN/ES con huellas SHA-256;
hoja de contacto de las seis caras revisada. Se conserva el inventario histórico.

Validación: 89 pruebas iniciales del lote/integración/conversión, más el caso nuevo
de ordenar sin horror y sus casos afectados; 132 pruebas de motor, adivinación y
Pergamino de secretos. Tipos cards/engine, lint/formato y build web del alcance.
No se ha usado navegador ni consultado CI/Deploy. Reutilizar resultados mientras
no cambien reglas, contratos, registros, recursos o dependencias afectados.

Acumulado: 1091 códigos jugables, 1013 históricos jugables y 970 históricos
pendientes, incluidos 579 estándar. Los pendientes incluyen impresiones.

Fuentes: [Psicoanálisis 0](https://arkhamdb.com/card/60264),
[Psicoanálisis 3](https://arkhamdb.com/card/60278) y
[Alivio](https://arkhamdb.com/card/60577).
