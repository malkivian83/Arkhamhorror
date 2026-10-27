# Narración de cartas

Alcance: solo cartas de plan y acto, exclusivamente su texto narrativo.
Primera entrega: planes y actos de Asesinato en el hotel Excelsior, en español,
con la voz `OjrdP8Z2fWjVyt0scrL7` y los mismos ajustes que las historias del escenario.
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
la voz. Las demás campañas siguen pendientes, con sus voces respectivas.

## Revisión de todas las campañas disponibles (27/10/2026)

Se contrastaron los catálogos de las campañas registradas con los campos narrativos
de planes y actos de la fuente local de referencia. Los recuentos son caras con
narración, no archivos únicos: Carcosa incluye ocho textos repetidos entre variantes.

| Campaña o escenario                                      | Caras narrativas detectadas | Grabadas | Voz existente |
| -------------------------------------------------------- | --------------------------: | -------: | ------------- |
| Asesinato en el hotel Excelsior                          |                           7 |        7 | Mario         |
| La noche de la fanática (solo El encuentro implementado) |                          12 |        0 | Baldo         |
| El camino a Carcosa                                      |                         101 |        0 | Carmelo       |
| Fortuna e insensatez                                     |                          13 |        0 | Salva         |
| La gala del ecuador del invierno                         |                           9 |        0 | Carmelo       |
| Los Hermanos de la Ceniza                                |                          28 |        0 | Gabo          |

Los 28 campos de Hermanos de la Ceniza siguen en inglés en el volcado español de
referencia: falta localizar sus textos narrativos españoles antes de grabarlos.
Las voces de Hermanos de la Ceniza y La Gala están documentadas en
`apps/web/public/local-assets/story/audio/README.md`. Los audios de historia de las
guías ya existentes no se cuentan como audios de cartas. La generación y el
reproductor de esta primera entrega aún están limitados a Excelsior; la revisión
global no implica que las demás campañas estén integradas.

Inventario local: `node scripts/generate-card-audio.mjs --list`.
Reanudar cuando haya cuota: `node scripts/generate-card-audio.mjs --generate`.
El script verifica las grabaciones previas por huella antes de reutilizarlas y no
regenera los MP3 existentes. Consulta la cuota antes de generar; no imprime claves.

Validación: pruebas de transcripciones frente al campo narrativo de cada cara,
voz de Excelsior, integridad de los MP3, ausencia de sustitución de idioma o cara,
y exclusión entre reproducciones. Revisión por navegador y escucha final pendientes
de la persona usuaria.
