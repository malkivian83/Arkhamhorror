# Historial de La llamada del Portador de la Plaga

Estado vigente y fuentes en [94 · Portador de la Plaga](94-portador-de-la-plaga.md).

### Continuación de implementación · 2026-11-05

- Último lote: I · Trasnochadores y siete narraciones, commit `4b45eab1`, en `main`.
  Base `8433ed45`; el pull previo a la subida no incorporó cambios.
- Módulo: `packages/cards/src/call-of-the-plaguebearer/`; campaña registrada,
  con constructor solo para I. Preparación, texto oculto opcional, ocho lugares,
  barricadas, tres actos, tres planes, encuentros y resoluciones R1–R3.
- Prefijo `78`, basado en la colección ES; 29 códigos distintos: 18 del primer
  conjunto y 11 compartidos. Incluyen un apoyo de historia; no se vende en tienda.
  Se reutiliza Miedo impactante. Sin coincidencias en el catálogo congelado.
- Contraste: guía ES pp. 3–4 y cartas I, Supervivientes de la Agencia, Dones,
  Confusión y Esclavos. Delta ES ya incorpora la errata. El Pasillo es **Torn
  Hallway** en los archivos EN, frente a «Ripped Hallway» en la guía.
- Motor: Presa por cantidad de traiciones con un rasgo, bloqueo de movimiento
  enemigo, ventana posterior al paso de Cazador/Errante y aparición agotada
  antes de los enfrentamientos. Greyson entra sin enfrentarse por el pasadizo.
- Presentación EN/ES y 90 caras AVIF en el manifiesto. `media.json` conserva
  rutas originales, huellas de origen/salida y tamaños. EN: recorte 12 px lateral
  y 32 px superior/inferior; ES: actos/planes girados; máximo 1048 px, calidad 76.
  Revisadas imágenes representativas, sin abrir navegador.
- Verificación: 109 pruebas entre escenario, regresión del motor y web; tipos de
  engine/cards/i18n/web, formato, lint y compilación web correctos. La compilación
  final reutiliza la copia de recursos de la primera, contrastada por huellas.
  Cobertura: bolsas y mapa, efectos de cartas, preparación para 1–4 jugadores,
  partidas completas en cuatro dificultades, finales favorables, recompensas,
  registro, presentación y huellas. El arnés básico no sustituye estas pruebas
  del escenario. Controles vigentes mientras no cambien módulo, motor o recursos.
- Narración ES de I: siete MP3 (prólogo, introducción, texto oculto, reactivo y
  R1–R3) con Martin Osborne; 6412 caracteres, voz elegida por la persona usuaria.
  Relatos completos de guía ES pp. 3–4 y Maletín 017b, separados de las reglas.
  `scripts/generate-plaguebearer-audio.mjs --generate` reanuda por huella;
  `docs-proyecto/evidencias/plaguebearer-narracion.json` conserva texto y ajustes.
  Verificados enlaces, huellas y todos los fotogramas MP3 de las siete grabaciones.
- Pendiente de I: revisión visual de la app por la persona usuaria. El material
  de los escenarios posteriores no está habilitado.
- Corrección de CI #339: registrar la referencia del escenario, añadir sus 90
  miniaturas y completar los inventarios compartidos. Pasan las 151 pruebas de
  referencia/imágenes y la verificación de los 4718 originales y miniaturas.
- Portada local extraída de la guía ES p. 1 y relatos publicados en el catálogo
  oficial ES que habilita el reproductor. Probado el cuerpo real del modal para
  los siete audios; el catálogo se revalida al recargar para evitar datos antiguos.
- Corrección de cartas ES: 45 caras reconvertidas desde los JPG con su perfil
  CMYK a sRGB mediante ImageCms (también sus miniaturas). Los ocho lugares usan
  `NNNb.jpg` como cara revelada y `NNNa.jpg` sin revelar. La Morgue incorpora
  sus textos narrativos EN/ES. Regresión de perfiles ICC, caras e idioma activo:
  47 pruebas dirigidas correctas; inventarios de originales y miniaturas válidos.
  Lint, tipos web/i18n y empaquetado web correctos. Estos controles siguen vigentes
  mientras no cambien los recursos, catálogos o su carga.
- Siguiente: escenario II; revisar Defender y Arkham caído antes de habilitarlo.
  Integrar los cambios remotos con rebase antes de subir.

### Revisión de reglas · 2026-11-05

- Alcance: preparación de campaña e I (guía ES pp. 3–4), 29 códigos de I y
  encuentros compartidos, mapa, barricadas, fichas, avances y R1–R3. Los escenarios
  II–VIII e interludios no tienen implementación que se pueda dar por validada.
- Corregido Maletín: R1 no lo concede; habilidad rápida disponible en ventanas
  ajenas; exilio también al devolverlo a la mano; el cambio de dueño de 017b se
  anota inmediatamente y se limpia al volver a pasarlo o exiliarlo, sin duplicar
  la recompensa de R2/R3. Desistir y ser derrotado siguen provocando su exilio.
- Corregido Bajo la piel: otro investigador del mismo Lugar puede activar su
  acción impresa. Manos dormidas conserva su restricción al propio investigador.
- Presentación: seis caras ES de actos/planes orientadas correctamente y caras
  EN de 017 intercambiadas para mostrar el apoyo antes que la historia.
- Confirmado: Omega empieza con **una sola barricada**, excepción expresa de la
  preparación; Alfa/Delta/Túnel sí escalan por número inicial de investigadores.
- Validación: 122 pruebas dirigidas (reglas, escenario, 16 partidas simuladas,
  fichas/mapa y recursos EN/ES); tipos de cards, lint y empaquetado web. Reutilizar
  mientras no cambien módulo, recursos o dependencias relevantes. Revisión de
  imágenes locales representativas; sin navegador ni seguimiento de CI/Deploy.
- Pendiente: revisión visual de la mesa por la persona usuaria e implementación
  posterior; no equivale a una validación jugable de los ocho escenarios.
- Caché de presentación: URLs de cartas/miniaturas `78` y portada versionadas
  para sustituir imágenes CMYK y respuestas 404 conservadas por el navegador.
  Comprobados por HTTP la portada, imágenes y relatos publicados (200); CI y
  Deploy de `982632b1` correctos al investigar la incidencia. 49 pruebas web,
  lint, tipos y empaquetado de la corrección de caché.
- Cartas narradas de I: doce caras de planes/actos (3589 caracteres) con Martin
  Osborne. Transcripción narrativa ES, sin efectos mecánicos; manifiesto y huellas
  en `plaguebearer-cartas-narracion.json`. Reproductor existente en preparación,
  avances e inspección. La comprobación de todo el catálogo de MP3 tiene 15 s
  por su lectura real de cientos de archivos, sin reintentos.
