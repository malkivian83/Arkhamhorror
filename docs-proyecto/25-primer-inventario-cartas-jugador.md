# 25 · Primera importación del inventario de jugador

> Estado posterior: [piloto completo de 24 cartas](27-cierre-piloto-cartas-jugador.md).
> Este documento conserva el informe de su etapa inicial.

20/10/2026. Ejecución del primer bloque del
[plan de importación](24-importacion-masiva-cartas-jugador.md): inventario real,
normalización, contraste y piloto de regresión de la caja básica. **Las cartas
importadas quedan en un catálogo separado, sin registrarse para jugar.**

Actualización posterior: el [documento 26](26-primer-lote-jugable-cartas-jugador.md)
registra la aprobación e incorporación jugable de siete cartas. Este informe y
su lote se conservan como evidencia histórica de la importación inicial.

## Resultado conservado

Lote `3c8ee4b5d8100766`, generado con el importador versión 1:

| Indicador                                             | Resultado |
| ----------------------------------------------------- | --------: |
| Registros recibidos en inglés                         |     1.983 |
| Registros recibidos en español                        |     1.983 |
| Registros conservados en el inventario                |     1.983 |
| Paquetes que devuelve la API                          |       115 |
| Paquetes con registros en este inventario             |        86 |
| Registros con bloqueos del modelo actual              |       237 |
| Coincidencias con definiciones registradas localmente |       104 |
| Coincidencias con comportamiento local registrado     |       104 |
| Coincidencias con el JSON parcial de la referencia    |       747 |
| Registros con texto ES distinto del inglés            |     1.943 |
| Registros sin texto ES en la respuesta                |         9 |
| Cartas nuevas activadas para jugar                    |         0 |

Los 104 registros de `core_2026` coinciden con nuestro JSON existente: ninguna
alta, baja ni diferencia. El piloto compara los datos que consumía el importador
anterior; no acredita por sí solo todas las interacciones de sus cartas.

El catálogo entrante tiene 105 investigadores, 964 apoyos, 569 eventos, 185
habilidades, 122 traiciones, 33 enemigos, 2 lugares y 3 historias. Se conservan
todos, incluidos los tipos que solo son dependencias y no cartas elegibles
normalmente para un mazo. Los recuentos son de registros/códigos, no de títulos
únicos ni copias físicas.

Archivos del lote:

- [Catálogo normalizado](../packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json).
- [Matriz de cobertura CSV](../packages/cards/src/catalog/imports/3c8ee4b5d8100766/coverage.csv).
- [Informe de diferencias y cobertura](../packages/cards/src/catalog/imports/3c8ee4b5d8100766/report.json).
- [Manifiesto de procedencia y huellas](../packages/cards/src/catalog/imports/3c8ee4b5d8100766/manifest.json).

Las respuestas originales EN/ES y de paquetes están fuera del repositorio, en
`C:\Users\FEde\AppData\Local\Temp\arkham-player-cards-cache`. Son la entrada
para repetir este lote sin red; esa caché puede perderse si se limpia la carpeta
temporal. El manifiesto conserva las URL, fechas, cabeceras y SHA-256, pero no
sustituye los cuerpos originales para reproducir una instantánea histórica.

## Límites y problemas detectados

Los bloqueos del modelo se solapan: una misma carta puede tener varios.

| Motivo                                                                 | Registros afectados |
| ---------------------------------------------------------------------- | ------------------: |
| Construcción del investigador no representable por clase/nivel simples |                  64 |
| Cartas vinculadas y sus dependencias                                   |                  63 |
| Facciones múltiples o fuera del conjunto actual                        |                  47 |
| Alternativas en los requisitos de exclusivas                           |                  43 |
| Códigos extendidos que requieren adaptar la presentación               |                  19 |
| Personalización                                                        |                  16 |
| Ranuras no soportadas                                                  |                  14 |
| Valores simbólicos                                                     |                  10 |
| Tipo no admitido por `PlayerCardDef`                                   |                   5 |

Hay 11 diferencias estructurales entre una cara anidada y su registro principal:
el objeto anidado expresa un coste `null` y el registro principal omite el campo.
Quedan registradas como `embedded-face-conflict`; **no son once erratas mecánicas
demostradas**. Se conserva el registro principal y se requiere revisión antes de
convertir estas cartas al motor.

El informe conserva también 26 códigos locales ausentes de esta respuesta de
jugador, principalmente contenido de escenario, y 68 códigos del JSON de estudio
ausentes de ella. No se borran ni se convierten automáticamente. El JSON de la
referencia sigue siendo una comparación parcial de 815 registros, no una medida
de toda su implementación.

La cobertura ES solo mide presencia y diferencia de campos. Un texto diferente
no demuestra calidad de traducción, y un nombre igual puede ser correcto. Las
imágenes se contabilizan como rutas anunciadas por la API: no se han descargado
ni comprobado. Las reglas complejas y el texto íntegro permanecen en las
instantáneas externas; el catálogo conserva indicadores y motivos de revisión.

El catálogo no se importa desde el índice del paquete ni modifica los mazos,
partidas, selección de investigadores, compra con experiencia o registro de
comportamientos. Todos sus registros llevan `activation: "not-reviewed"`,
incluidas las coincidencias con cartas ya presentes en el juego.

## Herramienta implementada

Entrada: [`scripts/import-player-cards.mjs`](../scripts/import-player-cards.mjs),
disponible como `pnpm cards:import`.

```powershell
# Consultar la API y mostrar el análisis, sin guardar un lote en el proyecto.
pnpm cards:import --reference D:/referencia/ArkhamHorror-main

# Guardar el inventario normalizado y su informe; no habilita cartas.
pnpm cards:import --reference D:/referencia/ArkhamHorror-main --write

# Repetir exactamente desde las instantáneas descargadas en esta máquina.
pnpm cards:import --input-dir C:/Users/FEde/AppData/Local/Temp/arkham-player-cards-cache --reference D:/referencia/ArkhamHorror-main --write
```

Opciones adicionales: `--cache-dir` para elegir una caché externa y `--output`
para cambiar la carpeta de lotes. `--reference` es opcional: si se omite, el
manifiesto indica que no se ha hecho ese contraste y el identificador cambia.

Características de esta primera versión:

- API EN/ES y paquetes, con tiempos de espera, reintentos limitados y respeto
  de `max-age`, `Last-Modified`, ETag si existe y `Retry-After`.
- Entradas vacías, procedencia incoherente, huellas incorrectas y códigos
  duplicados detienen la ejecución antes de publicar un lote.
- Coste cero, campo ausente, guion y símbolos se distinguen. Se preservan las
  facciones, ranuras repetidas, exclusivas alternativas, códigos y relaciones.
- Ninguna regla aproximada se activa al encontrar un campo no soportado.
  El informe señala esos casos y el registro queda pendiente.
- El lote se genera en una carpeta de preparación y se comprueban sus huellas
  antes de promover el directorio completo. Un fallo no altera lotes anteriores.
- El identificador depende de las entradas, versión del importador, JSON básico,
  registro local observado y JSON de referencia. Repetir las mismas entradas
  devuelve `Unchanged` tras verificar la integridad del lote conservado.
- Los JSON/CSV generados se excluyen de Prettier para no cambiar sus huellas.
  Las pruebas verifican su manifiesto, integridad y contabilización de registros.

Las fuentes reales devolvieron `HTTP 200`, `Cache-Control: max-age=600, public`
y `Last-Modified`; no anunciaron ETag. Los detalles completos están en el
manifiesto. La ejecución desde el aislamiento necesitó acceso de red externo
para resolver ArkhamDB; la repetición desde caché no necesita red.

## Estado del plan y siguiente lote

- **Fase 0:** realizada con las limitaciones de cobertura de referencia e imágenes
  indicadas arriba. Informe y matriz conservados.
- **Fase 1:** implementados el normalizador, la simulación, la caché y los lotes
  reproducibles; piloto de 104 cartas sin diferencias. Falta la conversión e
  integración general con el modelo jugable y el mecanismo de correcciones
  explícitas cuando aparezca una diferencia que lo requiera.
- **Fase 2:** pendiente de contratos de comportamiento, implementación propia y
  pruebas de las cartas nuevas. No se ha presentado el inventario como contenido
  nuevo jugable.

Se preseleccionan **24 códigos de nivel 0** para estudiar el primer lote, de
`dwl` y `tmm`: tienen datos sin bloqueos del modelo detectados por esta versión
y cubren las cinco clases. Esta selección es de trabajo, no una declaración de
compatibilidad completa ni de sencillez de sus efectos.

`02016`, `02017`, `02018`, `02020`, `02021`, `02022`, `02023`, `02024`, `02025`,
`02026`, `02028`, `02029`, `02030`, `02032`, `02033`, `02034`, `02036`, `02105`,
`02107`, `02109`, `02111`, `02113`, `02116`, `02117`.

El siguiente trabajo es revisar sus contratos y dependencias con las reglas y
el programa de referencia, retirando del primer lote las que necesiten una
ampliación sustancial. Antes de activarlas también habrá que integrar el bloqueo
de mazos pendientes y evitar cualquier pérdida de códigos al importar mazos.

## Verificación

El bloque incorpora pruebas de valores simbólicos, ranuras, duplicados, tipos de
debilidades, alternativas de exclusivas, ediciones, falta de traducción, caché,
respuestas 304 y errores, reintentos, fallo de escritura, repetición y corrupción
de lotes. Las pruebas se ejecutan con la suite normal (`pnpm test`) o con
`pnpm test --project card-import`.

Comprobaciones de esta entrega: formato, lint y tipos; importación real y segunda
ejecución sin cambios; **918 pruebas correctas y 15 omitidas**, incluidas las 19
del importador. La primera ejecución aislada falló al conectar con el servidor
SMTP local de prueba (`EACCES`); la suite completa pasó fuera del aislamiento.
Las pruebas omitidas siguen sin acreditar su cobertura en este entorno.
Sin commit ni push.
