# 93 · Rex Murphy y lista 21596

Se añade el investigador original Rex Murphy (`02002`), Buscar la verdad
(`02008`), La maldición de Rex (`02009`) y Viejo libro de conocimiento (`01031`).
Son cuatro códigos nuevos, sin reediciones; solo uno es carta estándar.
La lista de ArkhamDB 21596 se conserva con sus cantidades y se ofrece como mazo
inicial `rex`, sustituyendo el marcador de debilidad aleatoria por una real.
No se incluyen investigador paralelo ni exclusivas alternativas.

Rex usa su texto original, sin Tabú (la lista no selecciona Tabú). Descubre una
pista al superar una investigación por dos; su signo arcano permite fallar y
robar tres cartas. Admite Buscador/neutrales 0–5 y hasta cinco cartas de otras
clases de nivel cero, con prohibición absoluta de Fortuna, también en compras.
Buscar la verdad cuenta las pistas al resolver, hasta cinco.

La maldición se resuelve en ST.6 antes de confirmar un éxito. La infraestructura
general devuelve las fichas físicas, limpia modificadores y efectos de las fichas
anteriores y conserva compromisos y usos por prueba al revelar nuevamente.
La debilidad solo se baraja si esta repetición provoca el fallo. Se queda en juego
con el mazo vacío, según la FAQ. Las pruebas cubren el éxito que se convierte en
fallo automático, repetición limitada, otros investigadores y mazo vacío.
El Libro permite que el investigador elegido busque entre sus tres primeras
cartas y robe la elegida; el resto se baraja. Conserva elección, agotamiento,
acción y ataques de oportunidad.

Fuentes: instantáneas EN/ES de las API de ArkhamDB junto al módulo, inventario
congelado intacto y FAQ de [Rex](https://arkhamdb.com/card/02002) y
[su maldición](https://arkhamdb.com/card/02009), consultadas el 29/10/2026.
El adaptador `scripts/prepare-rex-murphy.mjs` reproduce datos y presentación.

Se incluyen escaneos y miniaturas EN/ES y retrato. La hoja de contacto permitió
detectar que el CDN sirve a Jim Culver como reverso español de Rex. El recurso
local usa el reverso inglés correcto; el texto de respaldo sí está traducido.
La API española también enlaza un escaneo inglés del reverso. Las huellas y
procedencias están en los inventarios compartidos. Revisión de aplicación
reservada al usuario, sin navegador.

Este lote se publica junto a las diez cartas estándar preparadas de
`grouped-import`, por petición expresa de subir todo a la vez. Se mantienen
fuera del commit los adjuntos y archivos temporales de trabajos anteriores.

Validación final: diagnóstico de lista sin pendientes; reglas, integración, unicidad y presentación EN/ES correctas. Suite general: 5363 correctas y 20 omitidas; los seis fallos iniciales quedan resueltos por las correcciones de traducción/fixtures y las repeticiones dirigidas. Los timeouts de Dunwich y administración pasan al repetir solo sus archivos (administración con 15 s). Tipos de cards/engine y build de web correctos; formato y lint dirigidos correctos. La compilación mantiene las advertencias anteriores de fuente externa y tamaño de paquetes. Los controles se reutilizan mientras no cambien reglas, datos, presentación, dependencias o configuración del alcance.
