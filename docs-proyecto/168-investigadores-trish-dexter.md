# 168 · Trish Scarborough y Dexter Drake

Versiones originales de Innsmouth con exclusivas, debilidades, listas iniciales,
EN/ES y recursos oficiales. **Seis códigos nuevos, seis diseños distintos,
cero cartas estándar nuevas y cero reediciones.** Se contabilizan 07003,
07010–07011, 07004 y 07012–07013 en `trish-dexter`; no reimportarlos después.
Las versiones de 2026 siguen disponibles con sus propias reglas y mazos.

## Reglas revisadas

- Trish reacciona tras descubrir pistas en un lugar con un enemigo, aunque la
  pista se descubra a distancia. Una vez por ronda puede descubrir otra pista
  allí o evitar automáticamente a un enemigo de ese lugar. Puede evitar tras
  retirar la última pista, sin necesitar estar enfrentada al objetivo.
- Se implementa el texto impreso de 07003, sin Taboo, como en la lista archivada:
  puede evitar enemigos Élite. La lista Taboo reciente restringe esa opción a
  no Élite; no se mezcla esa variante con el texto base.
- Su signo arcano da +2 y permite continuar la investigación como si estuviera
  en cualquier lugar revelado. Cambian lugar, velo y modificadores aplicables,
  conservando los demás modificadores de la investigación. El estado virtual
  dura hasta terminar la prueba y se restaura antes de acciones posteriores;
  no mueve físicamente al investigador ni provoca ventanas de movimiento.
  El guardado conserva tanto el lugar virtual como el físico.
- En las sombras solo se ofrece tras empezar su turno: desenfrenta los enemigos
  y hasta el final de la ronda impide que la enfrenten y que ella dañe enemigos.
- Agentes encubiertos conserva Cazador, presa exclusiva y valores 3/3/5, daño 2.
  Impide descubrir pistas fuera de resultados de investigación a quien esté
  enfrentado, incluso agotado. Se descarta tras ser evitado por cualquier
  investigador; no se trata como una derrota.
- Dexter puede descartar un apoyo controlado durante su turno para jugar otro
  de distinto título desde la mano, pagando su coste reducido en uno, sin acción
  ni ataques de oportunidad. Se comprueba la legalidad sin los modificadores del
  apoyo que va a descartar. Permanentes, títulos iguales y opciones inasequibles
  no se ofrecen. Solo un descarte real paga el coste y consume el uso de la ronda.
- Su signo arcano da +2 y permite devolver un apoyo a la mano. Solo una devolución
  efectiva permite robar después, conforme a la
  [respuesta oficial recogida en ArkhamDB](https://arkhamdb.com/card/07004).
- Maestría escénica permite elegir cada apoyo que entre bajo su control: +2 a
  las habilidades al resolver capacidades activadas de ese apoyo durante la
  ronda. No mejora pruebas ajenas a esa capacidad y no persiste a otra ronda.
- Retazos de ocultismo permanece en la mano al robarlo. Aplica −2 a voluntad
  desde la mano y −1 mientras está en juego. No se juega mediante una acción
  de jugar; la capacidad de Dexter y otros permisos sin esa acción sí lo permiten.
  Una vez en juego puede descartarse como coste de otro intercambio.

## Listas, fuentes y presentación

Listas archivadas: [Trish, FFG 51875](https://arkhamdb.com/decklist/view/51875)
y [Dexter, FFG 51876](https://arkhamdb.com/decklist/view/51876).
Se conservan exactamente sus códigos y cantidades, salvo el marcador 01000,
sustituido por la debilidad básica real 12104 como en los lotes anteriores.
La publicación de Dexter ya corrige a treinta cartas la propuesta del PDF FFG,
que incluía dos habilidades adicionales, según su autor. Se conserva esa lista
publicada de treinta; no se afirma haber reproducido el PDF sin correcciones.
Ambas listas declaran `taboo_id: null`.

El diagnóstico CLI mantiene el bloqueo SSR documentado; no se repite sin una
hipótesis nueva ni se declara superado. Las pruebas usan el registro real,
importan ambas listas, validan construcción y comienzan una campaña.
Las exclusivas quedan fuera de las compras generales. La unicidad se contrasta
automáticamente con todos los JSON de datos existentes.

Fuentes EN/ES y huellas en `packages/cards/src/trish-dexter/`; generador
`scripts/prepare-trish-dexter.mjs`. Dieciséis escaneos, dieciséis miniaturas
y dos retratos nuevos, con [procedencia y huellas](evidencias/trish-dexter-recursos-oficiales.json).
Se mantienen las huellas históricas. Changelog actualizado y caché de cartas v20.
Controles finales y revisión visual representativa en el resumen de continuación.

Tras el lote: **37 perfiles de investigador habilitados y 31 pendientes**,
excluyendo alternativas, reediciones y Homúnculo perdido. Las reglas de estas
dos versiones originales son distintas de las de 2026. Siguen pendientes
**134 cartas estándar**.

Tony queda pendiente de elección persistente de clase secundaria y recompensas.
Mary requiere completar Rito de santificación, incluyendo el consentimiento del
dueño al pagar cartas ajenas. No se han habilitado sus datos ni contado como jugables.
