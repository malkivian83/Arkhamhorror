# 135 · Reacciones a fichas reveladas

Lote `token-triggers`: 21 códigos nuevos, 21 cartas o niveles distintos nuevos y 0 reediciones,
sobre `040b733e`. Capacidad `TOKEN_TRIGGERS` del [inventario 132](132-inventario-bloqueos-motor.md).
Fuentes EN/ES de ArkhamDB y SHA-256 en `packages/cards/src/token-triggers/approvals.json`;
conversión con `approvedDefinition` (`scripts/prepare-token-triggers.mjs`). Adaptadores revisados:
`reviewed-covenant-permanent-v1` (5 Acuerdos), `reviewed-token-exile-v1` (Golpe de suerte),
`reviewed-exceptional-v1` (Penique «de la suerte») y `reviewed-dual-faction-v1` (Nkosi Mabati).

| Código | Carta                     | Nivel | Tipo      |
| ------ | ------------------------- | ----- | --------- |
| 10131  | Estrella del alba         | 1     | Evento    |
| 02271  | Golpe de suerte           | 2     | Habilidad |
| 07036  | Amada                     | 0     | Habilidad |
| 07117  | Armagedón                 | 0     | Apoyo     |
| 07226  | Armagedón                 | 4     | Apoyo     |
| 07118  | Ojo del caos              | 0     | Apoyo     |
| 07227  | Ojo del caos              | 4     | Apoyo     |
| 07119  | Mortaja de sombras        | 0     | Apoyo     |
| 07228  | Mortaja de sombras        | 4     | Apoyo     |
| 07190  | Bendición de Isis         | 3     | Apoyo     |
| 07195  | Maldición de los eones    | 3     | Apoyo     |
| 07110  | Acuerdo sagrado           | 2     | Apoyo     |
| 07113  | Acuerdo blasfemo          | 2     | Apoyo     |
| 07116  | Acuerdo falso             | 2     | Apoyo     |
| 07120  | Acuerdo paradójico        | 2     | Apoyo     |
| 07122  | Acuerdo antiguo           | 2     | Apoyo     |
| 07224  | Penique «de la suerte»    | 2     | Apoyo     |
| 06285  | El gato negro             | 5     | Apoyo     |
| 10126  | Símbolo religioso         | 3     | Apoyo     |
| 10056  | Anteojos prismáticos      | 2     | Apoyo     |
| 08091  | Nkosi Mabati              | 3     | Apoyo     |

## Capacidad nueva del motor (aditiva)

Se apoya en la ventana «al revelar» con la ficha retenida (`skillTest.revealing`),
`CancelRevealedToken` y `TreatRevealedTokenAs` (lote 129), la reserva de Bendición/Maldición
(lote 130) y la vuelta de fichas en ST.8.

- `ReplaceRevealedTokenEffect`: sustituye los efectos de la ficha retenida (`effect`), solo su
  modificador (`modifier`) o anula su «revela otra ficha» (`noRevealAnother`).
- `ReturnTokensToBagAfterTest` (`skillTest.keepInBag`): esas Bendiciones/Maldiciones vuelven a la
  bolsa en ST.8 en lugar de a la reserva.
- `IgnoreRevealedTokenModifiers`: ignora los modificadores de fichas ya resueltas de una cara (sin
  repetir las ya ignoradas, `ignoredModifiers`); con `returnToBag`, además salen de la prueba y
  vuelven a la bolsa (si salen todas, la prueba se resuelve sin ficha).
- `CancelRevealedToken.toPool`: la Bendición/Maldición cancelada vuelve a la reserva.
- `RevealChaosToken.search`: busca esa ficha en la bolsa y la revela.
- `RemoveCommittedCard` (retirar de la partida o exiliar una carta comprometida) y `FlipCoin`.
- Disparador `afterRevealStep`: ventana de reacciones al final del paso ST.3, antes de las cartas que
  se comprometen tras revelar. Las habilidades forzadas también abren la ventana «al revelar».
- Mazos: «Límite de 1 [[Acuerdo]] por mazo» (`deck.problem.covenantLimit`).

## Reglas

- Armagedón, Ojo del caos y Mortaja de sombras: cada [curse] se resuelve al revelarse, por separado
  (FAQ de 2022); nivel 0, solo la primera. El efecto de Ojo del caos no depende del resultado (FAQ de
  2024). Mortaja mueve al Enemigo evitado no [[Elite]] a un Lugar conectado con el suyo.
- Acuerdo sagrado, Acuerdo paradójico y Estrella del alba se usan al final de ST.3, con todas las
  fichas reveladas (FAQ de Acuerdo sagrado y de Estrella del alba). Estrella del alba exige al menos
  una [curse] e inflige el daño al momento, uno por cada modificador ignorado.
- Golpe de suerte: se puede exiliar aunque haya salido [auto_fail]; la prueba falla igualmente (FAQ).
- Bendición de Isis / Maldición de los eones reaccionan solo a la segunda ficha de su tipo resuelta
  en la prueba. Maldición de los eones ofrece retirar las fichas al terminar la prueba.
  Si se declina, la primera Maldición sigue la regla normal y la segunda, cancelada, vuelve a la
  bolsa.
- Acuerdo blasfemo cambia solo el modificador: la [curse] sigue revelando otra ficha y vuelve a la
  bolsa. Acuerdo antiguo anula únicamente el «revela otra» de esa [bless].
- Penique «de la suerte» (obligatorio) solo en tus pruebas; robar 1 si una [bless] se trata como
  [curse]. Su efecto dura la prueba (FAQ de 2022).
- El gato negro: la sustitución es opcional y por ficha; el daño/horror es directo sobre él.
- Amada sustituye los efectos de la [bless] por un éxito automático, sin revelar otra, y la ficha
  vuelve a la bolsa.
- Símbolo religioso cuenta las [curse] y [auto_fail] resueltas; la repetición reutiliza la prueba
  original (como Vive y aprende). Su límite «una vez por prueba» se cubre con el agotamiento; no se
  impide que otra copia repita la misma prueba.
- Anteojos prismáticos: se decide si se agotan al revelarse la [curse]. La pista adicional forma
  parte del resultado de la investigación si tiene éxito.
- Nkosi Mabati: nombrar el sigilo al entrar en juego es opcional. El sigilo (cualquier ficha con símbolo salvo [elder_sign]) se guarda en el apoyo y se
  pierde al salir de juego; su reacción solo se ofrece en pruebas de habilidad y si el sigilo está en
  la bolsa. El sigilo se anota en el registro, no en la carta.

FAQ de ArkhamDB consultadas para los 21 códigos; tienen aclaraciones Golpe de suerte, Acuerdo
sagrado/paradójico, Ojo del caos (0 y 4), Armagedón/Mortaja (4), Penique y Estrella del alba.

## Bloqueadas (20 de las 41 de la capacidad)

- Sello del símbolo arcano (03312): ficha «virtual» que no sale de la bolsa ni vuelve en ST.8.
- Inspiración esotérica (05033, 60420): cancelar o repetir el efecto de otra carta [mystic]
  disparado por una ficha; no hay modelo de efectos pendientes con origen.
- Espejo de videncia (60406): adelantar ST.3 antes de comprometer cartas.
- Espécimen imposible (11039): Miríada con 3 copias en una ranura arcana.
- Apuntado preciso (08087): efecto duradero sobre la siguiente acción de combate con un apoyo
  [[Ranged]]/[[Firearm]] que trata varias fichas como «0».
- Diadema rota (10133): buscar entre las cartas vinculadas e intercambiarla por Diadema del
  crepúsculo (cartas vinculadas, `BONDED`).
- Con otra capacidad: Ajar 0/4 (`ENEMY_MODS`), Sexto sentido 0/4 (`LOC_ATTACH`), Ofuda
  (`ENEMY_MODS`), Manuscritos pnakóticos (`TEST_SOURCE`), Efecto mariposa, Grimorio críptico ×2 y
  Suerte diabólica (`PLAY_OTHER`), Ojo del djinn (`SKILL_SUB`), Sello de los arquetípicos
  (`BONDED`) y Oculus mortuum (`DMG_WINDOWS`).

## Verificación

49 casos de reglas (`rules.test.ts`), 6 del motor (`token-triggers.test.ts`) y 21 de
compra/inicio/presentación (`apps/web/src/game/token-triggers.test.ts`). Ver el resumen de
continuación para la suite, tipos, lint e imágenes. Sin navegador ni build.

Recuentos: 21 códigos incorporados; 21 cartas o niveles distintos nuevos; 0 reediciones.
Acumulado: 1396 jugables; 721 históricos pendientes, incluidos 346 estándar con impresión.
