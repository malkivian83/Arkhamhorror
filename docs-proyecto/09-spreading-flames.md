# 09 · Escenario I: Spreading Flames (Brethren of Ash)

Análisis para implementar el primer escenario de la caja básica de 2026.
Fuentes: guía de campaña y reglamento (`reglas/`, fuera de git), la base de
datos pública ArkhamDB (`core_2026`) para los valores numéricos y el proyecto
de referencia (`E:\referencia\ArkhamHorror`) para las conexiones y los valores
"por investigador". **No se copia el texto de las cartas**: aquí se describen sus
efectos con palabras propias para saber qué debe soportar el motor.

> Conviene comprobar los números con las cartas físicas, pero las tres fuentes coinciden.

## 1. Campaña: bolsa del caos por dificultad

Según la guía (página 2). Los símbolos del PDF son iconos; se identifican
porque la tarjeta de referencia de este escenario usa calavera, tablilla y
primigenio, de modo que la bolsa no lleva sectario:

| Dificultad | Fichas |
|---|---|
| Fácil | +1, +1, 0, 0, 0, −1, −1, −1, −2, −2, calavera ×2, tablilla, primigenio, fallo automático, signo arcano |
| Normal | +1, 0, 0, −1, −1, −1, −2, −2, −3, −4, calavera ×2, tablilla, primigenio, fallo automático, signo arcano |
| Difícil | 0, 0, 0, −1, −1, −2, −2, −3, −3, −4, −5, calavera ×2, tablilla, primigenio, fallo automático, signo arcano |
| Experto | 0, −1, −1, −2, −2, −3, −3, −4, −4, −5, −6, −8, calavera ×2, tablilla, primigenio, fallo automático, signo arcano |

Codificado en `packages/cards/src/brethren-of-ash/campaign.ts`.

## 2. Preparación (guía, página 3)

1. Reunir los conjuntos de encuentros: Spreading Flames, Miskatonic University,
   Ashen Pilgrims, Bystanders, Cosmic Evils, Eldritch Lore, Hallucinations,
   Mad Science y Fire!.
2. En juego solo **Your Friend's Room**; las demás localizaciones, apartadas.
3. Todos los investigadores empiezan en Your Friend's Room.
4. Apartar: las 5 copias de **Fire!**, el apoyo de historia **Dr. Henry
   Armitage** y el enemigo **Servant of Flame**.
5. Barajar el resto de cartas de encuentro como mazo de encuentros.

## 3. Cartas del escenario

### Plan (agenda)

| # | Nombre | Perdición | Qué hace (resumen propio) |
|---|---|---|---|
| 1 | Past Curfew | 3 | Acción de parlamento: prueba de intelecto (2) para descartar un Bystander de tu localización. Al avanzar: cada investigador prueba voluntad (3); quien falla, 1 horror |
| 2 | Lit Up | 5 | Mismo parlamento. Al avanzar: 4 Fire! apartados pasan al descarte de encuentros; cada investigador prueba agilidad (3); quien falla, 1 daño |
| 3 | Wild Flames | 10 | Mismo parlamento. Forzado: tras colocar perdición, el jefe roba el Fire! superior del descarte. Al avanzar: todos los investigadores que sigan en juego son derrotados (→ sin resolución, 1 trauma físico) |

### Acto

| # | Nombre | Pistas | Objetivo y efecto al avanzar (resumen propio) |
|---|---|---|---|
| 1 | Where There's Smoke… | 2 por investigador | Al final de la ronda, gastar pistas en grupo. Al avanzar: descartar enemigos; entran Dormitories y Miskatonic Quad; Servant of Flame aparece en Dormitories; un Fire! se une a Your Friend's Room y los demás van al descarte |
| 2 | Escape the Dorms | — | Avanza solo cuando todos los investigadores no derrotados están en Miskatonic Quad. Al avanzar: Servant of Flame se cura y se aparta; descartar enemigos; Your Friend's Room sale del juego; entran Orne Library, Science Hall y Warren Observatory |
| 3 | Searching for Dr. Armitage | 3 por investigador | Al final de la ronda, los investigadores **en Orne Library** gastan pistas. Al avanzar: Dr. Armitage entra bajo el control de un investigador (no ocupa ranura de aliado); Servant of Flame vuelve en Miskatonic Quad; 3 pistas por investigador en el Quad; el jefe busca y roba 1 Fire! por investigador |
| 4 | Blaze of Glory | — | Rápida: gastar 1 pista por investigador para hacer 1 daño por investigador a un enemigo de tu localización. Acción de **retirarse** (sin ataques de oportunidad). Avanza al derrotar a Servant of Flame → **Resolución 1** |

### Localizaciones

| Nombre | Símbolo | Conecta con | Velo | Pistas | Victoria | Habilidad (resumen propio) |
|---|---|---|---|---|---|---|
| Your Friend's Room | pica | Dormitories | 2 | 2 por inv. | — | Acción: un enemigo de una localización conectada viene y se enfrenta a ti (sin ataques de oportunidad) |
| Dormitories | triángulo | Your Friend's Room, Miskatonic Quad | 3 | 1 por inv. | — | Acción: curar 1 daño y 1 horror (una vez por partida) |
| Miskatonic Quad | cruz | Dormitories, Science Hall, Warren Observatory, Orne Library (y círculo/corazón, de otros escenarios) | 1 | 0 | — | Rápida, en tu turno, con 1 o 2 investigadores en la partida: moverse a una conexión (límite de grupo una vez por ronda) |
| Science Hall | reloj de arena | Miskatonic Quad | 2 | 1 por inv. | 1 | Forzado: tras descubrir pistas aquí, descartas 1 carta de tu mano |
| Warren Observatory | cuadrado | Miskatonic Quad | 3 | 1 por inv. | — | Reacción: tras descubrir pistas aquí, robas 1 carta (una vez por ronda) |
| Orne Library | rombo | Miskatonic Quad | 4 | 1 por inv. | 1 | Acción doble: robar 3 cartas (una vez por partida) |

Mapa: Your Friend's Room — Dormitories — Miskatonic Quad, y el Quad es el centro
del que salen Science Hall, Warren Observatory y Orne Library.

### Enemigos

| Nombre | Copias | Combate | Salud | Evasión | Daño | Horror | Palabras clave / efectos |
|---|---|---|---|---|---|---|---|
| Servant of Flame | 1 | 4 | 5 por inv. | 4 | 2 | 2 | Élite, cazador, presa (menor agilidad), represalia, victoria 2 |
| Cantor of Flame | 2 | 2 | 2 | 2 | 1 | 0 | Represalia |
| Hellhound | 2 | 2 | 3 | 4 | 1 | 1 | Cazador; forzado: tras atacarte en la fase de enemigos, descartas un apoyo |
| Bystander | 3 | 1 | 1 | 1 | 1 | 0 | Condenado (al ser derrotado, 1 perdición) |
| Mutated Experiment | 2 | 3 | 3 | 3 | 1 | 1 | Forzado: al ser derrotado, 1 horror a cada investigador de su localización |

### Traiciones

| Nombre | Copias | Efecto (resumen propio) |
|---|---|---|
| Cosmic Evils | 3 | Peligro. Eliges: 1 perdición en el plan, o 1 daño directo + 1 horror directo y oleada |
| Unspeakable Truths | 2 | Se queda en tu zona de amenaza (máx. 1). Forzado: tras descubrir pistas, 1 horror. Acción doble: descartarla |
| Forbidden Secrets | 2 | Sin pistas → oleada. Si no, prueba de intelecto (3): por cada punto de fallo, dejas 1 pista en tu localización o recibes 1 horror |
| Extraplanar Visions | 2 | Prueba de voluntad o intelecto (X = cartas en mano). Si fallas: 1 daño y descartas 1 carta al azar |
| Wild Compulsion | 2 | Prueba de voluntad (3): por cada punto de fallo, descartas 1 carta al azar o pierdes 1 recurso |
| Fire! | 5 (apartadas) | Se une a la localización más cercana sin Fire!. Forzado: al terminar la fase de investigación, 1 daño directo a cada carta no Élite con salud en esa localización. Acción: prueba de agilidad (3) para descartarla |
| Noxious Smoke | 2 | Prueba de voluntad o agilidad (3): 1 daño por cada punto de fallo |
| Mutated! | 2 | Prueba de voluntad (2), +2 de dificultad si hay un enemigo en tu localización. Si fallas: 2 daño, o 1 horror a cada investigador de tu localización |

### Tarjeta de referencia

| Ficha | Fácil / Normal | Difícil / Experto |
|---|---|---|
| Calavera | −X, X = número del acto actual | −X, X = número del acto actual + 1 |
| Tablilla | −1; revela otra ficha; si fallas, 1 daño | −2; revela otra ficha; si fallas, 1 daño |
| Primigenio | −3; si fallas por 2 o más, robas el Fire! superior del descarte | −4; si fallas, robas el Fire! superior del descarte |

### Apoyo de historia

Dr. Henry Armitage (aliado único, salud 3, cordura 3; iconos de voluntad, intelecto y comodín): +1 voluntad y +1
intelecto; tu primera acción de cada ronda no provoca ataques de oportunidad.

## 4. Resoluciones (guía, página 4)

| Resultado | Efectos de campaña |
|---|---|
| Sin resolución | Se anota que la universidad ardió; 1 trauma mental cada uno; experiencia por victoria + 2 |
| Resolución 1 | Se anota que derrotasteis a vuestro perseguidor; un investigador obtiene a Dr. Armitage; experiencia por victoria + 3; el grupo elige → Resolución 2 o 3 |
| Resolución 2 | Se anota que salvasteis la universidad; +1 experiencia y 1 trauma físico cada uno |
| Resolución 3 | Se anota que la universidad ardió; 1 trauma mental cada uno |

## 5. Lo que tiene que aprender el motor

Ordenado de lo más básico a lo más específico:

1. **Pruebas iniciadas por efectos** (no por acciones): elegir entre dos
   habilidades, dificultad calculada, "por cada punto de fallo".
2. **Efectos de las fichas del caos**: modificador variable, revelar otra
   ficha, consecuencias al fallar.
3. **Traiciones**: revelación, oleada, peligro, quedarse en la zona de amenaza
   o unirse a una localización, límite por investigador.
4. **Elecciones del jugador** dentro de efectos ("eliges: A o B", cartas al azar).
5. **Daño/horror directo, curar, perder recursos, descartar cartas**.
6. **Habilidades activadas** en localizaciones, plan, acto y traiciones:
   acción simple/doble, rápidas, límites (por ronda, por partida, de grupo),
   parlamento y retirarse (sin ataques de oportunidad).
7. **Habilidades forzadas y reacciones** con sus ventanas de tiempo: tras
   descubrir pistas, al terminar la fase de investigación, tras colocar
   perdición, tras atacar en la fase de enemigos, al ser derrotado.
8. **Efectos al avanzar plan y acto**: zona de cartas apartadas, poner y quitar
   localizaciones, aparecer enemigos apartados, descartar enemigos, buscar en
   el mazo de encuentros, colocar pistas.
9. **Objetivos de acto** con condiciones: en una localización concreta, todos
   en una localización, enemigo derrotado.
10. **Palabras clave**: presa (menor agilidad), condenado, Élite; "descartar"
    frente a "derrotar".
11. **Retirarse**, apoyos en juego y el apoyo de historia.
12. **Victoria en localizaciones** (sin pistas al final → zona de victoria).
13. **Resoluciones y registro de campaña**: experiencia, trauma, notas.
14. Además: **los 5 mazos iniciales** y las habilidades de los investigadores
    (Daniela Reyes, Joe Diamond, Trish Scarborough, Dexter Drake,
    Isabelle Barnes), que también son cartas de este producto.

## 6. Datos

Completos para la preparación del escenario. Faltan, para más adelante, los
5 mazos iniciales y las cartas de jugador (ver la lista del reglamento, página 24).
