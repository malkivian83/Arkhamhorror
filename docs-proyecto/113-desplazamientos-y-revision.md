# 113 · Desplazamientos y revisión de reglas

Lote `enemy-relocation`: tres códigos y tres cartas/niveles nuevos, sin
reediciones. Datos y presentación originales EN/ES.

| Código | Carta | Reglas |
| --- | --- | --- |
| 08108 | Deslizamiento etéreo (0) | Intercambia posiciones con un enemigo no Élite en un lugar revelado a hasta dos conexiones. Cuesta 2. |
| 08110 | Deslizamiento etéreo (2) | Mismo intercambio, en cualquier lugar revelado, incluso desconectado. Cuesta 1 y tiene un icono de agilidad adicional. |
| 60466 | Encanto espiritual (0) | Negociar con un enemigo no Élite local o conectado: moverlo al lugar propio, enfrentarlo y ganar sus valores de daño y horror combinados. No requiere lugar revelado. |

`MoveTo.swapEnemy` resuelve el intercambio simultáneamente, después de comprobar
los bloqueos y costes de movimiento. El enemigo elegido rompe su enfrentamiento;
los otros enemigos enfrentados acompañan al investigador. Se conservan agotamiento,
ventanas de entrada y movimiento y enfrentamientos en ambos destinos. No hay un
paso intermedio donde el enemigo elegido pueda enfrentarse y volver con el jugador.
Si desaparece el objetivo/destino o se bloquea el movimiento, no hay intercambio
parcial. Deslizamiento provoca ataques de oportunidad; Encanto usa Negociar.

Las dos versiones de Deslizamiento se registran como multiclase rebelde/místico,
con adaptación explícita y pruebas de conversión, tienda y presentación.

## Revisión solicitada

Se contrastaron textos y módulos de las 17 cartas de los cinco lotes recientes:
`deck-divination`, `secret-scrolls`, `therapeutic-recovery`, `improvised-survival`
y `slot-search`. Se comprobaron distinciones entre mirar/buscar/robar/añadir,
entrar/jugar, costes, ranuras, copias y resultados de pruebas. Esta revisión
acotada no certifica las reglas de las 1100 cartas del catálogo completo.

Fallo reproducido y corregido en **Barrera improvisada (04312)**: la evasión
adicional calculaba el margen sin el modificador de caos. Ahora usa el resultado
final guardado de la prueba. La regresión falla antes de la corrección con -2;
comprueba también +1 y el umbral adicional que sí permite esa ficha. Se revisaron
las otras referencias a `skillTestValue` en los módulos de cartas: los cálculos
comparables restantes ya incorporan el modificador de caos. Revisión de reglas
de `improvised-survival` incrementada a 2, conservando fuentes y huellas.

## Validación

303 pruebas distintas: 99 del lote, presentación y conversión; 204 de motor,
cinco lotes revisados y consumidores de movimiento. Se repitió únicamente el
archivo afectado al afinar los bloqueos de movimiento. Tipos cards/engine,
formato y lint de los archivos editados y build web. Seis escaneos y seis
miniaturas nuevos, huellas y hoja de contacto EN/ES revisadas sin navegador.
Reutilizar estos resultados salvo cambios en reglas, contratos, registros,
recursos o dependencias afectados. Sin consulta de CI ni Deploy.

Acumulado: 1100 códigos jugables; 1022 históricos jugables y 961 históricos
pendientes, incluidos 570 estándar. Los pendientes incluyen impresiones.

Fuentes: [Deslizamiento 0](https://arkhamdb.com/card/08108),
[Deslizamiento 2](https://arkhamdb.com/card/08110),
[Encanto espiritual](https://arkhamdb.com/card/60466), textos EN/ES archivados y
[referencia de reglas](https://arkhamdb.com/rules) (Movimiento, Intercambiar,
Enfrentamiento con enemigos y Pruebas de habilidad).
