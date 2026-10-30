# 98 · Ventanas de daño y turno

Lote `damage-turn`: 27 códigos y 27 cartas o niveles distintos nuevos, sin
reediciones. Se amplían ventanas compartidas del motor para desbloquear familias
del documento 96. No se completa el tamaño orientativo con impresiones repetidas.

## Cartas y diferencias

| Familia | Códigos | Reglas revisadas |
| --- | --- | --- |
| Cancelación de daño/horror | 02261, 05315, 09102 | «¡He pasado por cosas peores!» cancela hasta 5/2 y gana los recursos correspondientes. Ídolo de Xanatos agota y descarta hasta tres cartas no Debilidad como coste; elección de la mezcla de daño/horror. Ventana para cualquier fuente, incluido daño directo, sin repetirla durante la asignación. |
| Efectos del turno propio | 01085, 05281, 54010, 60173 | Voluntad de sobrevivir cubre todas las pruebas. Prueba de fuego establece una base en 5; nivel 3 permite todas en 5 o una en 7. On the Beat se juega al comenzar el turno y suma 3 al investigar/parlamentar; varias copias se acumulan. |
| Tarot | 05023, 05027, 05031, 05035, 05039, 54003, 54005 | Reacción de mano inicial sin jugar ni pagar. Una ranura Tarot; cuatro bonificaciones de habilidad, salud/cordura, robo con ocho cartas y agotamiento, o aumento de éxito +1/+3 con descarte. |
| Curación y protección | 08083, 60309, 60570, 60472, 03314 | Estudiante de Medicina cura un único investigador o Aliado local al entrar. Lonnie cura un Objeto local y su horror pagando recurso y agotamiento. Raciones cura al controlador o su Aliado; cuatro suministros y descarte al agotarlos. Blood Ward cancela un ataque no Élite local y cura dos daños. Infighting protege durante esa fase de enemigos, conservando las inmunidades a cancelación. |
| Distribución y costes | 10069, 10048 | Bank Job distribuye ocho recursos y Thorough Inquiry cinco cartas entre investigadores locales. Coste adicional de una acción, también al jugar por efecto; dos acciones en una acción normal de jugar. |
| Entrada temporal | 03029, 09066 | Ponen un Objeto/Aliado de la mano en juego sin su coste. Al final del turno vuelve la instancia exacta si sigue en juego; se conservan unicidad, límites y ranuras. |
| Acciones y ataques de oportunidad | 07108, 07027 | Riot Whistle concede una acción continua solo para enfrentarse, con consumo/pérdida por turno. Obfuscation cancela únicamente ataques de oportunidad gastando una de tres cargas, sin agotarse. |
| Velo durante un turno | 03266, 10108 | Arcane Insight reduce dos, tres cargas y límite una vez por turno. Matchbox reduce uno, agota, tres suministros y descarte al vaciarse. Ambas funcionan durante turnos ajenos; el efecto permanece en el Lugar original hasta terminar el turno real. |

Los efectos temporales identifican el turno real mediante el historial ya usado
por el motor, sin crear un turno nuevo por acciones inmediatas. Se serializan con
el estado y dejan de aplicarse al terminar su duración. El callback de entrada
recibe el identificador del apoyo creado, sin buscar otra copia por código.

## Datos y presentación

Instantáneas oficiales EN/ES con SHA-256 en `approvals.json`; preparación con
`scripts/prepare-damage-turn.mjs`, reutilizando las fuentes incluidas. Inventario
histórico intacto. Adaptadores estrictos para las siete ranuras Tarot revisadas y
las dos clases de Estudiante de Medicina; no se habilitan otros modelos pendientes.

Nombres, subtítulos disponibles, reglas y rasgos EN/ES. Se incorporan 54 escaneos
y 54 miniaturas, con procedencia y huellas en los inventarios compartidos. Hoja de
contacto inspeccionada: Ídolo, Prueba de fuego 3, As/Caballo de espadas, Estudiante,
Bank Job, Hit and Run y Matchbox en ambos idiomas. La ranura nueva aparece en el
tapete y el editor de mazos. Sin navegador; revisión de la aplicación a cargo del
usuario.

## Validación y continuidad

Pruebas compartidas del efecto principal y diferencias de cada carta, más
integración de catálogo, compra, inicio y presentación de los 27 códigos. Se
comprueba también la segunda clase de Estudiante, unicidad entre lotes y
conversión revisada. La ventana genérica de daño tiene regresiones propias.
Los controles finales y el commit se anotan en el resumen de continuación único.

Siguen fuera de este lote Perseverance (ventana de derrota y pago), Armor of
Ardennes (asignación a apoyos frente a colocación), y las candidatas que necesitan
robo de encuentro de cualquier procedencia, reacciones a curación o movimiento
sin enfrentamientos. Las otras Tarot requieren revisar sus reglas particulares.
No se presentan como cartas jugables ni como importación completa.
