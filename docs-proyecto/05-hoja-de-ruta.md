# 05 · Hoja de ruta

Principio: **corte vertical primero**. Un escenario jugable de principio a fin
vale más que muchos sistemas a medias.

Referencia de reglas: el reglamento de la **nueva caja básica (2026)**, cuya
campaña es **Brethren of Ash** y cuyo primer escenario es **"Spreading Flames"**
(investigadores: Daniela Reyes, Joe Diamond, Trish Scarborough, Dexter Drake,
Isabelle Barnes). Sustituye a Night of the Zealot como contenido inicial.

## Fase 0 · Decisiones y preparación

- [ ] Resolver las [dudas abiertas](07-dudas-abiertas.md) (alcance, imágenes, textos).
- [ ] Elegir nombre del producto (sin "Arkham Horror").
- [x] Mover el código original fuera del repositorio (`E:\referencia\ArkhamHorror`).
- [x] Guardar el reglamento en `reglas/` (fuera de git).
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
- [ ] Comprometer cartas a pruebas de habilidad (paso 2).
- [ ] Jugar cartas (apoyos y eventos), recursos, ranuras.
- [x] Traiciones en el mazo de encuentros (revelación, peligro, oleada, colocación).
- [x] Pruebas exigidas por efectos y efectos de las fichas de escenario.
- [x] Habilidades forzadas (primeras ventanas).
- [ ] Habilidades activadas, reacciones (⟲) y acciones rápidas (⚡); parlamento y retirarse.
- [ ] Habilidades de investigador y efecto de su signo arcano.
- [x] Palabras clave: presa, condenado.
- [ ] Palabras clave restantes: patrulla, masivo, esquivo.
- [x] Análisis de "Spreading Flames": [09-spreading-flames.md](09-spreading-flames.md).
- [x] Bolsas del caos de Brethren of Ash por dificultad.
- [x] Cartas de encuentro de "Spreading Flames": datos, revelaciones, forzados y tarjeta de referencia.
- [ ] "Spreading Flames": efectos de plan y acto, resto de localizaciones y sus habilidades, Dr. Armitage, resoluciones.
- [ ] Los 5 mazos iniciales y las habilidades de los investigadores.

## Fase 2 · Jugable en navegador (local)

- [x] Demo jugable en el navegador con un escenario inventado (EN/ES).
- [ ] Servidor con partida en memoria + WebSocket.
- [ ] Mesa de juego Vue: zonas, cartas renderizadas, fichas, preguntas.
- [ ] Deshacer última acción.

## Fase 3 · Plataforma

- [ ] Cuentas, mazos, lobby, partidas persistentes (event sourcing + instantáneas).
- [ ] Multijugador 1–4 jugadores, reconexión, espectador.
- [ ] Constructor de mazos con validación de reglas de construcción.
- [ ] Importar mazo desde ArkhamDB (si sus condiciones lo permiten).

## Fase 4 · Campaña

- [ ] Brethren of Ash completa: registro de campaña, experiencia, mejoras de mazo, traumas.
- [ ] Niveles de dificultad (bolsas del caos).

## Fase 5 · Crecimiento

- [ ] Más campañas, una a una, con sus tests.
- [ ] Editor de cartas propias (homebrew), herramientas de depuración.
- [ ] Despliegue en servidor propio.
