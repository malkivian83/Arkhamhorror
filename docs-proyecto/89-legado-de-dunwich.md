# 89 · El legado de Dunwich

## Estado actual

**Actividad extracurricular es jugable**, con uno a cuatro investigadores y las
cuatro dificultades. Para empezar hay que elegir buscar primero a Warren Rice.
La casa siempre gana y los seis escenarios posteriores permanecen bloqueados;
terminar el primer escenario guarda el resultado y deja pendiente La casa siempre
gana. No se presenta la campaña como completa ni se incluye Regreso a Dunwich.

La elección del prólogo se conserva en `log.values.openingScenario`; los guardados
anteriores sin elección mantienen el orden del índice. La pantalla de progreso y
el avance de campaña usan el mismo orden.

## Fuentes y preparación

- Guía revisada ES aportada: páginas 2–5, campaña, prólogo, preparación y desenlaces.
- Cartas originales 02041–02061, 02083–02087, 02090–02091, 02100–02102 y
  Agentes de Yog-Sothoth 01177–01178; datos oficiales EN/ES de la copia externa.
- Se reutilizan Antiguos males y Puertas cerradas ya implementados y probados.
- La lista española de la página 4 omite Ciencias, aunque figura en el plano.
  Se incluye el Edificio de Ciencias: la preparación inglesa y las cartas lo
  requieren, entre otras cosas para la aparición del Experimento.

Preparación con seis Lugares en juego y tres apartados. Despachos del profesorado
usa la variante correspondiente al orden de la campaña. Sindicato de estudiantes
tiene dos pistas fijas; el resto respeta sus cantidades por investigador.
El mazo inicial tiene 32 cartas de los ocho conjuntos indicados. Jazz y el
Experimento empiezan apartados.

## Reglas implementadas

| Parte | Comportamiento |
| --- | --- |
| Encuentros | Hechicería, Chotacabras, El Más Allá, Esclavos de Bishop y Agentes de Yog-Sothoth, con sus cantidades originales. |
| Acto 1 | Pago de tres pistas por investigador; baraja el descarte y Jazz en el mazo de encuentros. |
| Acto 2 | Búsqueda por una acción y una pista: descarta diez cartas en solitario o cinco en grupo. Jazz descartado resuelve su revelación. Tomar su control avanza el acto. |
| Acto 3 | Objetivos de los Lugares para rescatar a Rice o a los estudiantes; derrotar al Experimento avanza al reverso del tercer acto y resuelve R3. |
| Planes | Horror según descartes, reducción de mano durante mantenimiento, salto de la segunda cara frontal cuando se visita la universidad en segundo lugar y movimiento periódico del Experimento. |
| Lugares | Conexiones, puertas cerradas hasta que Jazz permita revelarlas, descartes al final del turno, investigación adicional en Orne, curación, búsqueda de Humanoides y recuperación de la Pócima alquímica. |
| Jazz | Revelación, negociación, control, salud y cordura, permiso sobre Lugares sin revelar y regreso al descarte de encuentros al abandonar el juego. |
| Experimento | Salud de siete más tres por investigador, Enorme, preparación al inicio de la fase de enemigos y avance hacia la Residencia por los planes. |
| Pócima | Ataque con intelecto, seis daños adicionales contra el Experimento y retirada de la partida al tener éxito. Solo se prepara en la variante tardía. |
| Rice | Recompensa opcional, salud, cordura, ranura de Aliado, intelecto adicional y reacción al descubrir la última pista. |
| Resoluciones | Sin resolución y R1–R4, notas, tablilla permanente, victoria, experiencia adicional cuando corresponde y guardado para el escenario siguiente. |
| Caos | Ambas caras de 02041, incluyendo costes impresos del descarte inmediato por Primigenio y diferencias por dificultad. |

El motor incorpora ventanas de mazo agotado y carta de encuentro descartada,
costes de movimiento de traiciones, efectos al robar anteriores a la cancelación,
vínculos al acto y al plan, daño directo global, presa por cartas de mano y
modificadores de ataque evaluados antes de resolver los descartes del ataque.

Empujado al otro lado devuelve apoyos prestados al mazo de su propietario y
descarta del mazo del investigador que robó la traición. Incluso sin apoyo
válido descarta tres cartas: la redacción española separa ambas instrucciones y
la inglesa no utiliza un «después» condicional. Esto difiere del comportamiento
de la copia externa, que no se ha trasladado literalmente.

## Presentación y narración

Catálogo local EN/ES de 33 códigos, referencia de escenario y ayuda de fichas,
100 escaneos oficiales y sus 100 miniaturas, portada y huellas de integridad.
Se han inspeccionado escaneos representativos sin abrir el navegador.
La revisión visual de la mesa queda para la persona usuaria, conforme a AGENTS.

Los audios usan **Nico - Calm, Rhythmic and Alluring**,
`iXa2i9eYvgmNMRQRCwqO`. Hay siete grabaciones de historia en español:
prólogo, introducción y los cinco desenlaces del primer escenario. Los relatos
españoles se extraen de la guía revisada; se omiten instrucciones y recompensas
en el audio, que la mesa presenta aparte. No se ofrece audio español como inglés.

- Catálogo: `node scripts/import-dunwich-cards.mjs`.
- Imágenes y portada: `node scripts/import-dunwich-images.mjs`.
- Miniaturas: generador existente con `--codes` para las cartas incorporadas.
- Audios reanudables: `node scripts/generate-dunwich-audio.mjs --generate --key-stdin`.
  Sin `--generate`, el inventario es local. Voz, textos, ajustes y huellas están
  en `evidencias/dunwich-nico-narracion.json`. La clave no se guarda en archivos.

## Validación y continuación

Las pruebas dirigidas cubren preparación de uno a cuatro investigadores,
encuentros y activos, lugares, actos, planes, los cinco desenlaces, experiencia,
bolsas de las cuatro dificultades, restauración, presentación y grabaciones.
Incluyen un rescate completo por acciones legales sin editar el estado después
de preparar la partida, y partidas reproducibles con el mazo completo para uno
a cuatro investigadores, cuyo resultado se aplica a la campaña.

Último bloque previo: `4997be7`, encuentros compartidos guardados localmente.
Bloque actual: primer escenario completo, pendiente de los controles globales
finales y subida autorizada. Siguiente grupo: **La casa siempre gana** y el
interludio El destino de Armitage; después los seis escenarios restantes,
Los supervivientes y el epílogo. No hay bloqueos externos.
