# Brethren of Ash: base estable de juego local

Fecha: 18/10/2026. Etiqueta de Git prevista: `brethren-of-ash-local-v1.0.0`.

Esta referencia fija el cierre técnico de Brethren of Ash para conservarlo antes
de ampliar La Gala. Incluye los tres escenarios, consulta de planes y actos por
ambas caras, guardado y recuperación, deshacer, correcciones de reglas y pruebas
de regresión. No incluye multijugador online.

## Evidencia que debe conservarse

- [Auditoría de cierre y sus límites](16-auditoria-cierre-brethren-of-ash.md).
- [Acta de verificación ampliada](evidencias/verificacion-aceptacion-ampliada.json):
  461 pruebas en 34 archivos, tipos de los seis proyectos, lint, formato y build.
- [Acta de interfaz](evidencias/interfaz-aceptacion-ampliada.json): 328 decisiones
  visibles, 44 de ellas con ventana de 390×640.
- [Reproducciones ampliadas](../packages/cards/src/brethren-of-ash/extended-playthrough.test.ts):
  nueve grabaciones con 1.052 decisiones; dos campañas enlazadas en normal.
- [Regresiones de reglas](../packages/cards/src/core-2026/acceptance-rules.test.ts):
  Masivo, Bodyguard, costes y movimiento por efectos.
- [Guardado y deshacer sobre partidas](../apps/web/src/game/session-playthrough.test.ts).

Las grabaciones aisladas de Smoke y Queen están identificadas como tales. No
sustituyen una campaña completa ni acreditan todas las combinaciones de cartas,
equipos y dificultades. La suite de CI reproduce estas pruebas en cada PR.

## Prueba física pendiente

El 18/10/2026 se volvió a consultar ADB y no había dispositivos conectados. La
aceptación adaptable está realizada; la aceptación en teléfono físico queda
abierta. Esta etiqueta no certifica gestos ni navegador de un dispositivo real.

Para cerrarla, registrar dispositivo, sistema y navegador, y comprobar:

1. Importar una campaña mediante Guardado y recuperación.
2. Desplazar y ampliar el mapa con gestos.
3. Jugar una carta y completar una prueba de habilidad.
4. Consultar anversos y reversos de planes y actos posteriores.
5. Recargar, terminar el escenario y verificar el resultado en el registro.

Adjuntar el acta y cualquier corrección en una versión posterior. No hace falta
modificar las grabaciones históricas para incorporar esa aceptación.

## Mantenimiento

Los cambios posteriores de motor o contenido deben conservar las pruebas y
grabaciones de esta base. Si una regla corregida invalida una grabación, explicar
el motivo y añadir una sustituta obtenida con decisiones legales; conservar la
referencia histórica en Git. La próxima auditoría funcional corresponde a La Gala.
