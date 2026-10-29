# 92 · Nathaniel Cho y Harvey Walters

29/10/2026. Petición: incorporar y subir los investigadores, cartas y mazos iniciales
completos de los packs [Nathaniel Cho](https://arkhamdb.com/set/nat) y
[Harvey Walters](https://arkhamdb.com/set/har).

## Alcance

Los dos packs reúnen **65 códigos**: 32 de Nathaniel y 33 de Harvey. Había 20 códigos
jugables. Este lote incorpora **45 códigos jugables / 44 cartas o niveles distintos
nuevos / 1 reedición**, Esquivar (`60113`), equivalente a `01023`.

Explosión de dinamita (3), `60129`, y Provocación (3), `60130`, se trasladan desde
`grouped-import` a Nathaniel, con sus comportamientos revisados y sus pruebas. Los
inventarios históricos y sus huellas se conservan; aquel lote parcial queda con 10
códigos preparados, sin habilitarlo entero. El registro, catálogo y compras se
comprueban para evitar duplicar códigos.

Los mazos iniciales `nathaniel` y `harvey` usan las listas oficiales del producto:
30 cartas elegidas (dos copias de cada una de las quince cartas de nivel 0), sus dos
exclusivas y la Debilidad básica incluida, 33 cartas en total. Los datos de los
investigadores se registran antes de calcular las exclusivas de construcción de
mazos y compras. Nathaniel admite Guardián y neutrales 0–5; Harvey, Buscador y
neutrales 0–5.

## Reglas y diferencias de presentación

- Nathaniel distingue el daño de Eventos y de sus capacidades Combatir, conserva el
  límite de una vez por fase y aplica el punto adicional en el momento del daño.
  Los ataques encadenados y las reacciones a ataques enemigos mantienen sus ventanas.
- Harvey reacciona a un efecto que roba una o más cartas durante Investigación,
  con límite de una vez por ronda. La mano completa y las revelaciones forman parte
  de la comprobación de robo; las búsquedas que añaden una carta a la mano se
  distinguen de las que ordenan robarla.
- Se cubren los umbrales de mano, costes variables, secretos, ranuras restringidas,
  jugar Tomos y Eventos mediante capacidades y el movimiento o reparto de pistas.
- Tomo prohibido (0) registra su traducción en la campaña. Sus dos versiones de
  nivel 3 son Investigado: se obtienen mejorando la versión sin traducir y con la
  anotación necesaria; disponer de los datos no permite comprarlas libremente.
- Financiación arqueológica de Miskatonic aplica la limitación de asignación sobre
  el daño y horror repartido a apoyos Miskatonic en conjunto, además de sus dos
  ranuras de aliado restringidas a ese rasgo.
- Los escaneos de Tomo prohibido (3) conservan la redacción impresa de su requisito
  de mejora; el texto de respaldo sigue la API vigente con Investigado. Las dos
  versiones conservan códigos, efectos y subtítulos diferentes.

Fuentes: texto EN/ES de las API de ArkhamDB para
[`nat` EN](https://arkhamdb.com/api/public/cards/nat.json),
[`nat` ES](https://es.arkhamdb.com/api/public/cards/nat.json),
[`har` EN](https://arkhamdb.com/api/public/cards/har.json) y
[`har` ES](https://es.arkhamdb.com/api/public/cards/har.json),
las [reglas de Investigado](https://arkhamdb.com/rules#Researched),
[Financiación y su FAQ](https://arkhamdb.com/card/60232),
[los valores por investigador como valores impresos](https://arkhamdb.com/rules#Per_Investigator), los escaneos
oficiales y las FAQ de las cartas correspondientes. Las instantáneas consultadas
el 29/10/2026 quedan en `source-en.json` y `source-es.json` de cada módulo, con sus
SHA-256 en `approvals.json`. El inventario congelado `3c8ee4b5d8100766` no se modifica.

## Datos y recursos

`scripts/prepare-nathaniel-harvey.mjs` reproduce los datos desde el inventario y las
instantáneas revisadas; `scripts/present-nathaniel-harvey.mjs` reproduce nombres,
textos, rasgos, reversos y las etiquetas nuevas de interfaz EN/ES. La selección de
paquetes remotos incluye ambos mazos y renueva la caché local a la versión 11.

Se incorporan **90 escaneos AVIF, 90 miniaturas WebP y 2 retratos**. Los recursos ya
existentes permanecen intactos; procedencias, tamaños y SHA-256 están en los
inventarios compartidos y en
[evidencias de esta descarga](evidencias/nathaniel-harvey-recursos-oficiales.json).
Se ha inspeccionado una hoja de contacto local de nueve casos representativos en
ambos idiomas, incluidos investigadores y reversos, cartas de acción, Tomos y un
permanente. La revisión visual de la aplicación queda para la persona usuaria;
no se han abierto sesiones de navegador.

## Validación y publicación

- Textos oficiales y rasgos de los 65 códigos en EN/ES, reversos de investigadores,
  presencia de escaneos y miniaturas y huellas de los 92 recursos descargados:
  comprobados. El script de presentación es idempotente.
- Formato global, lint sin errores, tipos globales y compilación de producción correctos.
  Persisten las advertencias previas de orden de atributos en SiteHeader, fuente
  externa y tamaño de paquetes de la web.
- La suite general ejecutó 5.239 pruebas correctas, 19 omitidas y 11 fallos iniciales.
  Se corrigieron el contrato de identidad de las funciones de reediciones, la
  distinción de subtítulos de los Tomos y el guardado tras el lote completo de robo;
  la nueva restricción del reparto equitativo quedó verificada sobre el código final.
  Las 166 pruebas de los archivos afectados pasaron al repetirlas. También pasó
  una regresión adicional de catálogo y límite compartido entre ambos Tomos.
  El timeout preexistente de administración pasó al repetir solo su archivo:
  6 pruebas correctas con límite de 15 segundos, sin modificarlo.
- Ambos diagnósticos de mazo oficial con check-decklist dan cero códigos pendientes.
  Datos reproducibles, fuentes con huellas, ausencia de duplicados y presentación
  EN/ES de los 65 códigos comprobados. No quedan fallos conocidos sin resolver.
- Commit de implementación: `068e84ff`. Publicación en `main`; el alcance autorizado
  se limita a estos dos packs.
