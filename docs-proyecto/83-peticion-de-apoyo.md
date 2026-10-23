# 83 · Petición de apoyo

Lote `backup-events`: **1 código / 1 carta o nivel distinto nuevo / 0 reediciones**: Petición de apoyo (08129), evento neutral de nivel 2 y coste 1.

Cada clase controlada habilita su efecto una sola vez, en el orden elegido. Se reutiliza el contador de Sinergia exponiendo su lista de clases: investigador, apoyos controlados y eventos vinculados; excluye mano, descarte, habilidades comprometidas y el evento neutral en resolución. No cambia el recuento de las cartas ya publicadas.

Las decisiones recalculan clases y objetivos tras cada efecto, sin guardar objetivos obsoletos. Moverse cambia los enemigos y pistas disponibles; respeta conexiones, costes de entrada y prohibiciones del escenario. El daño no es un ataque: admite enemigos distantes sin enfrentarlos, conserva la procedencia Favor/Sinergia y excluye inmunidad o reducción a cero. La curación alcanza investigadores y apoyos en cualquier Lugar, incluidos otros controladores y apoyos colocados boca arriba; excluye investigadores eliminados, cartas sanas y apoyos boca abajo. Las clases utilizadas persisten como datos JSON. Se conserva la opción de terminar de la aplicación de referencia.

Trece pruebas de reglas e integración cubren clases sin efecto, control y zonas, costes y descarte, pistas, movimiento antes de otros efectos, enemigos distantes, orden y terminación, curación remota y de apoyos, ataques de oportunidad con asignación real, cambios de control, restauración JSON, inmunidades, entrada prohibida y compra/inicio de escenario. Pruebas compartidas de Sinergia, conversión y unicidad correctas. No cambia el motor.

Nombres, reglas, rasgos e imágenes oficiales EN/ES, con miniaturas y huellas. Prueba de presentación en ambos idiomas y revisión visual de los dos escaneos. Referencia: `Event/Events/CallForBackup2.hs` y texto congelado de 3c8ee4b5d8100766; se conserva el inventario histórico.

Acumulado: **579 códigos / 470 familias**. Sobre 104 históricos: **475 altas = 366 registros distintos + 109 reediciones**. Pendientes históricos: **1404 códigos**, incluidas reediciones. Controles finales y siguiente grupo en el [resumen único](continuacion-importacion.md).
