# Instrucciones para agentes de IA

Estas instrucciones se aplican a Codex, Claude Code y otros agentes. Las
convenciones de código, pruebas e idiomas están en
[docs-proyecto/06-convenciones.md](docs-proyecto/06-convenciones.md). Consulta
los documentos necesarios para la tarea; evita reconstruir todo el historial.

## Alcance y continuidad

- Completa el trabajo autorizado sin pedir confirmación para cada paso rutinario.
  Evita refactorizaciones, herramientas nuevas y cambios ajenos al objetivo.
- Revisa primero el estado actual y las diferencias desde la última revisión.
  No repitas auditorías, búsquedas ni comprobaciones sin cambios que lo justifiquen.
- En trabajos por lotes, reutiliza un único resumen de continuación: último lote
  y commit, siguiente grupo y bloqueos. Incluye el estado de CI y despliegue solo
  si se ha consultado por petición expresa. Actualízalo al cerrar cada lote, sin
  duplicar informes ni transcribir salidas correctas.
- Si dos intentos de corrección no aportan avance sobre el mismo problema,
  registra la causa y continúa con trabajo independiente. Reinténtalo cuando
  cambie la causa o haya una hipótesis nueva; pide intervención si es imprescindible.

## Git y autorización

- **Trabaja en `main`.** No crees ramas ni PR. Para explorar, usa el árbol local
  o una carpeta temporal. Las subidas se hacen con `git push origin main`.
- **No hagas commit ni push sin autorización de la persona usuaria.** Una
  autorización explícita para varios lotes sigue vigente dentro de ese alcance;
  no vuelvas a pedirla en cada lote. Pedir una edición no autoriza a subirla.
- Inspecciona el estado git antes de editar. Conserva los cambios ajenos,
  incluidos los preparados para commit; no los sobrescribas, descartes ni incluyas
  en tus commits. Prepara rutas o fragmentos concretos y revisa el diff preparado.
- **Haz `git pull --rebase` antes de empezar y antes de subir.** Si los cambios
  ajenos impiden actualizar, no los apartes automáticamente para forzar el pull:
  avanza con trabajo independiente y comunica el impedimento antes de subir.
- Sitúa el último pull antes de las comprobaciones finales. Si un rebase o una
  edición posterior invalida sus resultados, repite las comprobaciones afectadas.
- Haz commits por cambio coherente, con mensajes breves en imperativo.

## Verificación proporcional

- **No ejecutes pruebas de navegador ni abras sesiones de navegador para validar**
  **la aplicación, salvo petición expresa de la persona usuaria.** Consumen demasiados
  recursos. Utiliza comprobaciones por consola y deja las revisiones visuales
  pendientes para la persona usuaria.

- Elige los controles por el impacto del diff, también antes de subir. **Un push
  no obliga a repetir la suite completa ni a compilar todo el monorepo.**
  La CI conserva los controles globales; no los dupliques localmente por rutina.

  | Cambio                                                          | Verificación local                                                                                                             |
  | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
  | Documentación, textos o estilos sin lógica                      | Prettier sobre los archivos editados; ESLint si corresponde. Sin suite global.                                                 |
  | Componente o funcionalidad aislada de la web                    | Formato y lint de sus archivos, pruebas del componente o flujo afectado si existen y comprobación de tipos de la web.          |
  | Carta, escenario o módulo aislado                               | Pruebas dirigidas a sus reglas y conexiones, formato/lint de sus archivos y tipos del paquete afectado.                        |
  | API, guardados o contratos compartidos                          | Pruebas del módulo y de sus consumidores afectados; tipos de esos paquetes.                                                    |
  | Motor, registro transversal, dependencias o configuración común | Amplía a los paquetes consumidores; usa la suite completa cuando el alcance sea transversal o no pueda acotarse con confianza. |

- Para pruebas dirigidas usa `pnpm test <archivo.test.ts>` o
  `pnpm test:related <archivo-fuente>`. La selección relacionada analiza
  importaciones estáticas: no garantiza cubrir registros dinámicos o escenarios
  enlazados por códigos; en esos casos selecciona explícitamente sus pruebas.
  Si un índice global o las traducciones hacen que la selección arrastre toda
  la suite, escoge las pruebas del comportamiento afectado; no conviertas una
  edición de textos en una auditoría completa.
- Compila solo cuando debas verificar el empaquetado o el resultado de producción
  (dependencias, recursos, rutas de carga, configuración o integración entre
  paquetes), o lo pida la persona usuaria. Usa el build del paquete afectado.
  El build de la web ya comprueba sus tipos: no ejecutes también su typecheck
  sobre el mismo estado si ese build ha pasado.
- Reutiliza resultados correctos mientras no cambien sus archivos, dependencias
  relevantes, configuración o entorno. Un commit, push, edición documental o
  cambio ajeno al alcance no los invalida. Tras un rebase, inspecciona qué se
  integró y repite solo los controles realmente afectados, no todos por defecto.
- Comprueba una vez el estado final de cada cambio coherente. Al corregir un
  fallo, repite únicamente el control fallido y los afectados por la corrección.
  No repitas pruebas dirigidas que ya estén cubiertas por una ejecución más amplia
  correcta sobre el mismo código. En el resumen de continuación existente anota
  brevemente qué se verificó, sobre qué alcance y qué cambios lo invalidarían;
  no crees informes duplicados ni un inventario por cada comando.
- Un timeout de una prueba pesada no justifica volver a ejecutar toda la suite.
  Revisa y repite solo esa prueba o archivo. Ajusta su límite si su trabajo
  legítimo supera habitualmente el valor por defecto; conserva las aserciones
  y no actives reintentos automáticos que oculten fallos reales.
- Cubre cada regla nueva y el efecto principal de cada carta con comportamiento,
  según las convenciones. Las pruebas compartidas o parametrizadas pueden cubrir
  varias cartas si verifican sus diferencias y su registro. Evita copiar pruebas
  equivalentes por cada impresión; añade integración cuando haya conexiones nuevas.
- Distingue fallos propios de los preexistentes. No declares superadas pruebas
  no ejecutadas ni modifiques trabajo ajeno solo para obtener un resultado correcto.
- Después de subir, no es necesario comprobar ni esperar a CI o al workflow
  Deploy, salvo petición expresa de la persona usuaria. No hagas seguimiento
  automático ni bloquees el cierre de la tarea o el siguiente lote por esos
  resultados. Si se solicita comprobarlos, espacia las consultas pendientes y
  consulta los registros si fallan.

## Importación de cartas de jugador

- El diseño está en
  [24 · Importación masiva](docs-proyecto/24-importacion-masiva-cartas-jugador.md)
  y los comandos iniciales en
  [25 · Primer inventario](docs-proyecto/25-primer-inventario-cartas-jugador.md).
  Son documentos históricos: contrasta el estado vigente con los manifiestos,
  el inventario y la documentación del último lote.
- Para subir un investigador o una lista concreta de ArkhamDB, sigue la
  [guía 59](docs-proyecto/59-guia-importar-lista-arkhamdb.md) y empieza con
  `node scripts/check-decklist.mjs <enlace>`.
- Prioriza cartas y niveles de mejora distintos aún no jugables frente a
  impresiones adicionales. Agrupa por mecánicas compartidas; busca lotes de
  30–50 cartas cuando sea viable, sin forzar el tamaño ni rellenarlo con reediciones.
- Importar datos no habilita una carta para jugar. Actívala cuando sus reglas,
  restricciones y diferencias estén cubiertas por implementación revisada,
  pruebas pertinentes y presentación EN/ES. Reutiliza comportamientos existentes
  cuando la equivalencia esté comprobada.
- Conserva inventarios históricos y huellas. Comprueba automáticamente que no
  se repitan códigos entre lotes ni entradas en catálogo o tienda. Separa los
  recuentos de códigos incorporados, cartas o niveles distintos nuevos y reediciones.
- Documenta las diferencias y la validación de cada lote. Revisa visualmente
  casos representativos si cambia la presentación o aparece un caso nuevo;
  evita revisar manualmente todas las impresiones equivalentes.
- En una tarea de importación continuada, avanza mientras quede trabajo viable.
  Si solo quedan cartas bloqueadas, informa de lo pendiente y sus causas sin
  presentar la importación como completa. Desactiva la automatización si así
  se ha solicitado para su finalización o si la persona usuaria pide detenerla.

## Rama `deploy`

`deploy` la genera el workflow `.github/workflows/deploy.yml` con el paquete
construido que instala Plesk. **No la toques**: ni commits a mano, ni merges,
ni la borres, ni la uses como base de otra rama.

## Comunicación

Mantén las actualizaciones breves y útiles; evita narrar operaciones rutinarias,
copiar registros correctos o repetir estados pendientes sin novedades. Al cerrar,
indica qué cambió, qué se comprobó y cualquier limitación relevante.
