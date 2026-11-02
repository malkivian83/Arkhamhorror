# 112 · Búsquedas y ranuras

Lote `slot-search`: tres códigos y tres cartas/niveles distintos nuevos;
sin reediciones. Textos, datos e imágenes originales EN/ES.

| Código | Carta | Comportamiento revisado |
| --- | --- | --- |
| 05283 | Anna Kaslow (4) | Dos ranuras Tarot adicionales. Puede entrar gratis desde la mano inicial y, al entrar, buscar un apoyo Tarot en todo el mazo y ponerlo en juego. |
| 60260 | Archivera de la universidad (0) | Una mano adicional solo para Tomos. Al entrar, buscar un apoyo Tomo entre las seis primeras cartas y añadirlo a la mano. |
| 60181 | Chaleco protector (4) | Una mano adicional solo para Armas de fuego. Después de jugarlo, buscar entre las nueve primeras una carta Arma de fuego o Mejora, incluidos eventos. |

Las reacciones pertenecen únicamente a la instancia que entra o se juega.
Archivera y Anna reaccionan también al entrar mediante efectos; el Chaleco
requiere haber sido jugado. Las búsquedas pueden fallar o rechazarse y barajan
el mazo; añadir la carta encontrada no abre ventanas de robo.

`SearchDeck` y `TakeFromDeck` admiten ahora `to: 'put'` para poner un apoyo en
juego. No paga recursos ni lo juega, y conserva las ventanas de entrada y las
comprobaciones de ranuras. La búsqueda excluye apoyos únicos ya en juego. Las
modalidades anteriores de añadir a mano o jugar conservan su comportamiento.

Las ranuras se prueban con dos armas ordinarias en las manos: solo un Tomo o
Arma de fuego respectivamente admite la tercera mano. Anna permite tres Tarots
y, cuando deja el juego, deben resolverse las ranuras que quedan excedidas.

Presentación: seis escaneos y seis miniaturas EN/ES, huellas SHA-256 y hoja de
contacto de seis caras revisada. Inventario histórico y entradas previas
conservados; códigos, títulos/niveles y registros únicos comprobados.

Validación: 90 pruebas del lote/integración/conversión; se afinaron y pasaron los
tres casos de mano restringida y búsqueda sin robo. Otras 122 pruebas de motor,
ranuras y búsquedas. Tipos cards/engine, lint/formato y build web del alcance.
Reutilizar resultados mientras no cambien módulos, contratos, recursos o
dependencias afectados. Sin navegador ni consulta de CI/Deploy.

Acumulado: 1097 códigos jugables, 1019 históricos jugables y 964 históricos
pendientes, incluidos 573 estándar. Los pendientes incluyen impresiones.

Fuentes: [Anna Kaslow](https://arkhamdb.com/card/05283),
[Archivera de la universidad](https://arkhamdb.com/card/60260) y
[Chaleco protector](https://arkhamdb.com/card/60181).
