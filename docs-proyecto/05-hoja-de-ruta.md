# 05 · Hoja de ruta

Principio: **corte vertical primero**. Un escenario jugable de principio a fin
vale más que muchos sistemas a medias.

Referencia de reglas: el reglamento de la **nueva caja básica (2026)**, cuya
campaña es **Brethren of Ash** y cuyo primer escenario es **"Spreading Flames"**
(investigadores: Daniela Reyes, Joe Diamond, Trish Scarborough, Dexter Drake,
Isabelle Barnes). Sustituye a Night of the Zealot como contenido inicial.

**Estado actualizado el 19/10/2026:** Arkham Online cuenta con motor y mesa local,
la campaña Brethren of Ash con cierre técnico, La Gala jugable con aceptación
pendiente, cuentas y bibliotecas privadas con MySQL, y herramientas de despliegue
de web y API en Plesk. Implementación y aceptación se distinguen en la tabla.

| Área | Estado y evidencia |
| --- | --- |
| Brethren of Ash | Tres escenarios cerrados para juego local; dos campañas completas con equipos distintos en normal. Ver [auditoría 16](16-auditoria-cierre-brethren-of-ash.md) y [base estable](17-version-estable-brethren-of-ash.md). |
| La Gala | Fases 1–3 completadas, 20 de 21 trabajos: G18 cerrado y G17 pendiente de victorias completas. Contratos principales de 62 códigos, caras y persistencia especial verificados. Faltan las partidas e interfaz de fase 4 y la publicación de fase 5. Ver [auditoría 18](18-auditoria-cierre-la-gala.md). La cuenta de trabajos no representa un porcentaje de finalización. |
| Cuentas y guardado remoto | Implementados con biblioteca privada, revisiones y sincronización. Ver [documento 22](22-implementacion-cuentas-mysql.md). No equivalen a multijugador online. |
| Despliegue | Workflow y paquete completo para Plesk implementados, incluidas correcciones de rutas API. Ver [guía 23](23-despliegue-plesk.md). La verificación operativa del servidor se registra por separado. |
| Teléfono físico | Pendiente y diferido por el propietario; las comprobaciones adaptables disponibles usan una ventana de 390×640. |

## Fase 0 · Decisiones y preparación

- [ ] Completar las decisiones y comprobaciones aún abiertas del [registro de decisiones](07-dudas-abiertas.md), especialmente operación y apertura al público.
- [x] Elegir nombre del producto: **Arkham Online**, incorporado en la interfaz.
- [x] Mover el código original fuera del repositorio (copia actual: `D:\referencia\ArkhamHorror-main`).
- [x] Disponer de los reglamentos y guías en `docs-proyecto/reglas/` (ver su [inventario](reglas/README.md)).
- [x] Conseguir la guía de campaña de Brethren of Ash (preparación y resoluciones de los escenarios).
- [x] Conexiones de las localizaciones de Spreading Flames (tomadas del proyecto de referencia).
- [x] Crear el monorepo, CI y `docker-compose`; la base de cuentas actual usa MySQL 8.4, con comprobaciones también para MariaDB.

## Fase 1 · Motor mínimo

Objetivo: jugar **"Spreading Flames"** con 1–4 investigadores.
Estado detallado del motor: [08-motor.md](08-motor.md).

- [x] Estado, cola de mensajes, RNG con semilla, serialización.
- [x] Ronda: mitos (salvo ronda 1), investigación, enemigos, mantenimiento.
- [x] Turnos: el grupo elige el orden; 3 acciones; terminar turno.
- [x] Acciones básicas: robar, recurso, moverse, investigar, luchar, evadir, enfrentarse.
- [x] Ataques de oportunidad.
- [x] Prueba de habilidad: bolsa del caos, símbolos, fallo automático, resultados.
- [x] Enemigos: aparición, enfrentamiento, cazador, distante, represalia, alerta, victoria.
- [x] Daño/horror, derrota y eliminación.
- [x] Plan (perdición) y acto (pistas, en cualquier momento o al final de la ronda).
- [x] Mantenimiento: preparar, robar, recurso, límite de mano.
- [x] Comprometer cartas a pruebas de habilidad, también otros investigadores de la misma localización (1 carta cada uno).
- [x] Jugar cartas (apoyos y eventos), recursos, ranuras, usos, asignar daño a apoyos.
- [x] Traiciones en el mazo de encuentros (revelación, peligro, oleada, colocación).
- [x] Pruebas exigidas por efectos y efectos de las fichas de escenario.
- [x] Habilidades forzadas (primeras ventanas).
- [x] Habilidades activadas y rápidas, con límites; parlamento y retirarse.
- [x] Ventanas de reacción necesarias para las cartas del contenido actual (eventos "cuando…/tras…").
- [x] Habilidades de los cinco investigadores y efectos completos de su signo arcano.
- [x] Palabras clave: presa, condenado.
- [x] Patrulla, Masivo y Esquivo para el contenido implementado; regresiones de enfrentamiento implícito de Masivo.
- [x] Análisis de "Spreading Flames": [09-spreading-flames.md](09-spreading-flames.md).
- [x] Bolsas del caos de Brethren of Ash por dificultad.
- [x] Cartas de encuentro de "Spreading Flames": datos, revelaciones, forzados y tarjeta de referencia.
- [x] "Spreading Flames": planes, actos, localizaciones, Dr. Armitage y resoluciones de campaña.
- [x] Datos de las 104 cartas de jugador (sin texto) y los 5 mazos iniciales.
- [x] Efectos de las 104 cartas de jugador, debilidades y habilidades de investigador; contratos principales y regresiones dirigidas, con los límites de cobertura de la auditoría.

## Fase 2 · Jugable en navegador (local)

- [x] Demo jugable en el navegador con un escenario inventado (EN/ES).
- Fuera del alcance local: servidor de partidas y WebSocket.
- [x] Mesa de juego: mapa con conexiones, plan/acto/mazos/bolsa, zona de cada investigador, mano jugable, registro, opciones con clic sobre la mesa, imágenes servidas desde nuestra web con plantilla de respaldo, partida guardada en el navegador.
- [x] Deshacer paso, acción, turno y ronda, también después de recargar.
- [x] Guardado validado, copia previa, importación/exportación y diagnóstico local.

## Fase 3 · Plataforma

- [x] Cuentas: registro, verificación de correo, acceso, recuperación y vinculación con Google; integración real de correo y Google pendiente de acreditar en producción.
- [x] Bibliotecas privadas de mazos y campañas, revisiones recuperables, importación de datos de invitado y sincronización con MySQL.
- Fuera del alcance actual: lobby, multijugador online, reconexión a partidas compartidas y espectador. El motor se ejecuta en el navegador.
- [x] Constructor de mazos con validación de reglas de construcción (en el navegador).
- [x] Importar mazo desde ArkhamDB (API pública, mazos publicados o compartidos).

## Fase 4 · Campaña

- [x] Registro de campaña, experiencia, traumas y mejoras de mazo (entre escenarios).
- [x] Cartas de nivel 1–5 de la caja básica.
- [x] Escenario II: Smoke and Mirrors ([11-smoke-and-mirrors.md](11-smoke-and-mirrors.md)).
- [x] Escenario III: Queen of Ash ([12-queen-of-ash.md](12-queen-of-ash.md)). Brethren of Ash completa.
- [x] Recompensa Collector en los mazos.
- [x] Niveles de dificultad (bolsas del caos).

- [x] Implementación del escenario independiente: La gala del ecuador del invierno ([14-la-gala.md](14-la-gala.md)), con fases 1–3 completadas.
- [x] Contratos principales de los 62 códigos y caras, cinco interludios, veinte parejas de facciones, trece tareas de puntuación, umbrales de XP, recompensas R1 y persistencia en ventanas especiales. Son mesas dirigidas, sin afirmar exhaustividad ni victorias completas.
- [x] Respaldo completo de datos y resúmenes de Gala EN/ES, con fallo de carga, respuesta parcial, cambio de idioma y recursos ausentes (G18). Las imágenes locales ya estaban incorporadas.
- [ ] Partidas completas de La Gala: una victoria legal por cada facción y dos equipos en normal (parte restante de G17).
- [ ] Aceptación visual de Gala EN/ES en escritorio y ventana móvil, comprobaciones finales y etiqueta estable propia. El modo historia secundaria dentro de otra campaña queda fuera de este cierre.
- [x] Pasos de las fases en pantalla y textos oficiales en español.

## Fase 5 · Crecimiento

- [ ] Más campañas, una a una, con sus tests.
- [ ] Editor de cartas propias (homebrew), herramientas de depuración.
- [x] Preparar despliegue de web y API en servidor propio mediante Plesk, con migraciones y alta del administrador.
- [ ] Registrar la aceptación operativa en producción: salud de API y base, cuentas, correo real, Google si se habilita, sincronización entre dispositivos, copias externas y ensayo de restauración. Ver [límites operativos](22-implementacion-cuentas-mysql.md#guardados-límites-y-operación).

## Siguiente bloque de desarrollo

La prioridad es la **fase 4 de La Gala: partidas completas e interfaz**.
La fase 3 de contenido y persistencia queda verificada dentro de su alcance de
contratos principales; las mesas dirigidas no sustituyen victorias legales.
Después sigue el cierre de publicación de la fase 5. Los criterios concretos están en la
[auditoría de Gala](18-auditoria-cierre-la-gala.md#fases-y-puertas-de-cierre).
Las pruebas en teléfono físico siguen abiertas por separado; no bloquean el
trabajo de código y aceptación en escritorio.
