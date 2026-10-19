# Miniaturas nítidas de la mano

19/10/2026. La mano utiliza miniaturas WebP locales de 192 píxeles de ancho,
reducidas con Lanczos y una máscara de enfoque suave desde los originales.
Se muestran a 80 × 112 píxeles, sin repartir el ancho entre las cartas. Cuando
no caben, la mano permite desplazamiento horizontal. La ampliación al pasar el
ratón conserva el original y su traducción; no amplía la miniatura.

Si falla una miniatura se intenta el original y después la alternativa de
idioma habitual. Los escaneos propios opcionales conservan su prioridad.
No se modifican las imágenes originales ni las reglas de juego.

Hay 566 miniaturas, 13.994.172 bytes adicionales en la distribución. No se
descargan todas durante la partida: las cartas de la mano cargan sus imágenes
según se necesitan. El inventario con huellas se conserva en
[miniaturas-cartas.json](evidencias/miniaturas-cartas.json).

Para regenerarlas después de sincronizar originales se ejecuta
`python scripts/generate-card-thumbnails.py` con Pillow (generadas con 12.3.0).
La compilación y CI no necesitan Python: publican los archivos conservados y
`node scripts/verify-card-images.mjs` comprueba su integridad y correspondencia
con los originales.

Comprobación en navegador: cinco cartas a 80 píxeles con miniaturas de 192;
Percepción ampliada a 300 usando el original de 723 píxeles; la ampliación
desaparece al salir de la carta. En ventana de 390 × 640, la mano conserva el
tamaño y permite desplazamiento horizontal. Capturas en
[mano-miniaturas/](evidencias/mano-miniaturas/).

Validación: 575 pruebas, tipos de la web, lint, formato, compilación e integridad
de 566 originales y 566 miniaturas. La prueba física de teléfono sigue pendiente.
