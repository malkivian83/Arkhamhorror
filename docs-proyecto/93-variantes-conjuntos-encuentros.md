# 93 · Variantes de conjuntos de encuentros

Actualización: 29 de octubre de 2026. **El legado de Dunwich**, **El camino a
Carcosa** y **La noche de la fanática** permiten elegir los encuentros originales
o las sustituciones del capítulo 2 antes de comenzar, en local y en salas online:
19 escenarios en total. No se cambia una campaña ya iniciada.

Hermanos de las cenizas ya utiliza el capítulo 2. Gala, Excelsior y los dos
escenarios de Fortuna e insensatez utilizan encuentros propios, sin conjuntos
básicos que sustituir. No se ofrecen opciones que no cambien esos contenidos,
ni sustituciones inversas del capítulo 2 al 1. Este alcance cubre las campañas y
escenarios actualmente implementados; no añade campañas ausentes del catálogo.

## Reglas y alcance

Fuente: [Arkham Grimoire, página 46, «Core Encounter Set Substitution Table» y
«Exceptions»](https://images-cdn.fantasyflightgames.com/filer_public/76/b3/76b332d5-7047-458f-91b6-82c8500cc445/arkham_grimoire.pdf).
La tabla se ha contrastado con el texto indexado del PDF oficial; la descarga
directa no estuvo disponible. El Grimorio español 1.0 del repositorio no incluye
esa sección posterior.

| Conjunto original                        | Sustitución                      |
| ---------------------------------------- | -------------------------------- |
| Antiguos males                           | Cosmic Evils                     |
| Puertas cerradas                         | Arcane Lock                      |
| Frío helador                             | Bad Weather                      |
| Ratas                                    | Los tres enemigos Bystander      |
| Miedo impactante                         | Torment                          |
| Culto oscuro                             | Cultists                         |
| Agentes de Yog-Sothoth                   | Eldritch Lore                    |
| Ángeles descarnados                      | Flying Terrors                   |
| Gules                                    | Gangs of Arkham + Ashen Pilgrims |
| Agentes de Hastur                        | Hallucinations                   |
| Agentes de Shub-Niggurath                | Mad Science                      |
| Agentes de Cthulhu                       | Reeking Decay                    |
| Traiciones de Las máscaras de medianoche | Dead Ends                        |
| Lugares de Las máscaras de medianoche    | Arkham                           |

Se usa una de las dos opciones oficiales para Ratas: los tres Transeúntes.
La alternativa de tres enemigos Chotacabras no se ofrece en esta entrega.
Las cartas y sus cantidades proceden de las definiciones ya implementadas de
Hermanos de las cenizas; no se cambian sus atributos, palabras clave ni efectos.
Los conjuntos específicos de Dunwich, incluidos sus Chotacabras, permanecen.

La variante modifica las amenazas y puede cambiar el equilibrio. Conserva los
actos, planes, historia, decisiones, bolsa de caos y desenlaces de la campaña.
No implementa las variantes Regreso a.

## Preparación e interacciones

- `encounter-variants.ts` sustituye conjuntos completos en el mazo de encuentros
  y en las cartas apartadas; rechaza conjuntos parciales para evitar adivinarlos.
- La casa siempre gana incorpora Torment, que empieza apartado, al resolver la
  capacidad del plan que incorporaba Miedo impactante.
- En Sangre en el altar, la búsqueda de un enemigo Nightgaunt de la Casa entre
  juncos busca Bat Horror con la variante. No se añaden rasgos ficticios a
  los enemigos ni se amplía la búsqueda a todos los Monstruos.
- El Essex County Express delega los efectos diferidos de Blasphemous Invocation
  al mismo comportamiento que utiliza La reina de las cenizas, incluida la
  búsqueda en mazo y descarte y la perdición por cada punto de fracaso.
- Carcosa y los escenarios restantes de Fanática utilizan también este efecto
  compartido cuando incluyen Cultists.
- En Surgen estrellas negras, las referencias a Antiguos males aplican a Males
  cósmicos: el plan correspondiente le otorga oleada a partir de 2a. Se conserva
  la elección de revelación de la carta y la asignación de perdición entre planes.
- En El fantasma de la verdad, Pista falsa corresponde a Red Herring y Sombra
  acechante a Raising Suspicions. Se retiran las sustitutas durante la preparación
  y se restauran las correspondientes al cambiar Convicción/Duda en el Sueño 10.
- El juramento inconfesable separa los conjuntos **después** de sustituir Agentes
  de Hastur. Hallucinations incorpora sus cuatro traiciones al mazo y no añade
  enemigos al montón de Monstruos. Ese montón pasa de siete a cinco cartas;
  conserva sus reglas de colocación bajo el acto y posterior barajado. Los otros
  enemigos específicos del escenario permanecen.
- El encuentro y La máscara pálida aplican sus referencias a Gules también a los
  enemigos de los conjuntos sustitutos: Cantor of Flame, Hellhound y Rogue
  Gangster. No se modifican sus rasgos impresos. Las búsquedas, fichas y efectos de
  plan que mencionan Gules emplean la correspondencia; Geist sigue conservándose.
- El Devorador de las Profundidades sustituye cualquiera de los cuatro conjuntos
  de Agentes seleccionados al azar y conserva sus lugares y enemigos propios.

### Las máscaras de medianoche: preparación y lugares

La tabla oficial determina el conjunto Arkham, pero no una correspondencia
individual para cada referencia del escenario. Esta entrega aplica la siguiente
adaptación explícita para mantener las apariciones y la preparación:

| Referencia original               | Lugar del capítulo 2                         |
| --------------------------------- | -------------------------------------------- |
| Tu casa                           | Merchant District                            |
| Barrio del Río                    | Waterfront District                          |
| Barrio Sur, una de las dos copias | Uptown, una de las dos copias                |
| Hospital de Santa María           | Southside                                    |
| Universidad Miskatonic            | Miskatonic University, una de las dos copias |
| Centro, una de las dos copias     | Downtown, una de las dos copias              |
| Barrio Este                       | Easttown                                     |
| Cementerio                        | French Hill                                  |
| Barrio Norte                      | Northside                                    |

Se reutilizan los lugares reales, sus capacidades y sus conexiones del capítulo 2. Las alternativas se eligen con la semilla; no se crean cartas con estadísticas
antiguas e imágenes nuevas. Si la casa ardió, se omite su lugar equivalente y se
empieza en Waterfront District. Se eliminan conexiones al lugar omitido.

Los Sectarios únicos mantienen sus cartas y capacidades, con las apariciones
traducidas al mapa nuevo. El Sacerdote gul utiliza el equivalente de la casa si
está presente. Los Acólitos de la preparación se sustituyen por Zealots: se ponen
en juego de cero a tres según el número de investigadores y se retira esa misma
cantidad de sus tres copias del mazo. Los Zealots conservan la perdición inicial
de su carta. Las traiciones y Ángeles descarnados se sustituyen por sus conjuntos
completos.

## Compatibilidad y persistencia

`Campaign.encounterSetVariant` es opcional. Su ausencia conserva la preparación
original y la misma secuencia determinista; elegir explícitamente `original`
tampoco añade campos al guardado. El modo nuevo guarda `chapter-two` y marca
`scenarioMeta.chapterTwoEncounters = 1` desde el prólogo, antes de las preguntas
de preparación. No se migra ni se vuelve a preparar una mesa existente.

Los guardados validan la variante y su coherencia con la mesa. Se mantiene el
formato de sesión vigente. También se corrige la comprobación del escenario
actual para respetar el orden elegido en Dunwich cuando empieza por el club.

En online, el servidor valida la opción, la persiste en la sala y en la campaña,
reinicia la disponibilidad del equipo al cambiar la configuración y la conserva
en los siguientes escenarios. Las peticiones antiguas sin opción mantienen el
modo original. Solo el anfitrión puede configurar la sala antes de iniciarla.

## Verificación y continuación

Pruebas dirigidas: cantidades y conservación de preparación de Dunwich y de los
once escenarios adicionales; Carcosa y Fanática con uno a cuatro investigadores
en las cuatro dificultades; modo original; efectos de Males cósmicos,
invocación, cartas apartadas y búsqueda de Bat Horror; continuidad entre
escenarios; guardado y reproducción con ambos escenarios iniciales; creación y
recarga desde la web; contratos HTTP, persistencia y permisos online;
presentación EN/ES por renderizado de consola. Regresiones de Dunwich, campaña,
guardados y comportamientos reutilizados de Hermanos de las cenizas. La ampliación
supera 1.765 pruebas en 52 archivos: incluye las regresiones completas de las
tres campañas, las excepciones nuevas, las apariciones en Arkham, los cuatro
conjuntos aleatorios del Devorador y la reproducción de guardados de cada uno de
los once escenarios añadidos.

Comprobaciones adicionales: formato y lint de archivos editados, y tipos de
cards, saves, shared, server y web. Estos resultados se reutilizan mientras no
cambien sus fuentes, dependencias o configuración pertinentes.

Base de esta ampliación: Dunwich subido en `bda436e3`. Segundo lote: Carcosa y
Fanática completos, con revisión y subida autorizadas en la misma tarea.
No quedan campañas clásicas implementadas pendientes de habilitar. Al añadir una
campaña nueva habrá que revisar sus conjuntos y excepciones antes de incluirla
en `supportsChapterTwoEncounters`; no se habilita por defecto.

Pendiente: revisión visual por la persona usuaria, sin abrir navegadores para
validar la aplicación.
