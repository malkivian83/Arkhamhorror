# Documentación del proyecto propio

Plataforma web propia para jugar a **Arkham Horror: El Juego de Cartas (LCG)**,
tomando como referencia de estudio el proyecto `halogenandtoast/ArkhamHorror`
(código público en GitHub pero **sin licencia**; copia local en `E:\referencia\ArkhamHorror`, fuera de este repositorio).

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
| — | [reglas/](reglas/README.md) | Dónde y cómo guardar los PDF de reglas |

## Decisiones ya tomadas

- Repositorio propio: `github.com/malkivian83/Arkhamhorror` (privado).
- No se trabaja contra el repositorio original ni se usan sus servicios
  (CDN, API, OAuth, despliegues, bases de datos).
- Idiomas soportados: **solo inglés y español**.
