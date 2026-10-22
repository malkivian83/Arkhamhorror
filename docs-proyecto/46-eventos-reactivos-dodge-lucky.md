# 46 · Eventos reactivos: Dodge y Lucky

Se incorporan **2 códigos, 2 cartas distintas nuevas y 0 reediciones**: 01023
(Esquivar, nivel 0) y 01080 (¡Qué suerte!, nivel 0). Se reutilizan las ventanas
de reacción desde la mano y de fallo inminente, con módulos individuales.

Esquivar protege al jugador o a otro investigador en su Lugar, paga un recurso
y cancela un único ataque sin gastar acción. El enemigo se agota cuando
corresponde a la fase de enemigos. Se corrigió que el motor ejecutaba el efecto
forzado posterior al ataque de esa fase incluso después de cancelarlo. Una
segunda persona ya no recibe una opción redundante de Esquivar.

¡Qué suerte! añade dos al valor original de la prueba antes de aplicar su
resultado. La ventana vuelve a calcularse tras jugar un evento y permite una
segunda copia si la prueba sigue fallando. El mínimo cero se aplica al comparar
con la dificultad: una prueba de dificultad cero no se presenta como fallida
por un valor negativo. Se respetan el fallo automático, el investigador que
realiza la prueba y las restricciones de jugar eventos durante la ronda en
ambas ventanas.

Reglas contrastadas con [Esquivar](https://arkhamdb.com/card/01023) y
[¡Qué suerte!](https://arkhamdb.com/card/01080), incluidas sus aclaraciones.
Las mejoras quedan sin habilitar: Dodge 2 necesita pruebas anidadas durante
ataques de represalia; Lucky 2 puede robar una debilidad con prueba mientras
otra prueba está abierta; Lucky 3 requiere intervenir en pruebas ajenas.
No se incorporan reediciones para aumentar el tamaño del lote.

Evidencias: 16 pruebas de comportamiento, restricciones, regresiones y compra
con inicio de escenario. Las dos regresiones principales fallaron antes del
cambio de motor y pasan después. La prueba de unicidad compara todos los
manifiestos históricos y la caja básica; cada código tiene una sola opción en
la tienda. Los datos se regeneran con
`node scripts/prepare-dunwich-pilot.mjs reactive-events` desde el inventario
inmutable `3c8ee4b5d8100766`. Nombres y textos EN/ES usan la presentación
existente; no se cambia el renderizador.

Tras publicar: **324 códigos / 243 familias canónicas**. Sobre los 104
originales: **220 códigos añadidos = 139 registros distintos + 81 reediciones**.
Los registros distintos incluyen el investigador Pete y sus exclusivas. Restan
**1659 códigos históricos**, incluidas reediciones. Publicación, controles
finales y bloqueos se mantienen únicamente en el [resumen de continuación](continuacion-importacion.md).
