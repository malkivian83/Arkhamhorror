# Documentación del proyecto propio

Plataforma web propia para jugar a **Arkham Horror: El Juego de Cartas (LCG)**,
tomando como referencia de estudio el proyecto `halogenandtoast/ArkhamHorror`
(código público en GitHub pero **sin licencia**; copia local actual en `D:\referencia\ArkhamHorror-main`, fuera de este repositorio).

**Estado revisado el 19/10/2026:** el producto se presenta como **Arkham Online**.
Para conocer el trabajo actual, empezar por la [hoja de ruta](05-hoja-de-ruta.md).
Los informes iniciales se conservan como antecedentes y no son un inventario
vigente de pendientes.

- **Brethren of Ash:** cierre técnico local de los tres escenarios; queda la
  comprobación en teléfono físico. Ver documentos 16–17.
- **La Gala:** fases 1–3 completadas; G18 cerrado y G17 pendiente de victorias
  completas. Siguiente bloque: partidas completas e interfaz, seguido de publicación estable.
  Ver documento 18.
- **Plataforma:** cuentas y biblioteca privada con MySQL implementadas;
  despliegue completo para Plesk preparado. Ver documentos 22–23 para alcance,
  límites y comprobaciones de producción pendientes.

| # | Documento | Contenido |
|---|---|---|
| 01 | [Informe técnico del programa original](01-informe-tecnico.md) | Qué es, cómo está construido, cifras, puntos fuertes y débiles |
| 02 | [Aspectos legales y de propiedad intelectual](02-aspectos-legales.md) | **Leer antes de nada.** Licencia, Fantasy Flight Games, imágenes |
| 03 | [Cambios necesarios para una versión propia](03-cambios-necesarios.md) | Inventario de todo lo que hay que quitar, sustituir o regenerar |
| 04 | [Arquitectura propuesta](04-arquitectura-propuesta.md) | Cómo construir nuestro propio programa |
| 05 | [Hoja de ruta](05-hoja-de-ruta.md) | Fases e hitos, empezando por un "corte vertical" jugable |
| 06 | [Convenciones de desarrollo](06-convenciones.md) | Repositorio, ramas, estilo, tests, idiomas (solo EN/ES) |
| 07 | [Decisiones y cuestiones abiertas](07-dudas-abiertas.md) | Registro actualizado de decisiones, estado observado y cuestiones aún abiertas |
| 08 | [El motor de reglas](08-motor.md) | Cómo funciona, qué reglas están implementadas y qué falta |
| 09 | [Spreading Flames](09-spreading-flames.md) | Análisis del primer escenario: cartas, mecánicas necesarias y datos que faltan |
| 10 | [Funcionalidades de la mesa](10-funcionalidades-mesa.md) | Comparación con el proyecto de referencia y orden de trabajo |
| 11 | [Smoke and Mirrors](11-smoke-and-mirrors.md) | Escenario II: preparación, sospechosos y códex, reglas nuevas y resoluciones |
| 12 | [Queen of Ash](12-queen-of-ash.md) | Escenario III: alcantarillas, Elokoss, conexiones que cambian y resoluciones |
| 13 | [Añadir campañas](13-anadir-campanas.md) | Piezas genéricas para nuevas campañas, escenarios y cartas |
| 14 | [La gala del ecuador del invierno](14-la-gala.md) | Escenario independiente: facciones, Invitados, Joya y puntuación |
| 14 | [Propuesta de mesa móvil](diseno-movil/README.md) | Mano visible, navegación inferior y paneles sobre el mapa |
| 15 | [Auditoría funcional de la referencia — 17/10/2026](15-auditoria-referencia-2026-10-17.md) | Ingeniería inversa, 110 oportunidades, inventario de contenido y prioridades para juego local; [backlog CSV](15-backlog-referencia-2026-10-17.csv) |
| 16 | [Auditoría de cierre de Brethren of Ash](16-auditoria-cierre-brethren-of-ash.md) | Cierre local y aceptación ampliada: dos campañas en normal, Smoke completo, Queen R1/R2/R3, Masivo, costes y recorrido de interfaz; prueba en teléfono físico pendiente. [Matriz de cartas](16-matriz-cartas-cierre.csv). |
| 17 | [Base estable de Brethren of Ash](17-version-estable-brethren-of-ash.md) | Evidencia conservada, etiqueta de versión y protocolo pendiente para teléfono físico. |
| 18 | [Auditoría de cierre de La Gala](18-auditoria-cierre-la-gala.md) | Fases 1–3 completadas: 20 de 21 trabajos; contratos principales de 62 códigos, respaldo EN/ES y persistencia especial. Pendientes victorias completas, interfaz y publicación. [Matriz](18-matriz-la-gala.csv). |
| 19 | [Avance visual de actos y planes](19-avance-visual-actos.md) | Cartas y efectos automáticos por pasos, aceptación obligatoria, guardado de la lectura y comprobación en Brethren y La Gala. |
| 20 | [Miniaturas nítidas de la mano](20-miniaturas-mano.md) | Miniaturas locales a tamaño estable, ampliación con el original y generación reproducible. |
| 21 | [Cuentas y guardado en servidor](21-cuentas-y-guardado-en-servidor.md) | Informe histórico de diseño previo a la implementación del documento 22. |
| 22 | [Implementación de cuentas y MySQL](22-implementacion-cuentas-mysql.md) | Registro, Google, bibliotecas privadas, sincronización, desarrollo local, despliegue y límites pendientes. |
| 23 | [Despliegue completo desde Plesk](23-despliegue-plesk.md) | Web y API, pnpm automático, migraciones, administrador y reinicio desde el panel, sin SSH. |
| 24 | [Importación masiva de cartas de jugador](24-importacion-masiva-cartas-jugador.md) | Comparación de fuentes, estudio de la referencia y ArkhamDB, proceso reproducible, límites del motor y plan de activación por lotes verificados. |
| 25 | [Primera importación del inventario de jugador](25-primer-inventario-cartas-jugador.md) | 1.983 registros, 86 paquetes, piloto de 104 cartas sin diferencias, herramienta reproducible y matriz de bloqueos; activación jugable pendiente. |
| 26 | [Primer lote jugable de cartas de jugador](26-primer-lote-jugable-cartas-jugador.md) | Siete cartas con comportamiento y pruebas, presentación EN/ES y mazos importados completos; [matriz de las 24 preseleccionadas](26-matriz-piloto-jugador.csv). |
| 27 | [Cierre del piloto de cartas de jugador](27-cierre-piloto-cartas-jugador.md) | 24 cartas verificadas; 17 añadidas, mecánicas nuevas y 1.855 registros restantes. |
| 28 | [Segundo lote de cartas de jugador](28-segundo-lote-cartas-jugador.md) | Tres incorporaciones, mejoras con experiencia y manifiesto separado; 1.852 registros restantes. |
| 29 | [Tercer lote de cartas de jugador](29-tercer-lote-cartas-jugador.md) | Cinco cartas de robo, recursos, pistas y curación; 32 incorporadas y 1.847 registros restantes. |
| 30 | [Cuarto lote: reediciones verificadas](30-cuarto-lote-reediciones.md) | 30 códigos, equivalencia mecánica auditada, 62 incorporados y 1.817 pendientes. |
| 31 | [Quinto lote: reacciones y permanentes](31-quinto-lote-reacciones-permanentes.md) | 25 reediciones con usos, identidad de eventos y permanentes; 87 incorporados y 1.792 pendientes. |
| 32 | [Sexto lote: fundamentos clásicos](32-sexto-lote-fundamentos-clasicos.md) | 34 registros, talentos y herramientas, Meat Cleaver completo y máximos por título; 1.758 pendientes. |
| 33 | [Asesinato en el hotel Excelsior](33-asesinato-excelsior.md) | Escenario independiente: Indicios, La verdad, las diez versiones de El verdadero culpable y lo nuevo del motor |
| 34 | [Séptimo lote: equipo y efectos directos](34-septimo-lote-equipo-y-efectos-directos.md) | 32 registros, armas y curación, búsquedas y corrección del daño al fallar; 1.726 pendientes. |
| 35 | [Octavo lote: reacciones y protección](35-octavo-lote-reacciones-y-proteccion.md) | Diez cartas o mejoras nuevas, cero reediciones; 82 novedades distintas acumuladas. |
| 36 | [Noveno lote: herramientas de combate](36-noveno-lote-herramientas-de-combate.md) | Ocho cartas o mejoras distintas, Represalia, munición y recarga; 90 novedades acumuladas. |
| 37 | [Décimo lote: compromiso condicionado](37-decimo-lote-compromiso-condicionado.md) | Seis habilidades distintas, restricciones propias y compartidas; 96 novedades acumuladas. |
| 38 | [Undécimo lote: iconos variables](38-undecimo-lote-iconos-variables.md) | Diez cartas o niveles distintos, iconos según el estado y presentación coherente; 106 novedades acumuladas. |
| 39 | [Duodécimo lote: habilidades de contexto](39-duodecimo-lote-habilidades-de-contexto.md) | Nueve cartas o niveles distintos, origen, enfrentamiento, resultado e interacción con Isabelle; 115 novedades acumuladas. |
| 40 | [Decimotercer lote: efectos de resultado](40-decimotercer-lote-efectos-de-resultado.md) | Seis cartas o niveles distintos, búsqueda, preparación, curación, evasión y compromiso sin iconos; 121 novedades acumuladas. |
| — | [reglas/](reglas/README.md) | Dónde y cómo guardar los PDF de reglas |

## Decisiones ya tomadas

- Repositorio propio: `github.com/malkivian83/Arkhamhorror` (privado).
- La referencia se consulta desde una copia externa al repositorio, siguiendo
  las [convenciones vigentes](06-convenciones.md).
  La aplicación sirve sus propias imágenes y usa su propia API, cuentas y base de datos.
- Idiomas soportados: **solo inglés y español**.
