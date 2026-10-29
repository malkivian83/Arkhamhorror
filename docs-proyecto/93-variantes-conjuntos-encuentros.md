# 93 · Variantes de conjuntos de encuentros

Primera entrega: 29 de octubre de 2026. **El legado de Dunwich** permite elegir
los encuentros originales o las sustituciones del capítulo 2 antes de comenzar,
en local y en salas online. No se cambia una campaña ya iniciada. Las demás
campañas conservan su preparación y todavía no ofrecen esta variante.

## Reglas y alcance

Fuente: [Arkham Grimoire, página 46, «Core Encounter Set Substitution Table» y
«Exceptions»](https://images-cdn.fantasyflightgames.com/filer_public/76/b3/76b332d5-7047-458f-91b6-82c8500cc445/arkham_grimoire.pdf).
La tabla se ha contrastado con el texto indexado del PDF oficial; la descarga
directa no estuvo disponible. El Grimorio español 1.0 del repositorio no incluye
esa sección posterior.

| Conjunto original      | Sustitución                 |
| ---------------------- | --------------------------- |
| Antiguos males         | Cosmic Evils                |
| Puertas cerradas       | Arcane Lock                 |
| Frío helador           | Bad Weather                 |
| Ratas                  | Los tres enemigos Bystander |
| Miedo impactante       | Torment                     |
| Culto oscuro           | Cultists                    |
| Agentes de Yog-Sothoth | Eldritch Lore               |
| Ángeles descarnados    | Flying Terrors              |

Se usa una de las dos opciones oficiales para Ratas: los tres Transeúntes.
La alternativa de tres enemigos Chotacabras no se ofrece en esta entrega.
Las cartas y sus cantidades proceden de las definiciones ya implementadas de
Hermanos de las cenizas; no se cambian sus atributos, palabras clave ni efectos.
Los conjuntos específicos de Dunwich, incluidos sus Chotacabras, permanecen.

La variante modifica las amenazas y puede cambiar el equilibrio. Conserva los
actos, planes, historia, decisiones, bolsa de caos y desenlaces de la campaña.
No implementa Regreso a Dunwich ni una sustitución inversa del capítulo 2 al 1.

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

Pruebas dirigidas: cantidades y conservación de preparación de los ocho
escenarios en las cuatro dificultades; modo original; efectos de Males cósmicos,
invocación, cartas apartadas y búsqueda de Bat Horror; continuidad entre
escenarios; guardado y reproducción con ambos escenarios iniciales; creación y
recarga desde la web; contratos HTTP, persistencia y permisos online;
presentación EN/ES por renderizado de consola. Regresiones de Dunwich, campaña,
guardados y comportamientos reutilizados de Hermanos de las cenizas.

Comprobaciones adicionales: formato y lint de archivos editados, y tipos de
cards, saves, shared, server y web. Estos resultados se reutilizan mientras no
cambien sus fuentes, dependencias o configuración pertinentes.

Pendiente: revisión visual por la persona usuaria, sin abrir navegadores para
validar la aplicación. Próxima ampliación: revisar las referencias específicas
de Carcosa antes de habilitarla, especialmente Antiguos males en Surgen estrellas
negras. Sin commit ni push en esta entrega.
