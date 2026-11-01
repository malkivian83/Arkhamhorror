# 105 · Servicios y Negociar

Lote `services-parley`, posterior a `test-recovery` (`9bc3f47a`): siete códigos,
siete cartas o niveles distintos nuevos, sin reediciones. Un solo agente.

| Códigos             | Reglas revisadas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 05111, 05234, 05277 | Informe de inteligencia, Señuelo y Favorcillo: dos aumentos de coste independientes, combinables una vez cada uno. Se eligen antes de pagar; los descuentos y aumentos se calculan juntos antes de aplicar el mínimo cero. Jugar sin pagar el coste exime del coste en recursos completo. Alcance de hasta dos conexiones; cantidades y restricciones propias de cada evento. Señuelo selecciona hasta dos enemigos distintos antes de evitarlos. Favorcillo nunca reparte daño entre enemigos. |
| 04105               | Persuasión conserva la restricción Humanoide original y excluye Debilidades. Dificultad 3 más el horror del enemigo. Baraja el enemigo ordinario sin derrotarlo; evita automáticamente al Élite. Una carta sin reverso de Encuentro no se baraja en ese mazo.                                                                                                                                                                                                                                   |
| 05113               | Desterrar usa Voluntad para evitar a un enemigo enfrentado que no sea Élite. Tras el éxito lo mueve a cualquier Lugar; solo los cuatro símbolos impresos impiden que se prepare en el siguiente mantenimiento. No aplica Tabú.                                                                                                                                                                                                                                                                  |
| 10114               | Ganar tiempo usa el menor valor actual de combate/evasión del enemigo. Agota sin desenfrentar y solo impide preparar al no Élite. Al fallar devuelve la copia jugada, incluso desde el fondo del mazo con el Amuleto de Wendy.                                                                                                                                                                                                                                                                  |
| 04153               | Comprensión verdadera solo se compromete a pruebas procedentes de cartas de escenario. Al tener éxito descubre la pista en el Lugar de quien la comprometió.                                                                                                                                                                                                                                                                                                                                    |

El contrato optativo `playVariants` permite que la mesa y los efectos de juego
comprueben el coste mínimo de una variante válida, sin ofrecer modos sin objetivo
ni menús vacíos. La variante elegida se conserva en los mensajes serializables y
en la resolución del evento. Las cartas anteriores conservan su cálculo habitual.

Fuentes EN/ES con huellas en `approvals.json`; conversión reproducible y control
de códigos duplicados. Se añaden doce escaneos y doce miniaturas. Las imágenes
españolas de Persuasión y Desterrar del CDN incorporan Tabú: se excluyen de este
lote y la interfaz usa el escaneo inglés con texto español original. Hoja de
contacto revisada con las catorce caras candidatas.

Referencias: [Informe de inteligencia](https://arkhamdb.com/card/05111),
[Persuasión y su FAQ](https://arkhamdb.com/card/04105),
[Desterrar](https://arkhamdb.com/card/05113),
[modificadores](https://arkhamdb.com/rules#Modifiers) e
[inicio de capacidades](https://arkhamdb.com/rules#Appendix_I_Initiation_Sequence).

Reglas: 31 pruebas, con los cuatro modos de los servicios, coste, objetivos,
Élite, Debilidades, procedencia y devolución del evento. Integración: siete
casos de catálogo único, compra, inicio y presentación EN/ES. Se comprueban
también el motor y los consumidores de juego afectados por el contrato.
El resumen, los recuentos y el estado de publicación se mantienen únicamente en
`continuacion-importacion.md`; reutilizar comprobaciones mientras no cambie su alcance.

Siguiente selección: buscar 30–50 cartas o niveles pendientes con mecánicas
compartidas. Conservar los bloqueos de los documentos 98/99/101/102/104.
Deslizamiento etéreo queda fuera de este lote: necesita revisar el intercambio
de ambos movimientos y sus ventanas, no basta con encadenar dos movimientos.
