# 05 · Hoja de ruta

Principio: **corte vertical primero**. Un escenario jugable de principio a fin
vale más que muchos sistemas a medias.

Referencia de reglas: el reglamento de la **nueva caja básica (2026)**, cuya
campaña es **Brethren of Ash** y cuyo primer escenario es **"Spreading Flames"**
(investigadores: Daniela Reyes, Joe Diamond, Trish Scarborough, Dexter Drake,
Isabelle Barnes). Sustituye a Night of the Zealot como contenido inicial.

**Estado actualizado el 18/10/2026:** motor, mesa local y los tres escenarios implementados; cierre técnico y aceptación ampliada en la [auditoría 16](16-auditoria-cierre-brethren-of-ash.md). Se han reproducido campañas completas con dos equipos en normal. La comprobación en teléfono físico sigue sin realizarse; las pruebas móviles disponibles usan una ventana de 390×640. Las decisiones de nombre y publicación de la fase 0 no bloquean el juego local.

## Fase 0 · Decisiones y preparación

- [ ] Resolver las [dudas abiertas](07-dudas-abiertas.md) (alcance, imágenes, textos).
- [ ] Elegir nombre del producto (sin "Arkham Horror").
- [x] Mover el código original fuera del repositorio (copia actual: `D:\referencia\ArkhamHorror-main`).
- [x] Guardar el reglamento en `reglas/` (incluido en git: repositorio privado).
- [x] Conseguir la guía de campaña de Brethren of Ash (preparación y resoluciones de los escenarios).
- [x] Conexiones de las localizaciones de Spreading Flames (tomadas del proyecto de referencia).
- [x] Crear el monorepo, CI (lint + tests) y `docker-compose` con Postgres.

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
- [x] Mesa de juego: mapa con conexiones, plan/acto/mazos/bolsa, zona de cada investigador, mano jugable, registro, opciones con clic sobre la mesa, imágenes de ArkhamDB al vuelo con plantilla de respaldo, partida guardada en el navegador.
- [x] Deshacer paso, acción, turno y ronda, también después de recargar.
- [x] Guardado validado, copia previa, importación/exportación y diagnóstico local.

## Fase 3 · Plataforma

- Fuera del alcance solicitado: cuentas, lobby, multijugador online, reconexión y espectador.
- [x] Constructor de mazos con validación de reglas de construcción (en el navegador).
- [x] Importar mazo desde ArkhamDB (API pública, mazos publicados o compartidos).

## Fase 4 · Campaña

- [x] Registro de campaña, experiencia, traumas y mejoras de mazo (entre escenarios).
- [x] Cartas de nivel 1–5 de la caja básica.
- [x] Escenario II: Smoke and Mirrors ([11-smoke-and-mirrors.md](11-smoke-and-mirrors.md)).
- [x] Escenario III: Queen of Ash ([12-queen-of-ash.md](12-queen-of-ash.md)). Brethren of Ash completa.
- [x] Recompensa Collector en los mazos.
- [x] Niveles de dificultad (bolsas del caos).

- [x] Escenario independiente: La gala del ecuador del invierno ([14-la-gala.md](14-la-gala.md)).
- [x] Pasos de las fases en pantalla y textos oficiales en español.

## Fase 5 · Crecimiento

- [ ] Más campañas, una a una, con sus tests.
- [ ] Editor de cartas propias (homebrew), herramientas de depuración.
- [ ] Despliegue en servidor propio.
