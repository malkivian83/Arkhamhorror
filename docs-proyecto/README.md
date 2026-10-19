# Documentación del proyecto propio

Plataforma web propia para jugar a **Arkham Horror: El Juego de Cartas (LCG)**,
tomando como referencia de estudio el proyecto `halogenandtoast/ArkhamHorror`
(código público en GitHub pero **sin licencia**; copia local actual en `D:\referencia\ArkhamHorror-main`, fuera de este repositorio).

> Estos documentos son el punto de partida del desarrollo. Léelos en orden.

| # | Documento | Contenido |
|---|---|---|
| 01 | [Informe técnico del programa original](01-informe-tecnico.md) | Qué es, cómo está construido, cifras, puntos fuertes y débiles |
| 02 | [Aspectos legales y de propiedad intelectual](02-aspectos-legales.md) | **Leer antes de nada.** Licencia, Fantasy Flight Games, imágenes |
| 03 | [Cambios necesarios para una versión propia](03-cambios-necesarios.md) | Inventario de todo lo que hay que quitar, sustituir o regenerar |
| 04 | [Arquitectura propuesta](04-arquitectura-propuesta.md) | Cómo construir nuestro propio programa |
| 05 | [Hoja de ruta](05-hoja-de-ruta.md) | Fases e hitos, empezando por un "corte vertical" jugable |
| 06 | [Convenciones de desarrollo](06-convenciones.md) | Repositorio, ramas, estilo, tests, idiomas (solo EN/ES) |
| 07 | [Dudas abiertas](07-dudas-abiertas.md) | Decisiones que necesitamos del propietario del proyecto |
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
| 18 | [Auditoría de cierre de La Gala](18-auditoria-cierre-la-gala.md) | Fases 1–2 completadas: 19 de 21 trabajos; quedan aceptación de contenido y respaldo EN/ES. [Matriz de 62 códigos](18-matriz-la-gala.csv). |
| 19 | [Avance visual de actos y planes](19-avance-visual-actos.md) | Cartas y efectos automáticos por pasos, aceptación obligatoria, guardado de la lectura y comprobación en Brethren y La Gala. |
| 20 | [Miniaturas nítidas de la mano](20-miniaturas-mano.md) | Miniaturas locales a tamaño estable, ampliación con el original y generación reproducible. |
| 21 | [Cuentas y guardado en servidor](21-cuentas-y-guardado-en-servidor.md) | Informe previo: cuentas, bibliotecas privadas de mazos y campañas, sincronización y migración en VPS con MySQL. |
| 22 | [Implementación de cuentas y MySQL](22-implementacion-cuentas-mysql.md) | Registro, Google, bibliotecas privadas, sincronización, desarrollo local, despliegue y límites pendientes. |
| — | [reglas/](reglas/README.md) | Dónde y cómo guardar los PDF de reglas |

## Decisiones ya tomadas

- Repositorio propio: `github.com/malkivian83/Arkhamhorror` (privado).
- No se trabaja contra el repositorio original ni se usan sus servicios
  (CDN, API, OAuth, despliegues, bases de datos).
- Idiomas soportados: **solo inglés y español**.
