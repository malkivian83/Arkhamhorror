# Narración de cartas

Alcance: solo cartas de plan y acto, exclusivamente su texto narrativo.
Cada campaña utiliza su voz de historia y sus ajustes existentes. La primera
entrega fueron los planes y actos de Asesinato en el hotel Excelsior, en español,
con la voz `OjrdP8Z2fWjVyt0scrL7`.
Se leen exclusivamente `flavor` y `backFlavor`, nunca instrucciones ni reglas.
Los catálogos EN/ES conservan ahora estos campos también sin conexión.

El reproductor aparece en las vistas de cartas y en la preparación, aunque la imagen
ya esté en español. Cada grabación corresponde a una cara y un idioma concretos;
no se ofrece audio de otra cara ni se anticipan textos de cartas no mostradas.
Cambiar o cerrar la carta detiene su audio. Iniciar una narración pausa la anterior,
también si era un texto de historia.

Generadas las siete grabaciones: anverso y reverso de El asesinato (84002),
Investigación especial (84003) y ¿Qué ha pasado…? (84004), y anverso de
Investigando indicios (84005). Sus transcripciones, voz, ajustes y huellas están en
`evidencias/excelsior-cartas-narracion.json`; el manifiesto de la web solo contiene
los archivos disponibles.

El 27/10/2026 la cuota inicial de ElevenLabs impidió completar la generación.
Se reanudó con la credencial facilitada por la persona usuaria y se completaron
los siete campos narrativos de los planes y actos de Excelsior, conservando las
tres grabaciones previas. La credencial se utilizó solo en el proceso de generación;
no se guardó en archivos. Lugares, Enemigos, Apoyos y demás tipos quedan excluidos
tanto de la generación como del reproductor. No se ha comprado crédito ni cambiado
la voz. Ese primer lote se subió en el commit `0c0aad6`.

## Inventario y grabaciones disponibles (27/10/2026)

Se contrastaron los catálogos de las campañas registradas con los campos narrativos
de planes y actos de la fuente local de referencia. Los recuentos son caras con
narración, no archivos únicos: Carcosa incluye ocho textos repetidos entre variantes.

| Campaña o escenario                                      | Caras narrativas detectadas | Grabadas | Voz existente |
| -------------------------------------------------------- | --------------------------: | -------: | ------------- |
| Asesinato en el hotel Excelsior                          |                           7 |        7 | Mario         |
| La noche de la fanática (solo El encuentro implementado) |                          12 |       12 | Baldo         |
| El camino a Carcosa                                      |                         101 |      101 | Carmelo       |
| Fortuna e insensatez                                     |                          13 |       13 | Salva         |
| La gala del ecuador del invierno                         |                           9 |        9 | Carmelo       |
| Los Hermanos de la Ceniza                                |                          28 |       28 | Gabo          |

Los 28 campos de Hermanos de la Ceniza estaban en inglés en el volcado español de
referencia; el inventario inicial los dejó pendientes de localizar.
Las voces de Hermanos de la Ceniza y La Gala están documentadas en
`apps/web/public/local-assets/story/audio/README.md`. Los audios de historia de las
guías ya existentes no se cuentan como audios de cartas.

## Continuación local (27/10/2026)

Se amplía el reproductor con un catálogo narrativo EN/ES independiente, sin
alterar los textos de reglas ni los resúmenes de las cartas. El respaldo sin
conexión también conserva los párrafos narrativos. La generación sigue limitada
a planes y actos; el manifiesto registra solo las caras grabadas en español.

Las narraciones de Hermanos de la Ceniza se transcribieron visualmente de las
imágenes españolas locales: `evidencias/ceniza-cartas-transcripciones.es.json`.
Las rutas y huellas de las 28 caras de origen están en
`evidencias/ceniza-cartas-fuentes.json`. No se tradujeron automáticamente los
textos ingleses. La voz Gabo se identificó en la cuenta como
`o0SveC0zgHFuCsEO3vHR`, conservando los ajustes de las historias de esa campaña.
El reverso de Un ritual (`12170b`) contiene dos relatos condicionales dentro del
texto de reglas: queda fuera del audio único para evitar narrar ambos desenlaces.

Las transcripciones repetidas de Carcosa con la misma voz y ajustes reutilizan
la grabación por huella, conservando un archivo y una entrada por cara de carta.
Cada campaña registra transcripción, voz, ajustes, tamaño y SHA-256 en
`evidencias/<campaña>-cartas-narracion.json`.

Completadas e integradas las 163 caras nuevas de El encuentro, Carcosa, Fortuna,
La Gala y Hermanos de la Ceniza: 170 archivos y entradas de cara en total, contando
los siete previos de Excelsior. Carcosa contiene 93 grabaciones distintas para sus
101 caras; el lote nuevo requiere 155 grabaciones distintas. No quedan campos
`flavor`/`backFlavor` pendientes en este inventario; el relato condicional de
`12170b` sigue excluido y requiere una selección por estado de partida antes de
poder ofrecer audio.
Este lote continúa en local, sin commit ni push. No se ejecutan pruebas por
indicación de la persona usuaria. La escucha y la revisión visual siguen pendientes.

Inventario de Excelsior: `node scripts/generate-card-audio.mjs --list`.
Importar las narraciones de las demás campañas desde la referencia local:
`node scripts/import-card-narratives.mjs [ruta-de-referencia]`.
Inventario ampliado: `node scripts/generate-campaign-card-audio.mjs --list`.
Reanudar: `node scripts/generate-campaign-card-audio.mjs --generate`.
Se puede filtrar con `--campaign=zealot|carcosa|fortune|gala|ceniza` y proporcionar
la credencial por entrada estándar con `--key-stdin`, sin guardarla en archivos.
El script verifica las grabaciones previas por huella antes de reutilizarlas y no
regenera los MP3 existentes. Consulta la cuota antes de generar; no imprime claves.

Cobertura de pruebas preparada: transcripciones frente al campo narrativo de cada cara,
voz correspondiente a cada campaña, integridad de los MP3, ausencia de sustitución de idioma o cara,
y exclusión entre reproducciones. Revisión por navegador y escucha final pendientes
de la persona usuaria.
