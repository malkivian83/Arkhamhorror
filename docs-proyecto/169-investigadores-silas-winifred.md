# 169 · Silas Marsh y Winifred Habbamock

Dos perfiles completos: Silas de Innsmouth (07005) y Winifred del mazo de
investigador (60301). Ocho códigos/diseños nuevos: dos investigadores, cinco
exclusivas/debilidades y la debilidad básica Imprudente (60304). Cero cartas
estándar nuevas y cero reediciones. No se importan las exclusivas alternativas
de la novela de Silas. Los códigos quedan registrados una sola vez y excluidos
de futuros lotes; las exclusivas no aparecen en compras generales.

## Reglas revisadas

- Silas recupera una habilidad propia después de revelar una ficha, una vez por
  ronda. Al retirarla pierde sus iconos y sus efectos de resolución, pero se
  conservan los efectos duraderos ya creados. Su signo arcano permite comprometer
  una habilidad elegible del descarte y recuperarla al final, también si falla.
  Se respetan prohibiciones y costes adicionales.
- Arpón marino y Red de Silas recuerdan que se comprometió una habilidad aunque
  Silas la recupere antes de resolver. El arpón añade daño; la red permite evitar
  a otro enemigo enfrentado tras tener éxito. Al terminar la prueba, devolver
  realmente el apoyo permite recuperar todas las habilidades propias todavía
  comprometidas, conservando sus efectos hasta ese momento. Eventos, apoyos y
  aportaciones ajenas no se recuperan por ese permiso.
- Canto de sirena entra por revelación en la zona de amenaza. Cobra recursos
  por los iconos coincidentes, incluidos comodines, de quien tiene la debilidad.
  Las aportaciones de otros investigadores no pagan ese coste. Un grupo no se
  compromete parcialmente si no puede pagarse completo. Cualquier investigador
  en el mismo Lugar puede gastar dos acciones para descartarlo, con ataques
  de oportunidad según las reglas habituales.
- Winifred roba una carta con dos cartas distintas no debilidad comprometidas,
  una vez por prueba. La ventana posterior cierra ST.2 antes de robar: la carta
  robada no vuelve a abrir el compromiso normal, incluida Arrogancia. El límite
  y las copias físicas sobreviven al guardado. Su signo arcano devuelve tantas
  cartas propias como permita el margen, eligiendo copias concretas en ST.8 y
  conservando sus efectos hasta entonces.
- Lo que tú haces, pero mejor aporta seis comodines y solo puede comprometerse
  a una prueba propia. Arrogancia debe comprometerse si es elegible, resta sus
  iconos y vuelve a la mano tras un éxito. Imprudente solo se compromete a una
  prueba propia sin otras cartas e impide más aportaciones; vuelve al fallar y
  revela su presencia y hace perder dos recursos al final del turno en la mano.
- Las opciones de Silas restringen su acceso fuera de clase a **habilidades**
  Innate de nivel 0–2; no habilitan apoyos ni eventos por compartir el rasgo.

Fuentes: texto impreso de [Silas](https://arkhamdb.com/card/07005),
[Winifred](https://arkhamdb.com/card/60301),
[arpón](https://arkhamdb.com/card/07014), [red](https://arkhamdb.com/card/07015),
[Canto de sirena](https://arkhamdb.com/card/07016),
[Arrogancia](https://arkhamdb.com/card/60303) e
[Imprudente](https://arkhamdb.com/card/60304).
La interpretación de comodines sigue la sección 1.9 de las reglas oficiales,
recogida en el [Grimorio de FFG](https://images-cdn.fantasyflightgames.com/filer_public/76/b3/76b332d5-7047-458f-91b6-82c8500cc445/arkham_grimoire.pdf).
No se usan comentarios comunitarios como reglas oficiales.

## Mazos, presentación y recuentos

Se archivan [Silas 51877](https://arkhamdb.com/decklist/view/51877) y
[Winifred 31399](https://arkhamdb.com/decklist/view/31399), con sus códigos y
cantidades publicados. En Silas solo se sustituye el marcador 01000 por 12104.
Winifred conserva Imprudente, ya incluida en la lista, sin añadir otra debilidad
básica. Las integraciones validan las treinta cartas, las exclusivas, el registro
real y el comienzo de campaña de ambos mazos.

Fuentes oficiales EN/ES con huellas y generador reproducible en
`packages/cards/src/silas-winifred/` y `scripts/prepare-silas-winifred.mjs`.
Veinte escaneos, veinte miniaturas y dos retratos nuevos, con
[procedencia](evidencias/silas-winifred-recursos-oficiales.json), sin reescribir
huellas históricas. Inventarios: 8006 originales y 8006 miniaturas. Revisión local
representativa de las miniaturas españolas; sin navegador. Changelog traducido y
caché de cartas v21. Validación final anotada en el resumen de continuación.

Tras el lote: **39 perfiles habilitados y 29 pendientes**, sin contar alternativas
ni Homúnculo perdido. Siguen pendientes **134 cartas estándar**: las exclusivas y
la debilidad básica de este lote se contabilizan por separado.

La comprobación CLI sigue bloqueada por el SSR ya documentado; se usa la
integración real de los dos mazos. El árbol compartido contiene trabajo ajeno de
Hemlock: se conserva y se excluye del lote y de la comprobación de tipos de su
contenido publicable.
