# Narraciones de historia

Lecturas en español de España con ElevenLabs, incorporadas el 20 de octubre de 2026. Los Hermanos de la Ceniza usa «Gabo - Deep, Evocative and Resonant» y La gala del ecuador del invierno usa «Carmelo - Mature, Mysterious and Clear». Fortuna e insensatez usa «Juanjo Relatos» (`scripts/generate-fortune-audio.mjs`, evidencia en `docs-proyecto/evidencias/fortuna-narracion.json`).
La mesa las ofrece desde `apps/web/src/game/narration.ts`, por clave del texto.

Las resoluciones y los códex añadidos incluyen solo narración y diálogos: se omiten las instrucciones de juego, las recompensas, los encabezados y las condiciones del registro de campaña. Las preparaciones no se narran.

Las grabaciones generadas por API usan `eleven_multilingual_v2`, estabilidad 0,31, similitud 0,86, estilo 0, velocidad 1 y refuerzo de voz. Los archivos aportados manualmente se conservan sin modificar.

| Archivo                                   | Clave del texto                         |
| ----------------------------------------- | --------------------------------------- |
| es/brethren-of-ash-prologue.mp3           | `story.brethrenOfAsh.prologue`          |
| es/spreading-flames-intro.mp3             | `story.spreadingFlames.intro`           |
| es/spreading-flames-no-resolution.mp3     | `story.spreadingFlames.noResolution`    |
| es/spreading-flames-resolution1.mp3       | `story.spreadingFlames.resolution1`     |
| es/spreading-flames-resolution2.mp3       | `story.spreadingFlames.resolution2`     |
| es/spreading-flames-resolution3.mp3       | `story.spreadingFlames.resolution3`     |
| es/smoke-and-mirrors-intro.mp3            | `story.smokeAndMirrors.intro`           |
| es/smoke-and-mirrors-codex1-attempt.mp3   | `story.smokeAndMirrors.codex1Attempt`   |
| es/smoke-and-mirrors-codex1.mp3           | `story.smokeAndMirrors.codex1`          |
| es/smoke-and-mirrors-codex2-attempt.mp3   | `story.smokeAndMirrors.codex2Attempt`   |
| es/smoke-and-mirrors-codex2.mp3           | `story.smokeAndMirrors.codex2`          |
| es/smoke-and-mirrors-codex3-attempt.mp3   | `story.smokeAndMirrors.codex3Attempt`   |
| es/smoke-and-mirrors-codex3.mp3           | `story.smokeAndMirrors.codex3`          |
| es/smoke-and-mirrors-codex4-attempt.mp3   | `story.smokeAndMirrors.codex4Attempt`   |
| es/smoke-and-mirrors-codex4.mp3           | `story.smokeAndMirrors.codex4`          |
| es/smoke-and-mirrors-codex5-attempt.mp3   | `story.smokeAndMirrors.codex5Attempt`   |
| es/smoke-and-mirrors-codex5.mp3           | `story.smokeAndMirrors.codex5`          |
| es/smoke-and-mirrors-codex6-attempt.mp3   | `story.smokeAndMirrors.codex6Attempt`   |
| es/smoke-and-mirrors-codex6.mp3           | `story.smokeAndMirrors.codex6`          |
| es/smoke-and-mirrors-codex-servant.mp3    | `story.smokeAndMirrors.codexServant`    |
| es/smoke-and-mirrors-no-resolution.mp3    | `story.smokeAndMirrors.noResolution`    |
| es/smoke-and-mirrors-resolution1.mp3      | `story.smokeAndMirrors.resolution1`     |
| es/smoke-and-mirrors-resolution2.mp3      | `story.smokeAndMirrors.resolution2`     |
| es/queen-of-ash-intro-1.mp3               | `story.queenOfAsh.intro1`               |
| es/queen-of-ash-intro-2.mp3               | `story.queenOfAsh.intro2`               |
| es/queen-of-ash-intro-3.mp3               | `story.queenOfAsh.intro3`               |
| es/queen-of-ash-codex-david-renfield.mp3  | `story.queenOfAsh.codex.DavidRenfield`  |
| es/queen-of-ash-codex-cornelia-akely.mp3  | `story.queenOfAsh.codex.CorneliaAkely`  |
| es/queen-of-ash-codex-naomi-obannion.mp3  | `story.queenOfAsh.codex.NaomiOBannion`  |
| es/queen-of-ash-codex-sgt-earl-monroe.mp3 | `story.queenOfAsh.codex.SgtEarlMonroe`  |
| es/queen-of-ash-codex-abigail-foreman.mp3 | `story.queenOfAsh.codex.AbigailForeman` |
| es/queen-of-ash-codex-margaret-liu.mp3    | `story.queenOfAsh.codex.MargaretLiu`    |
| es/queen-of-ash-no-resolution.mp3         | `story.queenOfAsh.noResolution`         |
| es/queen-of-ash-resolution1.mp3           | `story.queenOfAsh.resolution1`          |
| es/queen-of-ash-resolution2.mp3           | `story.queenOfAsh.resolution2`          |
| es/queen-of-ash-resolution3.mp3           | `story.queenOfAsh.resolution3`          |

## La gala del ecuador del invierno

Las 16 narraciones de la guía cubren las introducciones, la descripción de los contactos, las cinco facciones y todos los finales. Se excluyen la preparación y los interludios de reglas. La descripción de cada contacto se lee sin las instrucciones de selección de facción.

| Archivo                                  | Clave del texto                          |
| ---------------------------------------- | ---------------------------------------- |
| es/midwinter-gala-intro1.mp3             | `story.midwinterGala.intro1`             |
| es/midwinter-gala-intro2.mp3             | `story.midwinterGala.intro2`             |
| es/midwinter-gala-contact.mp3            | `story.midwinterGala.contact`            |
| es/midwinter-gala-faction-foundation.mp3 | `story.midwinterGala.faction.foundation` |
| es/midwinter-gala-faction-miskatonic.mp3 | `story.midwinterGala.faction.miskatonic` |
| es/midwinter-gala-faction-syndicate.mp3  | `story.midwinterGala.faction.syndicate`  |
| es/midwinter-gala-faction-lodge.mp3      | `story.midwinterGala.faction.lodge`      |
| es/midwinter-gala-faction-kingsport.mp3  | `story.midwinterGala.faction.kingsport`  |
| es/midwinter-gala-no-resolution.mp3      | `story.midwinterGala.noResolution`       |
| es/midwinter-gala-resolution1.mp3        | `story.midwinterGala.resolution1`        |
| es/midwinter-gala-resolution2.mp3        | `story.midwinterGala.resolution2`        |
| es/midwinter-gala-resolution3.mp3        | `story.midwinterGala.resolution3`        |
| es/midwinter-gala-resolution4.mp3        | `story.midwinterGala.resolution4`        |
| es/midwinter-gala-resolution5.mp3        | `story.midwinterGala.resolution5`        |
| es/midwinter-gala-resolution6.mp3        | `story.midwinterGala.resolution6`        |
| es/midwinter-gala-resolution7.mp3        | `story.midwinterGala.resolution7`        |

El texto narrado conserva los derechos de sus propietarios, igual que el resto de textos del juego incluidos en este proyecto personal no oficial.

## Asesinato en el hotel Excelsior

Narraciones incorporadas el 21 de octubre de 2026 con «Mario - Evocative, Deep and Warm» (voz OjrdP8Z2fWjVyt0scrL7), en español de España y con los parámetros anteriores. Incluyen cuatro introducciones, siete textos de La verdad, diez revelaciones del culpable, veinte desenlaces de las variantes y cinco textos de resolución o retirada. Los relatos repetidos comparten la misma generación.

Se pueden regenerar con `node scripts/generate-excelsior-audio.mjs`, usando ELEVENLABS_API_KEY en .env; los archivos existentes se conservan. La opción --list permite revisar los textos sin enviarlos a ElevenLabs.

| Archivo                                    | Clave del texto                        |
| ------------------------------------------ | -------------------------------------- |
| es/excelsior-intro1.mp3                    | `story.excelsior.intro1`               |
| es/excelsior-intro2.mp3                    | `story.excelsior.intro2`               |
| es/excelsior-intro3.mp3                    | `story.excelsior.intro3`               |
| es/excelsior-intro4.mp3                    | `story.excelsior.intro4`               |
| es/excelsior-truth1.mp3                    | `story.excelsior.truth1`               |
| es/excelsior-truth2.mp3                    | `story.excelsior.truth2`               |
| es/excelsior-truth3.mp3                    | `story.excelsior.truth3`               |
| es/excelsior-truth4.mp3                    | `story.excelsior.truth4`               |
| es/excelsior-truth5.mp3                    | `story.excelsior.truth5`               |
| es/excelsior-truth6.mp3                    | `story.excelsior.truth6`               |
| es/excelsior-truth7.mp3                    | `story.excelsior.truth7`               |
| es/excelsior-culprit1.mp3                  | `story.excelsior.culprit1`             |
| es/excelsior-culprit2.mp3                  | `story.excelsior.culprit2`             |
| es/excelsior-culprit3.mp3                  | `story.excelsior.culprit3`             |
| es/excelsior-culprit4.mp3                  | `story.excelsior.culprit4`             |
| es/excelsior-culprit5.mp3                  | `story.excelsior.culprit5`             |
| es/excelsior-culprit6.mp3                  | `story.excelsior.culprit6`             |
| es/excelsior-culprit7.mp3                  | `story.excelsior.culprit7`             |
| es/excelsior-culprit8.mp3                  | `story.excelsior.culprit8`             |
| es/excelsior-culprit9.mp3                  | `story.excelsior.culprit9`             |
| es/excelsior-culprit10.mp3                 | `story.excelsior.culprit10`            |
| es/excelsior-no-resolution.mp3             | `story.excelsior.noResolution`         |
| es/excelsior-no-resolution-resigned.mp3    | `story.excelsior.noResolutionResigned` |
| es/excelsior-resolution1.mp3               | `story.excelsior.resolution1`          |
| es/excelsior-resolution2.mp3               | `story.excelsior.resolution2`          |
| es/excelsior-resolution3.mp3               | `story.excelsior.resolution3`          |
| es/excelsior-culprit-doom1.mp3             | `story.excelsior.culpritDoom1`         |
| es/excelsior-culprit-objective1.mp3        | `story.excelsior.culpritObjective1`    |
| es/excelsior-culprit-doom2.mp3             | `story.excelsior.culpritDoom2`         |
| es/excelsior-culprit-objective2.mp3        | `story.excelsior.culpritObjective2`    |
| es/excelsior-culprit-doom3.mp3             | `story.excelsior.culpritDoom3`         |
| es/excelsior-culprit-objective3.mp3        | `story.excelsior.culpritObjective3`    |
| es/excelsior-culprit-doom4.mp3             | `story.excelsior.culpritDoom4`         |
| es/excelsior-culprit-objective4.mp3        | `story.excelsior.culpritObjective4`    |
| es/excelsior-culprit-doom5.mp3             | `story.excelsior.culpritDoom5`         |
| es/excelsior-culprit-objective5.mp3        | `story.excelsior.culpritObjective5`    |
| es/excelsior-culprit-doom6.mp3             | `story.excelsior.culpritDoom6`         |
| es/excelsior-culprit-objective6.mp3        | `story.excelsior.culpritObjective6`    |
| es/excelsior-culprit-doom7.mp3             | `story.excelsior.culpritDoom7`         |
| es/excelsior-culprit-objective7.mp3        | `story.excelsior.culpritObjective7`    |
| es/excelsior-culprit-doom8.mp3             | `story.excelsior.culpritDoom8`         |
| es/excelsior-culprit-objective8.mp3        | `story.excelsior.culpritObjective8`    |
| es/excelsior-culprit-doom9.mp3             | `story.excelsior.culpritDoom9`         |
| es/excelsior-culprit-objective9.mp3        | `story.excelsior.culpritObjective9`    |
| es/excelsior-culprit-doom10.mp3            | `story.excelsior.culpritDoom10`        |
| es/excelsior-culprit-objective10.mp3       | `story.excelsior.culpritObjective10`   |
| es/fortune-and-folly-intro1.mp3            | `story.fof.intro1`                     |
| es/fortune-and-folly-intro3.mp3            | `story.fof.intro3`                     |
| es/fortune-and-folly-intro4.mp3            | `story.fof.intro4`                     |
| es/fortune-and-folly-intro5.mp3            | `story.fof.intro5`                     |
| es/fortune-and-folly-part1-resolution1.mp3 | `story.fof.resolution1`                |
| es/fortune-and-folly-part1-resolution2.mp3 | `story.fof.resolution2`                |
| es/fortune-and-folly-the-plan1.mp3         | `story.fof.plan1`                      |
