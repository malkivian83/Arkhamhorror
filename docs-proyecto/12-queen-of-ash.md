# 12 · Escenario III: Queen of Ash (Brethren of Ash)

Implementado en `packages/cards/src/brethren-of-ash/queen-of-ash.ts`. Mismas fuentes
y criterios que los escenarios anteriores: valores de ArkhamDB, símbolos de las
localizaciones del proyecto de referencia, efectos descritos con palabras propias y
textos de historia resumidos.

## Preparación

- Fichas para el resto de la campaña según la dificultad: fácil, primigenio; normal,
  primigenio y tablilla; difícil, calavera, tablilla y primigenio; experto, sectario,
  tablilla, primigenio y calavera.
- Introducción 1 y, según el registro, la 2 (descubrieron el paradero de la secta) o
  la 3 (1 perdición en el plan).
- En juego: Underground Cistern, los cinco Sewer Tunnels barajados (sin saber cuál es
  cuál) y Sewer Culvert, donde empiezan todos. Sluice Control, apartada.
- "Recorrieron Arkham": cada investigador empieza con 1 pista. "Armaron un buen lío":
  1 Sectario por investigador (de Ashen Pilgrims y Cultists) en túneles distintos.
- Si mataron a Servant of Flame, sale del juego; si no, queda apartado. Con 3 o 4
  jugadores, 1 perdición más.
- Apartados: las 5 Fire!, Elokoss, Queen's Knight y Herald of Flame.

## Conexiones que cambian

Las localizaciones llevan símbolo y símbolos de conexión (y los de su cara sin
revelar): el motor recalcula las conexiones al revelar o poner en juego una
localización. Sin revelar, los cinco túneles conectan con la alcantarilla y la
cisterna; al revelarse, Overgrown Tunnels y Smuggler's Cache dejan de conectar con la
cisterna. Entrar en la cisterna (sin revelar) cuesta 3 pistas por investigador en
grupo, y en la compuerta, 1.

## Plan y acto

| Carta | Qué hace (resumen propio) |
|---|---|
| A Gathering (6) | Los enemigos en una localización con Fire! no reciben daño. Al avanzar: Servant of Flame (si está apartado) aparece en la cisterna; cada uno prueba [willpower] (4) o recibe 1 horror directo. |
| A Ritual (10) | Igual. Al avanzar, Elokoss despierta por su cara Mother of Flame (aparece en la cisterna si aún no estaba) y el plan y el acto pasan a ser **Brethren of Ash**: la perdición se convierte en 1 daño directo a cada investigador; derrotar a Elokoss lleva a la resolución 1. |
| Search the Sewers | Al entrar un investigador en la cisterna: aparece Elokoss (Faint Embers), ese investigador roba una Fire!, el resto de Fire!, Queen's Knight y Herald of Flame se barajan en el mazo y entra Sluice Control. |
| Stop the Rite | Rápida: gastar 1 pista por investigador en grupo para descartar el Fire! de tu localización. Al final de cada ronda, cada Sectario se mueve hacia la cisterna. Derrotar a Elokoss → resolución 1. |

## Elokoss

- **Faint Embers**: masiva, represalia, 5 + 5 por investigador de salud, no se mueve
  ni hace ataques de oportunidad. Rápida: gastar 1 pista por investigador para poner
  1 pista sobre ella; con 5 → **resolución 2**.
- **Mother of Flame**: cazadora, masiva, represalia. Tras evitarla se prepara y no te
  ataca el resto de la ronda.
- **Masivo** (motor): no se enfrenta; cuenta como enfrentado con todos los de su
  localización para luchar, evitar, atacar en la fase de enemigos y hacer ataques de
  oportunidad.

## Servant of Flame (A Willing Sacrifice)

Al derrotarlo, su códex depende del heraldo anotado en el escenario II: David Renfield
(jugar gratis un Tome o Spell del mazo), Cornelia Akely (curar 3 daño), Naomi
O'Bannion (5 recursos), Sgt. Earl Monroe (jugar gratis un Weapon del mazo), Abigail
Foreman (robar 3) o Margaret Liu (curar 3 horror), para cada investigador.

## Resoluciones

- **Sin resolución**: Elokoss renace; todos mueren y se pierde la campaña.
- **Resolución 1** (Elokoss derrotada) y **resolución 2** (5 pistas sobre Elokoss):
  experiencia de la zona de victoria + 5, 2 trauma físico y 2 mental, y se gana la
  campaña.
- **Resolución 3** (abrir la compuerta, [agility] o [combat] 5): mueren los que no se
  retiraron; los que se retiraron ganan la zona de victoria + 3 y sufren 3 trauma
  mental. Se gana la campaña.

## Simplificaciones

- La recompensa **Collector** (resoluciones 1 y 2) queda guardada en el navegador y
  se puede incluir al crear mazos nuevos: permanente, +5 al tamaño del mazo y 1 apoyo
  Relic o Charm de nivel 0–3 de cualquier clase; un mazo que la lleve sin haberla
  ganado no es válido.
- **Masivo** se aplica como se describe arriba; no se modelan los casos raros de
  enfrentamiento con efectos de cartas.
- Fire! daña también a los apoyos con salud (como en el escenario I).
- Los túneles se colocan en fila según el orden barajado; sin revelar, todos se ven
  iguales.

## Motor: lo nuevo para este escenario

Masivo, conexiones por símbolo, coste en pistas para entrar, inmunidad al daño por
plan, perdición en apoyos, la perdición que pasa a ser daño, actos con efectos
forzados, fin de ronda como disparador, perdición al aparecer (Zealot), curar
enemigos, enemigos que perdonan a un investigador, tipos de carta bloqueados
(Languor), descartar por tipo, matar investigadores para la campaña, cambiar de cara
un enemigo, saltar de acto, robar el primer enemigo del mazo de encuentros y buscar
un Sectario. Además, una prueba que empieza durante otra espera a que esta acabe.
