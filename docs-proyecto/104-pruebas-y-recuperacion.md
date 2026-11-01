# 104 · Pruebas y recuperación

Lote `test-recovery`, posterior a `protection-tools` (`0329877b`): 30 códigos,
30 cartas o niveles distintos nuevos, sin reediciones de relleno. Un solo agente.
La selección se contrastó contra los datos ya declarados y el registro anterior.
Las impresiones 60413/60414 se descartaron al encontrar sus versiones jugables;
las sustituyen dos mejoras distintas de Verdad de la ficción y Piedra antigua.

## Familias y diferencias

| Familia                 | Códigos                                  | Implementación revisada                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cargas tras el éxito    | 08090, 08092, 08101, 08103, 08109, 08111 | Marca de Cthugha, Adivinación y Desdibujar 1/4 permiten usar la habilidad normal o Voluntad. Solo gastan cargas al tener éxito. Conservan el daño/pista base sustituido y los bonos adicionales; el nivel determina el máximo de cargas, el bono y la penalización por éxito por cero. Desdibujar concede acciones en el turno real del investigador.                                                                                                                          |
| Tótem macabro           | 05119, 05194, 05195                      | Un icono ya presente se añade a la copia comprometida concreta, sin alterar otras copias del mismo código. El nivel 3 Buscador añade robo al tener éxito; el Superviviente devuelve esa copia durante ST.7 al fallar. El resultado diferido de los niveles 3 también funciona con una carta sin iconos. Conserva los efectos de Encontrar consuelo antes de devolverla.                                                                                                        |
| Piedra antigua          | 04230, 04231, 53004                      | Exigen identificación y una mejora de la carta base. Los secretos iniciales proceden del valor registrado. Al robar cartas se paga el tamaño completo del lote de robo para infligir daño a un enemigo, curar horror de una carta local o moverse consecutivamente. No se divide el lote entre objetivos ni se gasta una parte. La ventana ocurre antes de resolver las Revelaciones robadas; los contadores de escenario que representan otros efectos no son horror curable. |
| Pruebas de traición     | 05117, 05190, 05191, 04023               | Whisky de mosto ácido 0/3/3 y Diente de Eztli usan la procedencia explícita `treachery`, incluidas las Debilidades. No confunden una prueba genérica de escenario o de un apoyo/evento con una prueba de Traición. El Whisky distingue bono, suministros, Rápido, daño y evasión posterior no Élite.                                                                                                                                                                           |
| Entrada y límites       | 03309, 08114, 08115                      | Lupara registra el turno real en el que entra para su bono adicional; no lo conserva entre turnos o fases. Recuerdo preciado cuenta una copia por subtítulo en tienda y validación, permitiendo ambos subtítulos; intercambia la curación de daño/horror según éxito o fallo por al menos dos.                                                                                                                                                                                 |
| Robo de traiciones      | 04149, 10032                             | Fuerzas renovadas 0/2 exige ser la primera acción. Cura una cantidad distinta por nivel y añade un punto solo si se robó una Traición en esa ronda; una ficha de ronda anterior no sirve.                                                                                                                                                                                                                                                                                      |
| Fichas fuera de pruebas | 03197, 60429, 60423                      | Recarga 0/4 revela fuera de una prueba: descarta frente a reponer una carga con símbolo, o añade tres/cuatro sin símbolo. Mirada hipnótica 2 cancela el ataque local y, según la ficha, permite elegir el valor de daño u horror del atacante. Se usan los símbolos impresos sin aplicar Tabú. Las fichas vuelven a la bolsa.                                                                                                                                                  |
| Otros eventos           | 01084, 08026, 03158, 05275, 53003, 09078 | ¡Qué suerte! 2 roba además de aumentar la prueba. Esquivar 2 cancela antes de su prueba de Agilidad. Cobrar favores devuelve el Aliado antes de buscar con su coste impreso como descuento. Revelación espantosa descubre y permite ceder o colocar pistas, luego añade trauma mental y derrota. Verdad de la ficción 2 reparte secretos locales, con uno extra si hay pista. Sigilo impecable asigna opciones distintas a enemigos agotados distintos.                        |

Las decisiones y los resultados diferidos se conservan en mensajes serializables.
Los identificadores de copias comprometidas solo se habilitan cuando un apoyo
suscrito los necesita; no se reconstruyen por título o código. Los límites por
subtítulo son optativos y no cambian los límites ordinarios por título.

## Fuentes, presentación y validación

`approvals.json` registra módulos, pruebas, adaptadores exactos, subtítulos y las
huellas SHA-256 de las instantáneas oficiales EN/ES. La conversión compartida
rechaza ampliar los adaptadores multiclase o de Recuerdo preciado a otros códigos.
Se incorporan 60 escaneos y 60 miniaturas; una hoja de contacto de ocho cartas en
ambos idiomas comprueba mejoras, símbolos, subtítulos y niveles.

Referencias de reglas: [Tótem macabro 3](https://arkhamdb.com/card/05195),
[Desdibujar 4](https://arkhamdb.com/card/08111),
[Piedra antigua: Mentes en armonía](https://arkhamdb.com/card/04231) y
[Mirada hipnótica 2](https://arkhamdb.com/card/60423).

La prueba de compra de Wendy acepta las cartas multiclase por su pertenencia a
Superviviente; conserva el máximo de nivel 2 para cartas permitidas únicamente
por Pícaro. No limita incorrectamente Recuerdo preciado por su clase primaria.

El recuento final, el commit y los controles se mantienen únicamente en
`continuacion-importacion.md`. Reutilizar controles mientras no cambie su alcance.
Mantener los bloqueos de los documentos anteriores y seleccionar el siguiente
grupo entre códigos y niveles aún no jugables, sin sumar impresiones equivalentes.
