# 68 · Bonificaciones hasta el final de la ronda

Lote `round-effects`: **1 código / 1 carta distinta nueva / 0 reediciones**: Fight or Flight, Pelear o huir (03155). Lote pequeño para habilitar y revisar una dependencia nueva del motor, sin completar cifras con reediciones.

`RoundSkillBonus` conserva una fuente serializable por investigador, habilidad y ronda. Su cantidad puede ser fija o el horror actual del investigador; se calcula en cada prueba, se suma a las demás fuentes y deja de aplicarse en la siguiente ronda. No modifica los valores impresos. La carta solo se ofrece en el turno de su controlador, cuesta 1 recurso, es rápida y aumenta combate/agilidad según su horror actual; varias copias se acumulan. El horror en apoyos no cuenta.

Referencia: texto oficial EN/ES de la instantánea congelada y `Event/Events/FightOrFlight.hs` de la aplicación de referencia (modificador calculado, no instantánea del horror al jugar). Dos escaneos oficiales y miniaturas selectivas, con procedencia y huellas en los inventarios existentes; escaneos revisados visualmente. Presentación reutilizada, sin componentes nuevos.

Validación dirigida: seis pruebas cubren pago/ventana rápida sin acción ni ataque de oportunidad, evolución del horror, duración y serialización, propietario, acumulación, compra/inicio de escenario y ausencia de códigos repetidos entre datos publicados. Una prueba web verifica nombre, texto, coste e imagen EN/ES; conversión reproducible en el control compartido. Las comprobaciones finales y publicación se registran en el resumen único.

Acumulado: **560 códigos / 451 familias**. Sobre los 104 históricos: **456 altas = 347 registros distintos + 109 reediciones**. Pendientes históricos: **1423 códigos**, incluidas reediciones. Inventario congelado sin cambios.

Mind over Matter 0/2 sigue pendiente: además de la duración requiere sustituir o sumar otras habilidades al resolver pruebas; este lote no demuestra que esas variantes sean jugables.
