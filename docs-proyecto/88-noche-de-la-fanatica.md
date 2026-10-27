# 88 · La noche de la fanática

Estado: 26 de octubre de 2026. Primera entrega local: **El encuentro**.
Las máscaras de medianoche y El Devorador de las Profundidades están registrados
en su orden de campaña, sin función de preparación y sin posibilidad de iniciarlos.
La descripción de selección informa de esta disponibilidad parcial.

## Fuentes y alcance de la revisión

- `reglas/AHLCG_Noche_de_la_fanatica_revisada.pdf`: preparación y bolsas de caos
  (p. 1), El encuentro y sus cuatro desenlaces (pp. 2–3). Se ha comprobado también
  visualmente la página de bolsas, porque la extracción de texto sustituye los símbolos.
- `reglas/ah_gc_la-noche-de-la-fanatica_completa.pdf`: fuente de contraste disponible.
- `reglas/AHLCG_Grimorio_v_1_0_Capitulo2.pdf`: consulta de las entradas sobre acciones,
  activación, combate, negociación, eliminación, investigador jefe, pruebas y campaña.
  Se ha inspeccionado visualmente la página 3. **No constituye una auditoría exhaustiva
  de las 50 páginas del documento ni de todas las campañas existentes.**
- Copia externa `D:/referencia/ArkhamHorror-main`: inventario de escenarios y cartas;
  datos y textos oficiales EN/ES de `frontend/public/cards_{en,es}.json`.
  Los comportamientos se implementan en el motor propio.

## Reglas comunes que se reutilizan

Los escenarios comparten el motor de fases, acciones, pruebas, daño y horror,
enfrentamiento, ataques de oportunidad, palabras clave, victoria, experiencia,
trauma, mazos y guardado. El encuentro utiliza los conjuntos clásicos Ratas,
Gules, Miedo impactante, Antiguos males y Frío helador ya registrados y probados.
Sus definiciones están actualmente en `the-path-to-carcosa/encounter-sets.ts`;
se reutilizan directamente, sin duplicar ni sustituir sus comportamientos.
Su ubicación en esa carpeta no los convierte en variantes exclusivas de Carcosa.

### Correcciones del motor compartido

- Un apoyo controlado puede modificar pruebas de otros investigadores mediante
  `skillAura`. Lita da +1 a combate a los investigadores de su Lugar, incluido su
  controlador. La fuente se muestra en el desglose de la prueba.
- Al eliminarse o retirarse el jefe, los investigadores restantes eligen otro;
  con un solo superviviente se asigna automáticamente. La elección se guarda
  independientemente del orden de jugadores, sin reordenar candidatos ni experiencia.
- Las partidas nuevas llevan `leadElectionVersion: 1`. Los estados antiguos sin esa
  versión conservan su comportamiento para reproducir sus historiales existentes.
  El guardado valida tanto la versión como la identidad del jefe elegido.

## El encuentro implementado

| Parte          | Comportamiento                                                                                                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preparación    | Estudio revelado con 2 pistas por investigador; cuatro Lugares apartados, Sacerdote gul apartado, Lita aún fuera de juego y 26 cartas en el mazo de encuentros.                         |
| Acto 1         | Pago de 2 pistas por investigador, entrada del resto de la casa, descarte de enemigos del Estudio, colocación del grupo en el Pasillo y retirada del Estudio.                           |
| Acto 2         | Pago al final de la ronda de 3 pistas por investigador, aportadas desde el Pasillo; revelación de la Salita, aparición de Lita sin controlador y del Sacerdote gul.                     |
| Acto 3         | La derrota del Sacerdote gul abre la decisión del jefe entre quemar y conservar la casa.                                                                                                |
| Lugares        | Barrera de entrada a la Salita; horror al entrar en el Ático, daño al entrar en el Sótano; retirada desde la Salita.                                                                    |
| Enemigos       | Sacerdote gul con salud por investigador, Presa, Cazador y Represalia; Devorador de carne y Gul de hielo con aparición en su Lugar, descartados si aún está apartado.                   |
| Lita           | Negociación con intelecto (4), control y ranura de Aliado, aura compartida y reacción opcional de +1 daño contra Monstruos para cualquier investigador de su Lugar.                     |
| Planes         | Decisión entre descartes al azar u horror al jefe; barajar el descarte y descartar hasta un Gul; movimiento de Gules y perdición del tercer plan; finales según el acto.                |
| Caos           | Ambas caras de la referencia 01104: cantidades de Gules, horror al fallar, daño inmediato por tablilla y búsqueda de Gul después de fallar la prueba en difícil/experto.                |
| Sin resolución | Casa en pie, Sacerdote vivo, Lita para el último jefe y victoria +2 de experiencia para cada investigador.                                                                              |
| R1             | Casa quemada, Lita y 1 trauma mental solo para el jefe; victoria +2 de experiencia para todos.                                                                                          |
| R2             | Casa en pie, sin Lita; victoria +2 para todos y 1 experiencia adicional solo para el jefe.                                                                                              |
| R3             | Mueren quienes no se retiraron; notas de casa, Lita y Sacerdote; elección de nuevo portador de Lita si muere el jefe, aplazada hasta incorporar sustitutos si no quedan supervivientes. |

La bolsa clásica usa **Sectario**, no Primigenio: no se ha reutilizado por error
la bolsa de Brethren of Ash aunque coincidan sus valores numéricos.

## Presentación y recursos

- Catálogo local EN/ES de 26 cartas distintas, con los textos de ambas caras.
- 56 escaneos oficiales nuevos y sus miniaturas de 192 píxeles.
- Portada oficial de caja básica: `https://assets.arkhamhorror.app/img/arkham/boxes/01.jpg`.
- Tarjeta 01104 conectada al visor de símbolos y a la ayuda de fichas por dificultad.
- Relatos completos EN/ES: español contrastado con la guía revisada, pp. 1–3.
- Seis narraciones españolas con ElevenLabs y Baldo: prólogo, introducción y
  cuatro desenlaces. Solo narración y diálogos; las instrucciones y recompensas
  se presentan aparte como efectos de campaña. Clave usada en memoria, sin persistirla.
- Evidencia de transcripciones, ajustes y huellas en `evidencias/zealot-baldo-narracion.json`.
- Inspección en navegador de la selección de campaña y del primer turno, con cartas
  españolas, referencias, preparación, mano inicial y acciones visibles.

Importadores reproducibles desde la raíz del repositorio:

```powershell
node scripts/import-zealot-cards.mjs
node scripts/import-zealot-images.mjs
node scripts/import-zealot-story.mjs
node scripts/generate-zealot-audio.mjs --generate
```

Miniaturas: `scripts/generate-card-thumbnails.py --codes <códigos de arte>`;
actualizar solo los 28 códigos de arte de esta entrega. La procedencia de los
escaneos está en `evidencias/imagenes-encuentro.json`.

## Evidencia jugable

`evidencias/el-encuentro-3.json` conserva una partida completa con Joe Diamond,
mazo inicial, dificultad fácil, semilla 3 y **59 decisiones normales**. No se
modifican estados, mazo, bolsa ni resultados al reproducirla.

- R1: 5 de experiencia, 1 trauma mental y Lita Chantler.
- Bifurcación legal de la misma victoria a R2: 6 de experiencia, sin Lita ni trauma.
- La prueba incluye serializar y restaurar el estado durante el recorrido.

Las pruebas dirigidas cubren además preparación con 1–4 investigadores y las
cuatro dificultades, efectos propios de las cartas, fichas, resoluciones,
eliminación del jefe, sustituciones y guardado. Las pruebas de resolución
con estados preparados no se contabilizan como partidas completas.

## Continuación

1. Implementar Las máscaras de medianoche: Lugares y variantes, mazo de sectarios,
   objetivos, preparación según la casa, Sacerdote vivo y registro de interrogados/escapados.
2. Implementar El Devorador de las Profundidades y sus preparaciones y finales.
3. Verificar la continuidad de los tres escenarios y las consecuencias acumuladas.
4. Completar revisión visual en pantalla móvil; esta entrega se ha inspeccionado
   en navegador de escritorio.
5. Ampliar el contraste con el Grimorio a otros bloques del motor en una revisión
   específica, sin asumir que consultar el documento demuestra conformidad completa.

## Estado de entrega

Publicación conjunta en `main` autorizada por el usuario, incluyendo los cambios
pendientes de importación de cartas y sus recursos, además de los dos PDF añadidos. El `git pull --rebase` inicial no pudo ejecutarse por
esos cambios sin confirmar; no se han apartado ni descartado.

Comprobaciones finales:

- Suite completa: **4.213 pruebas superadas y 19 omitidas**, 498 archivos aprobados y
  2 omitidos (`vitest run --maxWorkers=8 --testTimeout=20000`).
- Tras incorporar relatos completos y seis audios: **45 pruebas dirigidas superadas**
  de reglas de campaña, recorridos completos, textos y narración.
- Lint de los archivos modificados y formato de la implementación: correctos.
- `pnpm build`: correcto. Tras la integración de audio, compilación de la web
  y comprobación de tipos de Vue repetidas y correctas.
- Los seis MP3 se han contrastado con sus transcripciones, hashes y parámetros.
  Se ha verificado la identidad de Baldo y la integridad de los seis MP3. Reproducción y pausa verificadas
  desde el navegador, en la integración inicial; tras cambiar de voz se han repetido las pruebas de archivos y transcripciones.
- El importador de imágenes se ha repetido sin descargar de nuevo las cartas y
  conserva los 56 registros de procedencia.

La compilación conserva avisos sobre el tamaño de paquetes y una fuente de iconos
que se resuelve en ejecución. No se ha auditado ni modificado ese subsistema.

### Cambio de voz solicitado

Las seis narraciones activas usan **Baldo - Husky, Mature and Alluring**
(`RnKqZYEeVQciORlpiCz0`), voz española peninsular verificada en la cuenta de
ElevenLabs. Los archivos terminan en `-baldo.mp3` para distinguirlos en la caché.
Las grabaciones anteriores de Carmelo y `zealot-narracion.json` se conservan como
respaldo; la aplicación ofrece las nuevas grabaciones de Baldo.

La actualización previa a la publicación se ha completado con `git pull --ff-only`,
tras comprobar que la base local coincidía con `origin/main`. Se excluyen de la
subida los adjuntos internos y los resultados temporales de comprobación.
