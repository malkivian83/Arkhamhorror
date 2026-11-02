# 108 · Adivinación y orden de mazos

Lote `deck-divination`: cinco códigos y cinco cartas/niveles nuevos; ninguna
reedición. Comparados por código y título/nivel con el registro jugable anterior.

| Código | Carta | Comportamiento revisado |
| --- | --- | --- |
| 01061 | Videncia (0) | Acción, agotar y gastar carga; mirar y ordenar tres cartas de cualquier mazo de investigador o del mazo de Encuentros. |
| 03236 | Videncia (3) | Habilidad rápida; recibir un horror si entre las cartas miradas hay Terror o Presagio, aunque haya varias. |
| 02232 | Alyssa Graham (0) | Intelecto constante; mirar una carta y decidir si pagar una perdición para ponerla debajo. La perdición no comprueba inmediatamente el avance del plan. |
| 60415 | Destinos paralelos (0) | Mirar cuatro cartas de Encuentros y revelar una ficha; según su símbolo, barajar o elegir el orden. |
| 08066 | Destinos paralelos (2) | Mirar seis cartas de cualquier mazo, elegir ordenar o barajar; el dueño del mazo de investigador decide después si roba. |

`ReorderDeck` conserva la identidad física por posición, valida la permutación y
mantiene las cartas fuera de la ventana. Permite ordenar arriba, mover abajo o
barajar en el mazo completo. Mirar no busca, roba ni resuelve revelaciones: las
cartas permanecen en su mazo durante las decisiones. Las barajas cortas no se
rellenan ni mezclan sus descartes. La revelación de Destinos paralelos reutiliza
la ventana de fichas fuera de prueba y conserva la ficha en la bolsa.

Presentación EN/ES y subtítulo original de Alyssa; diez imágenes y diez miniaturas
con huellas SHA-256. Hoja de contacto de las diez caras revisada: textos y niveles
coinciden con las fuentes originales, sin aplicar Tabú.

Verificación: 18 casos dirigidos de reglas, cinco de compra/registro/inicio y
presentación, conversión de aprobaciones y consumidores del motor (173 pruebas
en esa selección). Tipos cards/engine, lint/formato del alcance y build web.
Reutilizar resultados mientras no cambien los módulos o dependencias afectados.
No se ha usado navegador ni consultado CI/Deploy.

Acumulado: 1085 códigos jugables, 1007 históricos jugables y 976 históricos
pendientes; 585 estándar pendientes. Los pendientes incluyen impresiones.

Fuentes de reglas: [Videncia 0](https://arkhamdb.com/card/01061),
[Videncia 3](https://arkhamdb.com/card/03236),
[Alyssa Graham](https://arkhamdb.com/card/02232),
[Destinos paralelos 0](https://arkhamdb.com/card/60415) y
[Destinos paralelos 2](https://arkhamdb.com/card/08066).
