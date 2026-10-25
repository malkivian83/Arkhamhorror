# 86 · Lola Hayes

25/10/2026. Petición: completar El camino a Carcosa con Lola Hayes, la investigadora
propia de Se cierra el telón. Procedimiento general en la
[guía 59](59-guia-importar-lista-arkhamdb.md); no parte de una lista de ArkhamDB.

## Recuento

Lote `lola-hayes`: **3 códigos / 3 cartas distintas nuevas / 0 reediciones**: 03006 Lola
Hayes, 03018 Improvisación y 03019 Crisis de identidad. Solo la versión original y sus
exclusivas primarias; las alternativas 90087, 90092 y 90093 quedan fuera.

## Reglas

- **Lola Hayes.** Obligado tras robar la mano inicial (después del mulligan): elige un
  papel (Superviviente, Guardián, Buscador, Rebelde, Místico o neutral). Solo puede jugar,
  comprometer o activar capacidades de cartas neutrales o de su papel (las multiclase, si
  alguna de sus clases coincide). La restricción se aplica a sus cartas de jugador; las de
  encuentro no tienen clase. [fast]: cambia de papel (una vez por ronda). Signo arcano: +2 y
  puede cambiar de papel (o mantenerlo).
- **Construcción.** 35 cartas: las cinco clases de nivel 0–3 y neutrales de 0–5, con al
  menos 7 cartas de cada una de 3 clases distintas. Exige 2 Improvisaciones y 2 Crisis de
  identidad (un código repetido en `signatures` exige esas copias) y una debilidad básica.
- **Improvisación.** Rápido, solo en tu turno: cambias de papel, la siguiente carta de tu
  papel que juegues en este turno cuesta 3 menos y robas 1 carta.
- **Crisis de identidad.** Revelación: descarta los apoyos de tu papel actual que controlas
  (no los permanentes), después la primera carta de tu mazo; tu papel pasa a ser la clase de
  esa carta (neutral si es una Debilidad).
- **Se cierra el telón.** Si Lola está en la campaña, se lee su prólogo y empieza en los
  Bastidores; los demás, en el Teatro.

## Motor

- `Investigator.role`, mensajes `SetRole` y `SetNextRoleDiscount`, y
  `Investigator.nextRoleDiscount` (Improvisación) en `cardCost`.
- `InvestigatorBehavior.afterOpeningHand` y `canUseCard`, con `cardAllowed` aplicado al
  jugar cartas (acción, reacciones desde la mano y cartas al fallar), al comprometer y al
  activar capacidades de apoyos (acción, rápidas, reacciones y ventana de prueba).
- `ScenarioDefinition.investigatorStartingLocations` para que un investigador empiece en
  otro Lugar.
- Construcción: `classMinimum` en la definición del investigador y el problema
  `deck.problem.classMinimum`.

## Presentación y recursos

Textos EN/ES en `offlineCard`; el catálogo en línea añade el paquete `ptc` filtrado a los tres
códigos (caché `v6`). Doce escaneos oficiales EN/ES (Lola por las dos caras, Improvisación y
Crisis de identidad), sus miniaturas y el retrato `/local-assets/setup/03006.jpg`;
procedencia, tamaños y SHA-256 en `evidencias/lola-recursos-oficiales.json`. La mesa
muestra el papel actual junto a su nombre. Mazo inicial: 8 cartas de Guardián, 8 de Buscador
y 8 de Superviviente de la caja de 2026 y 11 neutrales, con sus exclusivas y la debilidad
básica Wounded (12104).

## Validación

- 17 pruebas del lote: elección de papel, restricciones al jugar, comprometer y activar,
  cambio de papel y signo arcano, Improvisación (turno, descuento y robo), Crisis de
  identidad (descartes y nuevo papel, debilidad → neutral), construcción (mazo inicial,
  mínimo por clases, copias de exclusivas, mejoras) y Se cierra el telón con Lola.
- Pruebas existentes de mazos iniciales generalizadas al tamaño de cada investigador.
- Revisión visual: Lola en la pantalla de nueva partida con su retrato y, en la mesa, en los
  Bastidores con «Papel: Buscador» y su capacidad de cambiar de papel.
