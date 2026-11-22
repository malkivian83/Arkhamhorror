# 167 · Finn Edwards y Calvin Wright

Dos investigadores seleccionables con sus mazos oficiales FFG, cinco exclusivas
y debilidades, presentación EN/ES y recursos oficiales. **Siete códigos nuevos,
siete diseños, cero cartas estándar nuevas y cero reediciones.** Los códigos
04003, 04010–04012, 04005 y 04015–04016 quedan contabilizados en el lote
`finn-calvin`; no volver a importarlos al preparar otras listas.

## Reglas revisadas

- Finn recibe una acción adicional de evitar cada turno, sin poder gastarla en
  otras acciones. El signo arcano cuenta los enemigos agotados de todos los
  lugares; ofrece una pista en su lugar únicamente con éxito por dos o más.
- Artículos de contrabando exige que no haya enemigos preparados en su lugar.
  Permite buscar una carta Ilícita de cualquier tipo en el descarte o entre las
  nueve primeras del mazo y **robarla**, con sus ventanas de robo. Buscar en el
  mazo baraja también el evento que se está resolviendo, aunque no encuentre
  carta; buscar en el descarte lo deja descartado. La carta en resolución no
  forma parte del descarte y los bloqueos de descarte siguen aplicándose.
- Fiel .38 de Finn es Rápido, consume una de sus tres municiones y concede +2 a
  combate. El daño adicional depende de que el enemigo no esté enfrentado a
  Finn, incluyendo enemigos enfrentados a otro investigador. Respeta Indiferente.
- Su debilidad prepara los enemigos locales y de lugares conectados, con sus
  restricciones y enfrentamientos. Mueve hacia Finn los Cazadores de lugares
  conectados, incluso enfrentados o todavía agotados. Solo un movimiento real
  evita que la debilidad vuelva al mazo; preparar un enemigo no basta.
- Calvin añade su horror a voluntad e intelecto y su daño a combate y agilidad.
  Es un modificador constante, no una sustitución del valor base. Cambia cuando
  recibe o cura puntos y conserva el modificador al sustituir la habilidad base.
- Su signo arcano permite curar un daño o un horror, recibir un daño directo o
  un horror directo, o no hacer nada. No ofrece curar un tipo sin puntos.
- Hasta el final del tiempo puede recibir daño y horror directos de su
  controlador. Los apoyos normales y los de otros investigadores no adquieren
  ese permiso. Puede recibir ambos tipos en el mismo grupo de asignación antes
  de comprobar su derrota; el exceso va al investigador normalmente.
- Voz del mensajero obliga a elegir daño/trauma físico u horror/trauma mental.
  Asignar el punto directo al apoyo no evita el trauma. El registro de campaña
  conserva el trauma incluso cuando el punto derrota a Calvin.
- Construcción: Finn admite Ilícitas 0–5, Rebelde 0–3, Neutral 0–5 y hasta cinco
  otras cartas Buscador/Superviviente de nivel cero. Calvin admite
  Superviviente/Neutral 0–5 y Espíritu 0–3. Se respetan las cartas multiclase;
  las exclusivas no aparecen en las compras ordinarias.

## Listas y presentación

Listas exactas archivadas de [Finn, FFG 38677](https://arkhamdb.com/decklist/view/38677)
y [Calvin, FFG 38679](https://arkhamdb.com/decklist/view/38679), procedentes de la
[guía oficial FFG v7](https://images-cdn.fantasyflightgames.com/filer_public/37/6a/376abfdd-decf-4b0c-a5be-d1b601da428d/ahc_decklists_v7.pdf).
Solo el marcador 01000 se sustituye por la debilidad básica 12104, como en los
mazos anteriores. No se modifican las demás cantidades ni códigos.

Las fuentes EN/ES y sus huellas están en `packages/cards/src/finn-calvin/`;
el generador revisado es `scripts/prepare-finn-calvin.mjs`. Dieciocho escaneos,
dieciocho miniaturas y dos retratos nuevos, con
[procedencia y huellas](evidencias/finn-calvin-recursos-oficiales.json).
Miniaturas españolas representativas revisadas en el visor local, sin navegador.
Changelog actualizado y caché de cartas v19.

Las pruebas comprueban las reglas, conexiones con daño/asignación/robo,
construcción, registro único entre lotes, fuentes, presentación EN/ES,
mazos exactos, comienzo de campaña y decisiones guardadas/restauradas.
Los controles finales se registran únicamente en el resumen de continuación.
El diagnóstico CLI conserva el bloqueo SSR previamente documentado; no se
repite sin una hipótesis nueva ni se declara superado. La integración usa el
registro real y valida ambas listas completas.

Tras el lote: **35 investigadores habilitados y 33 pendientes**, excluyendo
alternativas, reediciones y Homúnculo perdido. Siguen pendientes **134 cartas
estándar**; los siete códigos de este lote no se suman a esa categoría.
