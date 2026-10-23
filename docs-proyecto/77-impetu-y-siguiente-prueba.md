# 77 · Ímpetu y la siguiente prueba

Lote `next-test-effects`: **1 código / 1 carta distinta nueva / 0 reediciones**: Ímpetu (06115), nivel 1.

Tras terminar una prueba exitosa, reserva para quien comprometió la carta una reducción igual al margen de éxito, hasta tres por copia. Se consume en su siguiente prueba de esta fase, aunque falle; no afecta a otro investigador ni persiste en otra fase o ronda. Las copias acumulan sus reducciones. La reserva y la prueba admiten restauración JSON, y elegir una sustitución de habilidad no consume anticipadamente el efecto.

El motor conserva la dificultad base y la reducción separadas. Suma las modificaciones aditivas antes de multiplicar y aplica el mínimo de cero al resultado final, según _Modifiers_. Esto también corrige el orden anterior entre modificadores de cartas comprometidas y multiplicadores y las expectativas anteriores de la regresión Gumption/Double or Nothing, en ambos órdenes de compromiso.

Quince pruebas de reglas e integración cubren margen, límite, fracaso automático, duración, ayudante, acumulación, sustitución de habilidad, restauración, orden de modificadores y compra/inicio de escenario. Presentación oficial EN/ES, dos escaneos y miniaturas con huellas; revisión visual representativa y pruebas compartidas de conversión, unicidad y catálogo.

Referencias: [texto de Ímpetu](https://arkhamdb.com/card/06115), [Modifiers](https://arkhamdb.com/rules#Modifiers), instantánea congelada EN/ES y `Skill/Cards/Momentum1.hs` de la aplicación de referencia. Se reutiliza el punto de extensión posterior al final de la prueba.

Call for Backup (08129) sigue en revisión independiente: la FAQ permite curar cualquier carta con salud o cordura, mientras la referencia ofrece investigadores/apoyos y una opción de terminar decisiones. Falta contrastar los objetivos adicionales y la secuencia obligatoria antes de habilitarla; los apoyos colocados ya tienen soporte de curación en el motor.

Acumulado: **573 códigos / 464 familias**. Sobre 104 históricos: **469 altas = 360 registros distintos + 109 reediciones**. Pendientes históricos: **1410 códigos**, incluidas reediciones. Inventarios congelados intactos; publicación y siguiente grupo en el [resumen único](continuacion-importacion.md).
