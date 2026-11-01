# 103 · Protección y herramientas

Lote `protection-tools`: 20 códigos, 20 cartas o niveles distintos nuevos y ninguna
reedición. Sigue a `resource-reactions` (`e501d009`) sobre `266da4b3`. Un solo
agente. Once candidatas preliminares ya estaban incorporadas y se descartaron
antes de generar datos; no se usan para completar artificialmente el lote.

## Reglas revisadas

| Grupo                  | Códigos                    | Diferencias cubiertas                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cancelación y exilio   | 03156, 03157, 04110        | Una prueba de voluntad cancela una Revelación local no Debilidad y respeta Peligro. Suerte del diablo cancela hasta diez puntos de daño/horror combinados de cualquier fuente. Ambos eventos se exilian, también con el Amuleto de Wendy. Contrahechizo cancela los cuatro símbolos indicados sin reemplazarlos ni resolver sus efectos.                                                                                                                                  |
| Protección a distancia | 11054, 11063               | El investigador protegido decide cuánto pagar y cómo repartir la cancelación. Nivel 0 gasta hasta tres recursos; nivel 4 transfiere hasta cinco al jugador del evento y no puede proteger a ese mismo jugador. Alcance local o Lugar conectado; una transferencia ordinaria conserva su alcance local.                                                                                                                                                                    |
| Extintores             | 02114, 08080               | Nivel 1: ataque +1 y evasión +3 cuyo coste exilia, también al fallar; al tener éxito evade a los demás enemigos enfrentados. Nivel 3: ataque +1/daño +1, o evasión automática de todos los enfrentados descartando; permite exiliar en su lugar para descartar los no Élite evadidos. Conserva inmunidades.                                                                                                                                                               |
| Aliados                | 05274, 06155, 09038        | Apoyo de la Agencia, Tetsuo y Girish reciben daño/horror de otros investigadores locales. La Agencia paga agotamiento y daño/horror antes del efecto, aunque resulte derrotada. Tetsuo ofrece descarte o primeras nueve cartas de un mazo de un investigador local. Girish aumenta una prueba local y cura daño u horror propio solo si tiene éxito.                                                                                                                      |
| Resultados de pruebas  | 08107, 09050               | Picahielos 3 agota para +1 en combate/investigación; su descarte opcional y el daño/pista adicional se aplican en ST.7, después de las reacciones al éxito de ST.6. Bata de laboratorio reemplaza un fallo por uno o menos en una carta Buscador por éxito por cero, incluso fallo automático en dificultad cero o uno. No altera el éxito automático genérico.                                                                                                           |
| Evidencia y estudio    | 10042, 10058, 09043, 11035 | Microscopios distinguen evasión exitosa de evasión automática. Nivel 0 agota al obtener evidencia, nivel 4 no; ambos investigan con dos acciones y gastan evidencia opcionalmente en ST.7, con distintos bonos y máximos. Herramientas de disección da Agilidad, Combate y cordura en sus tres umbrales. Dial de los Antiguos cuenta también evasiones automáticas y registra su investigación al alcanzar cuatro cargas.                                                 |
| Mano y uso de acciones | 09086, 10112, 11034, 03189 | Iniciación sobrenatural cuenta ranuras arcanas ordinarias y restringidas, roba hasta cinco y después descarta por las ocupadas. Distracción elaborada paga una acción adicional, no provoca y elige por enemigo local/conectado daño o evasión no Élite. Inspiración artística descarta para reponer su única inspiración y la gasta tras revelar para +1 o −1. «¡Nos vemos en el infierno!» derrota no Élite enfrentados, derrota al investigador y añade trauma físico. |

Las decisiones diferidas se serializan como mensajes. Los adaptadores de exilio
y multiclase se autorizan únicamente para los códigos revisados. Se conservan el
inventario histórico y los registros anteriores; las pruebas compartidas detectan
duplicados y reproducen las definiciones aprobadas.

## Fuentes y presentación

`approvals.json` identifica las fuentes EN/ES y sus SHA-256, los módulos y las
pruebas. Los textos y datos conservan la versión sin Tabú. Se revisó una hoja de
contacto de ocho cartas en ambos idiomas.

Se incorporan 39 escaneos y 39 miniaturas. El archivo español anunciado como
03156 contiene Una prueba de voluntad de nivel 0 de Regreso, cuya prueba de
Voluntad no corresponde a esta carta de nivel 1. Se conserva el texto español
correcto y se usa la imagen inglesa. Para regenerar recursos, importar 03156
solo con `--language en`; los otros 19 códigos admiten ambos idiomas.

Las excepciones de reglas se contrastaron con las respuestas oficiales recogidas
en [Bata de laboratorio](https://arkhamdb.com/card/09050) y
[«Has pasado por cosas peores…» 4](https://arkhamdb.com/card/11063).
La presentación de
[Microscopio 4](https://arkhamdb.com/card/10058) y
[Picahielos 3](https://arkhamdb.com/card/08107) distingue sus mejoras de los
niveles anteriores.

## Continuación

Las cifras acumuladas, la validación final y el commit se mantienen en
`continuacion-importacion.md`. Mantener los bloqueos de los documentos
98/99/101/102. La selección preliminar no constituye un lote pendiente: se
descartaron los códigos existentes y se añadieron únicamente estos veinte.
Buscar el siguiente grupo entre cartas aún no declaradas, antes de revisar sus
reglas, y conservar la prioridad de mecánicas compartidas sobre reediciones.
