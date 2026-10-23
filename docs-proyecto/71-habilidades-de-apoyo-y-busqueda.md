# 71 · Habilidades de apoyo y búsqueda

Lote `skill-utilities`: **4 códigos / 4 cartas distintas nuevas / 0 reediciones**. Agrupa restricciones de compromiso y efectos de resultado que reutilizan el motor existente; no incorpora impresiones adicionales para aumentar el tamaño.

- **Fighting Lessons (09030):** solo durante ataques o evasiones; permite ayudar desde cualquier Lugar. Mantiene iconos, Peligro y el límite de una carta de cada ayudante.
- **Contemplative (11088):** no tiene iconos; su permiso expreso permite comprometerla en investigaciones o pruebas de negociación del propio Lugar o uno conectado. Con éxito, el investigador que hace la prueba descubre una pista adicional en su Lugar.
- **Establish Motive (60268):** con éxito, el investigador que hace la prueba busca entre sus seis primeras cartas un evento Inspiración, lo roba y baraja. `SearchDeck.cardType` añade un filtro de tipo acumulativo al de rasgo; no basta con que una carta tenga Inspiración. Se permite no encontrar carta.
- **Literary Analysis (60269):** con éxito, repone un secreto en un Tomo del Lugar de quien la comprometió, incluido uno controlado por otro investigador, sin superar su cantidad inicial de usos. Excluye Tomos sin secretos, llenos o distantes.

Referencia: textos oficiales EN/ES de la instantánea congelada y los cuatro módulos homónimos de `Skill/Cards` de la aplicación de referencia. Presentación con la infraestructura existente, ocho escaneos oficiales y ocho miniaturas con huellas en los inventarios; revisión visual representativa de Fighting Lessons y Contemplative en ambos idiomas.

Once pruebas de reglas y cuatro de compra/inicio de escenario cubren compromiso remoto real con consentimiento, Peligro, restricciones, carta sin iconos, destinatario de pistas/búsqueda, límite de seis, tipo y rasgo simultáneos, búsqueda fallida, reparto de secretos y tope de usos. Cuatro casos web verifican presentación EN/ES y recursos locales. La conversión y la unicidad entre lotes usan los controles compartidos.

Mind over Matter 2 queda aplazado: necesita sumar habilidades modificadas y ofrecer bonificaciones de la habilidad añadida. La interfaz actual de `BoostSkillTest` guarda una cantidad sin tipo de habilidad; sumar solo sus valores impresos o copiar el total de otra prueba perdería interacciones. También requiere revisar el robo de cartas y revelaciones si se juega durante una prueba. No se habilita con la sustitución del nivel 0.

Acumulado: **565 códigos / 456 familias**. Sobre los 104 históricos: **461 altas = 352 registros distintos + 109 reediciones**. Pendientes históricos: **1418 códigos**, incluidas reediciones. Inventario congelado intacto; publicación y continuidad en el [resumen único](continuacion-importacion.md).
