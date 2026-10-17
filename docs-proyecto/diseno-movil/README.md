# Propuesta de mesa móvil

Prototipo interactivo del diseño móvil, separado de la partida real. Conserva
el tapete, la madera y los paneles de expediente de la mesa actual.

Abre [index.html](index.html) en un navegador. Las fuentes y las ilustraciones
necesitan conexión a Internet. Las imágenes se cargan desde ArkhamDB, como en la
aplicación; no se incluyen copias de las cartas en el repositorio.

## Navegación

- Cabecera con investigador, salud, cordura, recursos y acciones restantes.
- Mano visible con las cinco cartas de ejemplo; tocar una la amplía.
- Vista ampliada de la mano con ilustraciones y nombres de las cartas.
- Barra inferior para mapa, mano, equipo, escenario y diario.
- Paneles superpuestos que conservan la posición del mapa.
- Botón para retomar una prueba pendiente después de consultar otra zona.
- Opciones de texto grande y desplazamiento mediante botones.

La propuesta se revisó a 320 y 390 píxeles. Las acciones del prototipo son
simulaciones locales: no alteran partidas guardadas ni usan el motor de reglas.

## Fuente y exportación

[fuente.html](fuente.html) contiene el diseño editable. `index.html` es su
exportación para abrirlo fuera de la conversación, con almacenamiento local de
la presentación. Después de editar la fuente, vuelve a exportarla con la
habilidad de visualización de Codex y permite `https://arkhamdb.com` en las
directivas `img-src` de la exportación.

Proyecto no oficial de aficionados. No producido, avalado ni respaldado por
Fantasy Flight Games, ni afiliado a ella. Las ilustraciones son de sus
respectivos titulares y no se distribuyen en este repositorio.
