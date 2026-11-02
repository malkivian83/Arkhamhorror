# 106 · Habilidades de fichas y Myriad

Lote `token-skills`: doce códigos y doce cartas o niveles distintos nuevos,
sin reediciones. Selección contrastada con los datos y el registro anteriores.

| Familia                  | Códigos      | Diferencias revisadas                                                                                                                                                                                                                                                                           |
| ------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desafío                  | 02190, 04198 | El nivel 0 elige uno de los cuatro símbolos impresos; el nivel 2 ignora los cuatro. Ignoran sus efectos y modificadores, pero no su revelación ni las capacidades de otras cartas que reaccionan a ella. El efecto duradero permanece aunque se cancelen después las habilidades comprometidas. |
| Torrente de poder        | 03235        | Permite gastar entre cero y tres cargas de apoyos propios. Añade Voluntad y comodín por cada carga a la copia comprometida concreta, sin modificar otra copia del mismo código.                                                                                                                 |
| Presciencia              | 60419        | Nombra par, impar o símbolo al comprometer. Cero es par y los negativos conservan su paridad. Tras terminar la prueba permite recuperar un Hechizo si se reveló una ficha del tipo nombrado; no cuenta fichas ignoradas o canceladas.                                                           |
| Análisis y Brazo fuerte  | 09049, 10031 | Reaccionan después de revelar, con la ficha todavía pendiente. Pagan primero la pista o el daño y luego cancelan, devuelven y revelan de nuevo. Brazo fuerte añade daño al ataque solo con un apoyo Cuerpo a cuerpo o A distancia.                                                              |
| Confianza                | 11097        | Cuenta revelaciones adicionales, incluso canceladas o ignoradas, hasta tres comodines extra. Incluye la elección de varias fichas y revelaciones fuera de la prueba que ocurran durante ella. El contador es optativo y no cambia el estado de pruebas que no lo necesitan.                     |
| Susurros arcanos         | 60471        | Si se reveló un símbolo, permite distribuir hasta dos cargas o hasta dos secretos entre apoyos propios. No mezcla ambos tipos y respeta límites de usos. Funciona con éxito o fracaso.                                                                                                          |
| Perspicaz                | 11042        | Añade Intelecto y Agilidad por las otras copias en el descarte. Tras terminar permite barajar otras copias, excluyendo la propia cuando fue descartada. Tiene en cuenta si la copia comprometida terminó en el mazo.                                                                            |
| Tres ases                | 06199        | Exige tres copias comprometidas por el mismo investigador. Concede éxito automático sin revelar fichas, tres cartas y tres recursos, una sola vez por prueba. Conserva el texto sin Tabú.                                                                                                       |
| Un destello de esperanza | 06245        | Solo se juega desde el descarte y recupera todas sus copias allí presentes, incluida la jugada. Con el Amuleto de Wendy recupera la copia enviada al fondo sin alterar copias anteriores del mazo.                                                                                              |
| Descubrimiento fortuito  | 06034        | Su coste X está definido por las otras copias descartadas. Se calcula mediante el modificador de coste existente, sin pedir un valor al jugador. Investiga con +X y descubre X pistas adicionales; usa el velo actual. La presentación conserva la X impresa.                                   |

Myriad admite tres copias por título. Una compra permite adquirir hasta dos copias
adicionales al mismo nivel sin experiencia; los créditos se guardan y caducan al
cerrar el escenario. La experiencia inicial solo cuenta la primera copia del mismo
título y nivel. El adaptador de importación acepta únicamente los cuatro códigos
revisados; el coste simbólico definido se admite solo para 06034.

El motor conserva la identidad de las copias comprometidas que la necesitan y
permite barajar copias reales del descarte. Las capacidades de fin de prueba
pueden consultar cómo terminó su copia. La extracción desde el fondo distingue
la copia jugada de otras copias idénticas; también corrige ese caso de Ganar tiempo.

Las fuentes oficiales EN/ES y sus SHA-256 están en `approvals.json`. Se añaden
23 escaneos y 23 miniaturas; el escaneo español de Tres ases incorpora Tabú y se
excluye, usando el inglés con texto español original. Hoja de contacto revisada
de catorce caras representativas. La importación comprueba códigos repetidos y
mantiene las huellas e inventarios históricos.

Referencias: [Desafío y FAQ](https://arkhamdb.com/card/02190),
[Confianza](https://arkhamdb.com/card/11097),
[Tres ases y FAQ](https://arkhamdb.com/card/06199) y
[Myriad](https://arkhamdb.com/rules#Myriad).

Pruebas parametrizadas de reglas, registro, catálogo, compra, inicio y presentación
EN/ES; adaptadores limitados a identidades exactas y regresiones de sus consumidores.
Los resultados y el siguiente grupo se conservan únicamente en el resumen de
continuación. Mantener los bloqueos anteriores sobre intercambio de movimientos,
predicciones y cartas todavía sin implementación revisada.
