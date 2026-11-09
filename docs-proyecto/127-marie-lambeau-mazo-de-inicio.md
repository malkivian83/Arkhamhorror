# 127 · Marie Lambeau (mazo de inicio de investigador)

09/11/2026. Petición: incorporar el investigador [Marie Lambeau del mazo de inicio
de investigador](https://arkhamdb.com/set/mar) (`60451`, caja `mar`, códigos 60451–60483)
con su mazo completo, sin simplificar reglas.

## Alcance

`60451` es **otra carta de investigador**, distinta de la Marie Lambeau original de
El círculo roto (`05006`, lote `marie-lambeau`, mazo `marie`), con otras exclusivas y otras
opciones de construcción. Ambas se conservan: la original no cambia.

La caja reúne **33 códigos**. Había 23 jugables, implementados en lotes temáticos anteriores
(60456–60457, 60459–60468 y 60470–60479, 60481–60482). Este lote (`marie-lambeau-2025`)
incorpora **10 códigos jugables / 8 cartas o niveles distintos nuevos / 2 reediciones**:

| Código | Carta                                  | Tipo                            |
| ------ | -------------------------------------- | ------------------------------- |
| 60451  | Marie Lambeau, La intérprete           | Investigadora                   |
| 60452  | Amuleto de grand-mère                  | Exclusiva (Apoyo)               |
| 60453  | Llamada a Guinea                       | Debilidad exclusiva             |
| 60454  | Hematofobia                            | Debilidad básica                |
| 60458  | Muñeca sacrificial                     | Apoyo                           |
| 60473  | Desquite (2)                           | Evento                          |
| 60480  | Sacrificio definitivo (4)              | Evento                          |
| 60483  | Doblegar la sangre (5)                 | Evento                          |
| 60455  | Iniciada en lo arcano                  | Reedición de `01063`            |
| 60469  | Torrente de poder                      | Reedición de `03235`            |

Las dos reediciones tienen el mismo texto mecánico (comprobado con las huellas de
equivalencia de `approvals.json` y `reprint-sources.json`). Iniciada en lo arcano reutiliza el
comportamiento de `01063` enlazado a su código; Torrente de poder se registra en su propia
familia (`token-skills`), porque localiza su copia asignada por código.

El mazo inicial `marie2025` sigue la lista oficial: sus dos exclusivas, Hematofobia y dos
copias de cada carta de nivel 0 de la caja (60455–60469), 33 cartas en total (30 para el
tamaño del mazo). Construcción: Místico y neutrales 0–5.

## Reglas

- **Marie Lambeau.** [reacción] Después de que se coloque daño sobre ella (no cuenta el
  asignado a apoyos ni el horror): roba 2 cartas y descarta 1 de ellas, una vez por fase. Solo
  se ofrecen las cartas robadas que siguen en la mano y no son debilidades. Signo arcano: +0;
  si tiene éxito, se cura 1 punto de daño.
- **Amuleto de grand-mère.** [rápida] Coste: agotarlo y recibir 1 punto de daño directo (que
  activa la reacción de Marie). Repón 1 carga de un Apoyo de un investigador de su Lugar:
  reponer coloca cargas sin superar el valor impreso de «Usos». Sin un Apoyo que pueda
  reponerse no se ofrece (la capacidad debe poder cambiar el estado de la partida).
- **Llamada a Guinea.** En la zona de amenaza: su investigador no puede curarse daño (el
  horror sí). [acción] Elegir y descartar 3 cartas de la mano (las debilidades no pueden
  elegirse): se descarta. Requiere tener 3 cartas que puedan elegirse.
- **Hematofobia.** Obligado: la primera vez en cada ronda que un investigador de su Lugar
  recibe daño (colocado sobre el investigador), su dueño recibe 1 horror. [acción][acción]: se
  descarta.
- **Muñeca sacrificial.** No ocupa espacio de mano mientras a su controlador le queden 3 o
  menos de salud; si al curarse vuelve a ocuparlo, se comprueban los espacios. [reacción]
  Después de revelar una ficha distinta de [auto_fail] en una prueba propia, coste: recibir 1
  punto de daño (asignable) y agotarla. La ficha se cancela y queda fuera de la bolsa con las
  ignoradas; se revelan fichas hasta una de símbolo (calavera, sectario, tablilla, Primigenio,
  signo arcano, [auto_fail] o escarcha), que se resuelve; las numéricas se ignoran. Todas
  vuelven a la bolsa al terminar la prueba. Si no queda ninguna de símbolo, no se resuelve
  ninguna ficha.
- **Desquite.** Rápido, al atacar un Enemigo a un investigador del Lugar de Marie (también
  a ella). Marie recibe todo el daño y horror del ataque (puede asignarlo a sus apoyos y cuenta
  como recibido). Después del ataque, por cada punto recibido inflige 1 punto de daño a un
  Enemigo de su Lugar, elegido punto a punto. Si el ataque se cancela, no inflige nada.
- **Sacrificio definitivo.** Rápido, en la ventana de fin de la fase de Investigación. Se
  repite la fase completa; al acabar esa fase (tras su ventana de fin), Marie sufre 1 trauma
  físico y queda derrotada. Máximo de una vez por partida: las dos copias comparten el límite
  durante el escenario, como los demás «máximo por partida» del proyecto.
- **Doblegar la sangre.** Combatir con Voluntad, +3 y +1 al daño. Si tiene éxito, 1 punto de
  daño a cada otro Enemigo de su Lugar. Cada Enemigo al que haya infligido daño (el objetivo y
  los demás, comprobando que su daño haya aumentado) no puede atacar a Marie durante el resto
  de la ronda.

No hay FAQ ni erratas oficiales para estas cartas en la documentación consultada (FAQ 2.5A
del proyecto ni páginas de ArkhamDB). Las decisiones interpretativas quedan anotadas arriba:
«recibir daño» como daño colocado sobre el investigador (como en el resto del proyecto),
fichas de símbolo y alcance de «máximo por partida».

## Motor

Ampliaciones pequeñas y generales:

- `restricts.damageHealing` en traiciones de la zona de amenaza y `damageHealingBlocked`
  (`actions.ts`); `Heal` no cura daño si está bloqueado.
- `PlayerCardBehavior.slotFree`: el apoyo no ocupa sus espacios mientras se cumple; lo usan
  `slotsFit` y `slotOccupants`. `Heal` comprueba los espacios si cura daño a quien controla un
  apoyo así.
- Mensaje `RevealUntilSymbolToken` (cancelar la ficha retenida y revelar hasta un símbolo).
- Mensaje `RedirectEnemyAttackDamage` y campo `ResolveEnemyAttack.damageTo` (otro
  investigador recibe el daño y horror del ataque); `GameState.lastAttackDamage` registra lo
  que repartió la última asignación de un ataque enemigo (en el manejador de `Forced`).
- Claves de registro `log.tokenCanceledKept` y `log.tokenIgnored`.

## Presentación

Textos oficiales EN/ES de los 10 códigos (`scripts/present-marie-lambeau-2025.mjs`, idempotente)
y etiquetas nuevas de interfaz. Se conservan las marcas de la API española en la reedición de
Iniciada en lo arcano (`[free]`) y Torrente de poder (`?` como comodín), igual que sus originales.
El reverso en español nombra «Llamada de Guinea», como la API; la carta se llama «Llamada a Guinea».

Las dos Marie Lambeau comparten nombre y subtítulo («La intérprete»): la portada y el selector
de mazos muestran su edición (`investigator.editions`: El círculo roto / Mazo de inicio de
investigador). Según el reglamento, un equipo no puede incluir dos investigadores con el mismo
nombre: la portada lo impide con un aviso (`setup.sameInvestigator`); `newCampaign` y
`replaceInvestigator` comparan el título (`sameInvestigatorTitle`) y la sala en línea rechaza un mazo
cuyo investigador comparte título con el de otro jugador (`investigator_taken`). El paquete `mar` se añade
a `INVESTIGATOR_PACKS` (toda la caja), sin renovar la caché. No se han descargado imágenes:
escaneos, miniaturas y retrato quedan pendientes.

## Datos

`scripts/prepare-marie-lambeau-2025.mjs` reproduce `data/marie-lambeau-2025.json` desde el
inventario congelado `3c8ee4b5d8100766` (sin modificarlo) y las instantáneas de la API
([`mar` EN](https://arkhamdb.com/api/public/cards/mar.json) y
[`mar` ES](https://es.arkhamdb.com/api/public/cards/mar.json)), guardadas en `source-en.json` y
`source-es.json` con sus SHA-256 en `approvals.json`.

## Validación

- Pruebas del lote: `rules.test.ts` (17), `integration.test.ts` (6: mazo inicial válido, todos los
  códigos de la caja implementados, construcción, compras, campaña con debilidad básica real que
  empieza un escenario y las dos reediciones), `uniqueness.test.ts` (3),
  `scripts/cards-import/marie-lambeau-2025.test.mjs` (4) y presentación web (4).
- Áreas afectadas del motor y consumidores: suite del motor y 48 archivos de cartas (curación,
  espacios, ataques, fichas, Torrente de poder, Iniciada en lo arcano, Marie original) correctos;
  pruebas globales de catálogo, mazos, campañas e importación correctas (dos tiempos límite
  preexistentes de `approved.test.mjs` bajo carga pasaron al repetir solo ese archivo).
- Formato y lint de los archivos tocados; tipos del motor, de cartas y de la web correctos.
- `check-decklist` de la caja completa: 33 jugables, 0 pendientes.
- Revisión visual pendiente para la persona usuaria (portada con las dos Marie, reacción de
  Marie y Muñeca sacrificial en la mesa). Sin sesiones de navegador.
