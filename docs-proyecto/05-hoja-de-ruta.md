# 05 · Hoja de ruta

Principio: **corte vertical primero**. Un escenario jugable de principio a fin
vale más que muchos sistemas a medias.

## Fase 0 · Decisiones y preparación

- [ ] Resolver las [dudas abiertas](07-dudas-abiertas.md) (licencia, stack, alcance, imágenes).
- [ ] Elegir nombre del producto (sin "Arkham Horror").
- [x] Mover el código original fuera del repositorio (p. ej. `E:\referencia\ArkhamHorror`).
- [ ] Guardar los PDF de reglas en `reglas/` (fuera de git).
- [ ] Crear el monorepo vacío, CI (lint + tests) y `docker-compose` con Postgres.

## Fase 1 · Motor mínimo (sin interfaz)

Objetivo: jugar **"The Gathering / La Reunión"** (caja básica) con 1 investigador
por consola o tests.

- [ ] Estado, cola de mensajes, RNG con semilla, serialización.
- [ ] Fases: mitos, investigación, enemigos, mantenimiento.
- [ ] Acciones básicas: investigar, mover, robar, recurso, jugar, combatir, evadir, enfrentarse, activar.
- [ ] Pruebas de habilidad completas (comprometer cartas, bolsa del caos, modificadores).
- [ ] Ventanas de tiempo, reacciones y efectos forzados.
- [ ] Acto/plan, localizaciones ocultas/reveladas, perdición, pistas.
- [ ] Cartas: los 5 investigadores básicos y sus mazos iniciales + encuentros del escenario 1.
- [ ] Suite de tests de reglas basada en el *Rules Reference*.

## Fase 2 · Jugable en navegador (local)

- [ ] Servidor con partida en memoria + WebSocket.
- [ ] Mesa de juego Vue: zonas, cartas renderizadas, fichas, preguntas.
- [ ] Interfaz en EN y ES.
- [ ] Deshacer última acción.

## Fase 3 · Plataforma

- [ ] Cuentas, mazos, lobby, partidas persistentes (event sourcing + instantáneas).
- [ ] Multijugador 1–4 jugadores, reconexión, espectador.
- [ ] Constructor de mazos con validación de reglas de construcción.
- [ ] Importar mazo desde ArkhamDB (si sus condiciones lo permiten).

## Fase 4 · Campaña

- [ ] Night of the Zealot completa (3 escenarios), registro de campaña, experiencia, mejoras de mazo, traumas.
- [ ] Niveles de dificultad.

## Fase 5 · Crecimiento

- [ ] Más ciclos/campañas, una a una, con sus tests.
- [ ] Editor de cartas propias (homebrew), herramientas de depuración.
- [ ] Despliegue en servidor propio.
