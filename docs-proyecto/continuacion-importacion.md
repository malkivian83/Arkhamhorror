# Continuación de la importación

- Lotes 125–128 (09/11): mazos de inicio de Tommy, Carolyn, Marie (60451) y Miguel; 37 códigos, 33 cartas/niveles nuevos, 4 reediciones. Base `91c7430e`.
- Lote 129: `token-reveals`, 16 códigos, 14 cartas/niveles nuevos, 2 reediciones; publicado en main. Detalles en [129](129-revelaciones-de-fichas.md).
- Acumulado: 1287 jugables; 830 históricos pendientes, incluidos 455 estándar con impresiones (inventario 3c8ee4b5d8100766).
- Motor: sustitución «cuando fueses a revelar una ficha de Caos» (`ReplaceNextTokenReveal`), dentro y fuera de pruebas; una sola sustitución por revelación.
- Verificación lote 129: suite engine+cards (603 archivos, 6342 casos), pruebas web del lote, conversión, tipos engine/cards/web, ESLint/Prettier de lo tocado y 5553 imágenes/miniaturas. Invalida: cambios en revelación de fichas, pruebas, registros o recursos.
- Siguiente: apoyos y acciones restantes. Bloqueados: Olive McBride (dos fichas fuera de pruebas), Dados de la suerte, Ajar/Sexto sentido (modificadores de Enemigo, investigar en otro Lugar), bendición/maldición; As de bastos (acción reservable); lotes 98/99/101/102/104/105/107 y debilidad de Rook. Un solo agente; sin reediciones de relleno.
