# 91 · Banquillo de Stella y cartas personalizables

28/10/2026. Petición: implementar y subir las cinco cartas pendientes del banquillo
de la [lista 39832](https://arkhamdb.com/decklist/view/39832).

## Alcance

Lote `stella-sideboard`: **5 códigos / 5 cartas o niveles nuevos jugables / 0 reediciones**.
03273 Supervivencia real (3) se traslada desde el lote parcial `grouped-import`, con su
comportamiento y pruebas existentes; quedan 12 códigos preparados en aquel lote.
Se conserva el inventario histórico congelado y se evitan duplicados de datos y aprobaciones.

- 03273 Supervivencia real (3): recupera hasta tres habilidades Innato del descarte propio.
- 06332 Reutilizar (2): después de investigar con éxito por 2 o más, recupera un Objeto
  o lo juega pagando su coste, sin gastar una acción adicional. Se comprueban las restricciones
  de juego, la unicidad y los recursos disponibles, incluido el Catálogo de Schoffner.
- 09105 Aprovechar la debilidad: antes de revelar una ficha en un ataque/evasión de
  dificultad 0, éxito automático; sustituye el resultado normal por descarte del enemigo,
  o evasión y 3 daños si es Élite. Descartar no es derrotar ni concede puntos de victoria.
- 09116 Reaprovechar (2): retira un Apoyo Objeto del descarte para ganar su coste impreso,
  o lo juega pagando su coste. Retirar de la partida no es exiliar del mazo de campaña.
- 09119 Lanzadisparos hiperfísico: cuatro usos de éter, descarte al agotarlos, elección
  de forma al entrar y cambio de forma agotando el apoyo. Las cinco formas y las dos
  mejoras de cuatro casillas están implementadas. El último uso resuelve aunque el apoyo
  ya se haya descartado; Reutilizar puede volver a jugarlo durante esa investigación.

El importador de mazos sigue importando `slots`; el banquillo es una reserva de mejoras,
no cartas que deban añadirse automáticamente al mazo inicial.

## Personalización

Las hojas se guardan por investigador y código en el mazo, campaña y estado de partida.
Cada casilla cuesta 1 PX; las opciones parciales no dan capacidades, pero cuentan para
el nivel (mitad de casillas, redondeada hacia arriba), con un máximo de 10 casillas.
Las compras son irreversibles y afectan a todas las copias. Se permite comprar copias nuevas
junto con mejoras pagando únicamente las casillas; la compra posterior de otra copia
utiliza el nivel actual. Perder la última copia de la campaña borra su hoja.

Editor y tiendas local/online muestran una hoja EN/ES con las opciones y sus efectos.
El servidor valida experiencia, composición del mazo, propietario y repetición de comandos.
La importación conserva los metadatos `cus_<código>` de ArkhamDB (índice y casillas).
No se activan otras cartas personalizables por disponer de esta infraestructura.

## Reglas y fuentes

- [Reglas de Personalizable](https://arkhamdb.com/rules#Customizable).
- [Hoja oficial de mejoras](https://images-cdn.fantasyflightgames.com/filer_public/b4/4c/b44c34e7-e9f1-4752-844d-1acffc4b770a/ahc69_upgrades_v5.pdf).
- [Lanzadisparos y FAQ](https://arkhamdb.com/card/09119): Teleescáner sustituye la pista
  básica; Deducción sigue descubriendo su pista adicional en el Lugar investigado.
- [Reutilizar](https://arkhamdb.com/card/06332), [Aprovechar la debilidad](https://arkhamdb.com/card/09105),
  [Reaprovechar](https://arkhamdb.com/card/09116).
- [Formato de metadatos de ArkhamDB](https://github.com/Kamalisk/arkhamdb/blob/master/src/AppBundle/Resources/public/js/app.deck.js).

Los textos de respaldo y las descripciones de las mejoras se preparan con
`scripts/present-stella-sideboard.mjs`; los datos se reproducen con
`scripts/prepare-stella-sideboard.mjs`. Los escaneos y miniaturas EN/ES se registran en
los inventarios compartidos de imágenes, conservando procedencias y SHA-256.
La API española tuvo dos timeouts; se contrastaron las páginas oficiales de ArkhamDB
y el escaneo español de 09105 para su nombre y texto. Los resúmenes abreviados de respaldo
no sustituyen a las imágenes oficiales.

## Verificación

Pruebas de reglas por efecto y forma, restricciones, última carga, Deducción, compras,
persistencia, metadatos, exilio, unicidad del registro, servicio online e interfaz EN/ES
mediante renderizado SSR. Se reutilizan las pruebas de Supervivencia real del lote parcial.
Revisión visual de la aplicación pendiente para la persona usuaria; no se abre navegador.

Validación final del commit `61094e25`, integrado sobre `801f398c`: formato, lint sin
errores, tipos y compilación correctos. Batería completa: 4.840 pruebas correctas y
19 omitidas, incluyendo la repetición de los dos archivos existentes que agotaron
5 segundos bajo carga (correctos con límite de 15 segundos). La prueba del inventario
se corrigió para usar Vitest y también pasó. Lista 39832: 33 códigos jugables y ninguno
pendiente. Persisten los avisos previos de orden de atributos en SiteHeader, fuente
externa y tamaño de los paquetes de compilación.

La publicación se prepara en `.card-import-tmp/stella-main`, copia temporal de main,
para preservar las ediciones concurrentes de Carcosa del árbol original. Este último
mantiene su HEAD previo y requiere integrar main cuando termine ese trabajo.
