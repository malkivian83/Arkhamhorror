# 78 · Historial de ataques

Lote `attack-history`: **1 código / 1 carta distinta nueva / 0 reediciones**: Duro de pelar (11025), nivel 0.

Conserva sus iconos impresos de Combate y comodín y añade otro par por cada ataque exitoso realizado esta ronda por quien compromete la carta. Incluye ataques fuera de su turno y en fases anteriores de la misma ronda. El máximo de una copia se comprueba entre todos los investigadores.

El motor registra cada ataque exitoso al terminar su prueba, separado por investigador y con número de ronda. No cuenta la prueba en curso, los fallos, el daño directo ni pruebas ajenas a ataques. Duplicar los resultados con Double or Nothing sigue siendo un solo ataque. El éxito cuenta aunque no llegue a infligir daño. No se deduce el historial del daño causado ni de las acciones gastadas.

Catorce pruebas cubren los iconos impresos y adicionales, su vista previa, límites, ayudante, otros investigadores, otras fases, nueva ronda, restauración JSON, fracaso automático, resultados duplicados y compra/inicio de escenario. Presentación oficial EN/ES, dos escaneos y miniaturas con huellas y revisión visual representativa; conversión y unicidad entre lotes compartidas.

Referencias: instantánea congelada EN/ES, `Skill/Cards/Hardboiled.hs` de la aplicación de referencia y [texto oficial de Hardboiled](https://arkhamdb.com/card/11025). No incorpora reediciones para aumentar el tamaño del lote.

Revisión independiente para la continuación: [All In](https://arkhamdb.com/card/04309) necesita robo que devuelva debilidades al mazo sin resolverlas; su FAQ de 2024 impide robar cuando se compromete a una prueba ajena. La referencia `Skill/Cards/AllIn5.hs` usa `drawCardsEdit` con `shuffleBackInEachWeakness`, pero su destinatario necesita contrastarse con esa FAQ más reciente. [Quick Thinking](https://arkhamdb.com/card/02229) exige crear el efecto diferido durante los resultados, con duplicación por Double or Nothing; no basta usar sin más el gancho posterior al final de la prueba. El motor ya dispone de acciones inmediatas, pero falta revisar sus ventanas frente a la FAQ antes de habilitar esta carta.

Acumulado: **574 códigos / 465 familias**. Sobre 104 históricos: **470 altas = 361 registros distintos + 109 reediciones**. Pendientes históricos: **1409 códigos**, incluidas reediciones. Inventarios congelados intactos; publicación y siguiente grupo en el [resumen único](continuacion-importacion.md).
