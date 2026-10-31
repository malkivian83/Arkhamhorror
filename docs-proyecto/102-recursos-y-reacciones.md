# 102 · Recursos, reacciones y herramientas investigadas

Lote `resource-reactions`, después de `charged-assets` (`ba194a99`): 30 códigos,
30 cartas o niveles distintos nuevos y ninguna reedición. Un solo agente.
`approvals.json` y sus fuentes oficiales definen el lote final. `review.json`
conserva por separado la selección inicial y sus huellas, anterior a sustituir
candidatas cuyo modelo todavía no permitía una implementación fiel.

## Cartas del lote final

| Grupo                         | Códigos                                  | Reglas y diferencias                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recursos y usos               | 03024, 05233, 06162, 06244, 07111, 04308 | Trabajo de campo reserva +2 para la próxima prueba de esta fase. Inversiones acumula hasta diez suministros y los mueve a recursos, pagando agotamiento y descarte antes del efecto. Gregory apuesta de uno a tres recursos y cobra según el margen. Twila repone una carga gastada, no una retirada o movida. El Sofista mueve secretos o cargas del mismo tipo entre apoyos, con alcance local. Tiempo prestado almacena hasta tres clics y los retira al comenzar el turno para conceder acciones; Excepcional cuesta seis XP y limita a una copia por mazo. |
| Protección y símbolos         | 01041, 05236, 08126, 05324, 01056        | Disco de Itzamna descarta un enemigo no Élite recién aparecido. Espíritu guía aumenta Intelecto, recibe primero horror no directo y se exilia al ser derrotado por horror. Pieles gruesas recibe daño para cancelar y volver a revelar un símbolo que no sea fallo automático. Eucatástrofe trata la ficha como signo arcano; Apuesta segura invierte su modificador conservando el símbolo y sus otros efectos.                                                                                                                                                |
| Máscaras y habilidades        | 10043, 10067, 10111, 04159, 02309        | Máscaras de ratón, zorro y gorrión: límite de rasgo, reposición obligatoria hasta el valor inicial y un aumento por prueba en sus dos habilidades concretas. El zorro captura la presencia del enemigo antes de que acompañe al investigador. Intentarlo una y otra vez devuelve una copia comprometida del propietario, también en una prueba ajena, preservando sus efectos; nivel 1 gasta intentos y se descarta al agotarlos.                                                                                                                               |
| Movimiento, búsqueda y pistas | 05025, 05110, 08036, 06205, 06326        | Conectar los puntos compara velo impreso; Resolver el caso reparte el velo efectivo y concede a cada investigador su cantidad completa. Unirse a la caravana aplica descuento por clases controladas y alcanza Lugares revelados desconectados. Sueños lúcidos busca por título, incluso otro nivel, y conserva la cancelación de búsquedas. Joey 3 paga su recurso adicional al jugar un Objeto y permite descartar un Objeto propio por dos recursos. Sus capacidades rápidas están disponibles en las ventanas de jugador apropiadas.                        |
| Investigación                 | 03192, 03193, 52004, 04022, 07121, 10122 | Tres Signos arcaicos 3 exigen traducir y mejorar una copia básica: pistas adicionales por cada dos puntos, evasión sin provocar, o poner un apoyo en juego según coste impreso. Piedra antigua 1 descubre una pista adicional, se descarta y registra la dificultad efectiva. Brújula de navegante 0/2 distingue preparación al fallar; ambas permiten tres aumentos pagados y una pista adicional si no quedan recursos al resolver.                                                                                                                           |
| Curación y Peligro            | 08095, 08117, 08119                      | Equipo protector paga daño y horror para cancelar una traición Peligro. Serenidad terrenal 1/4 usa distintas dificultades, cargas iniciales y pérdida de recursos al tener éxito por cero; permite repartir curación por puntos de margen gastando cargas.                                                                                                                                                                                                                                                                                                      |

## Motor y compatibilidad

Se distinguen gasto, retirada y movimiento de usos. Las penalizaciones de
Sugestión, Llama cósmica y Segunda visión conservan su comportamiento y no
activan la nueva reacción de Twila por retirar una carga. Las reposiciones
observan únicamente la cantidad añadida; mover no genera recursos ni los gasta.

Se conserva la información de origen para resolver resultados de una herramienta
que abandone el juego durante su prueba. Una carta comprometida devuelta deja de
descartarse al terminar, conserva sus resultados y vuelve inmediatamente a la
mano de su propietario. Las reservas de Trabajo de campo caducan por fase/ronda.

Los adaptadores de Exilio y Excepcional se limitan a los códigos revisados;
las tres combinaciones multiclase nuevas se validan explícitamente. El límite de
una copia por título se conserva en los mazos de Tiempo prestado.

Sueños lúcidos usa la definición de copia por título del
[Grimorio oficial, p. 7](https://images-cdn.fantasyflightgames.com/filer_public/76/b3/76b332d5-7047-458f-91b6-82c8500cc445/arkham_grimoire.pdf).
Para Eucatástrofe se contrasta la
[respuesta del diseñador recogida en ArkhamDB](https://arkhamdb.com/card/05324):
una ficha numérica debe reducir un valor positivo a cero o menos; no basta con
que el valor ya fuera cero. Se sigue el texto sin Tabú, sin añadir su retirada
del juego opcional.

## Presentación y comprobaciones

Fuentes EN/ES con SHA, resúmenes y nombres oficiales, escaneos y miniaturas con
procedencia. Pruebas dirigidas de las diferencias y efectos, integración con
compra/inicio y requisito de investigación, unicidad y adaptadores. Los resultados
finales se mantienen en el único resumen de continuación.

Se añaden 59 escaneos y 59 miniaturas. Para Eucatástrofe, el CDN español contiene
una instrucción Tabú de retirada del juego que no corresponde al texto sin Tabú;
se conserva el texto español y se usa la imagen inglesa. La prueba de imágenes
comprueba expresamente esta alternativa. Al repetir la importación de imágenes,
usar `--language en` para 05324 y ambos idiomas para los otros 29 códigos.

## Familias evaluadas de la selección inicial

Este registro inicial no define lo activado. Siguen pendientes los Tótems macabros,
Tennessee Sour Mash, Hilo de Ariadna, Piedra lunar, Explorar por adelantado, Ganar
tiempo, la máscara de gato, Prisa y Recordar el futuro. Requieren, respectivamente,
seguimiento por copia comprometida, procedencia de pruebas de traición, usos
prestados, contexto de descarte/juego, permisos de enfrentamiento y turno futuro,
perdición previa por objetivo, acciones consecutivas y ficha nombrada por prueba.

- Trabajo de campo, Conectar los puntos y Resolver el caso: ventanas de movimiento
  y última pista, velo impreso frente a efectivo y reparto de recursos.
- Tennessee Sour Mash 0/3/3 y Tótem macabro 0/3/3: diferencias de clase, suministros,
  revelaciones de traición, iconos por copia comprometida y resultados posteriores.
- Inversiones, Gregory Gry, Twila, Sofista sobrenatural e Hilo de Ariadna: gasto,
  movimiento y reposición de usos; separar cargas y secretos, sin convertir un
  movimiento en ganancia de recursos o en gasto cuando el texto no lo indique.
- Unirse a la caravana, Explorar por adelantado y Ganar tiempo: descuento dinámico,
  movimiento sucesivo y prohibición temporal de enfrentamiento, turno siguiente.
- Sueños lúcidos, Joey 3 y Piedra lunar: búsqueda por identidad, juego inmediato,
  descarte, restricciones de mano y momento de pago.
- Máscaras de ratón, zorro, gato y gorrión: límite de rasgo ya existente, ofrendas,
  reposición exacta y máximo de un aumento por prueba. La máscara de gato necesita
  conocer la perdición anterior del objetivo; no basta con observar la agenda.
- Prisa, Intentarlo una y otra vez 1/3 y Recordar el futuro: historial ordenado
  de acciones, propiedad de habilidades comprometidas y ficha nombrada por prueba.
- Eucatástrofe y Apuesta segura: ventana de revelación, valor final nulo, símbolos,
  cancelación/tratamiento e inversión del modificador de la ficha exacta.

La selección inicial conserva sus fuentes para retomar esos casos cuando cambie
la causa del bloqueo. El lote final evita duplicar impresiones ya implementadas.
