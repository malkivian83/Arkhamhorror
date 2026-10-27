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

- Durante el desarrollo, ejecuta pruebas dirigidas a las reglas o componentes
  afectados. Para una edición solo de documentación, comprueba el formato de los
  archivos editados; no ejecutes toda la aplicación si no vas a subir cambios.
- **Antes de cada push deben pasar** `pnpm format:check`, `pnpm lint`,
  `pnpm typecheck` y `pnpm test`. Ejecuta también `pnpm build` si cambias la web,
  el servidor o paquetes que consumen. Estas comprobaciones siguen siendo
  obligatorias aunque el cambio sea pequeño.
- Ejecuta los controles completos una vez sobre el estado final del lote.
  Detente en el primer fallo, corrígelo y continúa hasta completar todos.
  Repite los controles fallidos o afectados por las correcciones; evita repetir
  los que siguen siendo válidos.
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
