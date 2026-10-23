# 79 · No va más y robo protegido

Lote `protected-draw`: **1 código / 1 carta o nivel distinto nuevo / 0 reediciones**: No va más (All In, 04309), nivel 5, versión impresa sin Tabú.

Al tener éxito en una prueba propia, roba tantas cartas como el margen de éxito, hasta cinco. El máximo de una copia comprometida se aplica entre todos los investigadores. La [FAQ oficial de junio de 2024](https://arkhamdb.com/card/04309) aclara que, si se compromete a una prueba ajena, ninguno de los dos investigadores roba por su efecto.

`DrawCards` incorpora una opción explícita que aparta las debilidades robadas y las devuelve al mazo, barajándolo, al terminar ese grupo de robos. Cuentan para la cantidad solicitada y no se sustituyen por otras cartas. No entran en la mano ni resuelven sus revelaciones; las revelaciones de cartas que no sean debilidades siguen resolviéndose. Una copia anterior en la mano no se retira. La cola guarda las debilidades apartadas para restaurar partidas pendientes sin perderlas ni duplicarlas.

La capacidad se resuelve durante los resultados de la prueba, por lo que Double or Nothing repite el robo, con un máximo de cinco en cada resolución. Mantiene la reposición normal del mazo y su horror al agotarse; las debilidades apartadas no vuelven a robarse durante el mismo grupo.

Veinte pruebas de reglas e integración cubren margen, límite, fracaso automático, ayudante, máximo de compromiso, debilidades reales de varios tipos, grupos mixtos, copias anteriores, robo normal posterior, agotamiento del mazo, resultados duplicados, otras revelaciones, restauración JSON y compra/inicio de escenario. Conversión, unicidad entre lotes y catálogo compartidas. Datos, nombres, reglas y rasgos oficiales EN/ES.

La revisión visual detectó que el escaneo español de la aplicación de referencia incluye el Tabú «Retira No va más de la partida», mientras el inglés conserva la versión impresa. ArkhamDB en español devolvió también la imagen inglesa. Se conserva únicamente el escaneo inglés de la versión implementada, con miniatura y huellas; la infraestructura existente lo muestra como alternativa en español, junto al texto español completo. No se habilita una imagen que describa otra variante.

Referencia de comportamiento: `Skill/Cards/AllIn5.hs`, `Draw/Types.hs` y `Investigator/Runner/Card.hs` de la aplicación de referencia. Se contrasta su destinatario con la FAQ más reciente y se conserva la separación entre el robo completo y la devolución de debilidades.

Acumulado: **575 códigos / 466 familias**. Sobre 104 históricos: **471 altas = 362 registros distintos + 109 reediciones**. Pendientes históricos: **1408 códigos**, incluidas reediciones. Inventarios congelados intactos; publicación y siguiente grupo en el [resumen único](continuacion-importacion.md).
