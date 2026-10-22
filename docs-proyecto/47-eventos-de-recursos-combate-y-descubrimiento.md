# 47 · Eventos de recursos, combate y descubrimiento

Se incorporan **3 códigos, 3 cartas o niveles distintos nuevos y 0 reediciones**:

| Código | Carta | Nivel | Diferencia revisada |
| --- | --- | ---: | --- |
| 60118 | Resistir juntos | 0 | Elige otro investigador activo en el mismo Lugar; ambos ganan dos recursos |
| 60111 | Dejarlos limpios | 0 | Gana dos recursos antes de la prueba de combate, acierte o falle; sin ataque de oportunidad |
| 11045 | Siguiendo una corazonada | 2 | Evento rápido en el turno propio; descubre en cualquier Lugar revelado, incluso no conectado |

Los módulos reutilizan selección, combate, recursos y descubrimiento existentes.
No se modifica el motor. La selección excluye compañeros eliminados, enemigos
Distantes sin enfrentar y Lugares sin pistas o sin revelar, según cada carta.
Resistir juntos sí provoca ataques de oportunidad: si derrotan a quien lo juega,
no se reparten los recursos. Dejarlos limpios conserva su origen de evento y
permite usar los recursos durante la prueba. Corazonada dispara los efectos de
descubrimiento del Lugar elegido, no los del Lugar del investigador.

Quince pruebas propias cubren efectos, restricciones, éxito/fallo, disponibilidad
de recursos antes de comprometer, ataques de oportunidad, descubrimiento remoto,
compras, mejora y comienzo de escenario. Corazonada admite una oferta de compra
y otra de mejora cuando hay una copia de nivel cero en el mazo: se comprueba la
unicidad por código y operación, y que mejorar sustituye la copia correcta y
consume dos puntos de experiencia. La unicidad de códigos y familias canónicas
se compara con todos los lotes anteriores y la caja básica.

Reglas EN/ES contrastadas con las fichas de
[Resistir juntos](https://es.arkhamdb.com/card/60118),
[Dejarlos limpios](https://es.arkhamdb.com/card/60111) y
[Siguiendo una corazonada](https://es.arkhamdb.com/card/11045).
Nombres y textos usan la infraestructura existente. Se añaden seis escaneos del
CDN habitual y seis miniaturas selectivas; la comparación automática confirma
que las entradas y huellas históricas permanecen intactas. Miniatura española
de Corazonada revisada como muestra. No cambia la presentación.

Datos regenerables con `node scripts/prepare-dunwich-pilot.mjs direct-events`
desde `3c8ee4b5d8100766`, sin alterar el inventario congelado. Tras publicar:
**327 códigos / 246 familias canónicas**. Sobre los 104 originales:
**223 códigos = 142 registros distintos + 81 reediciones**. Restan **1656 códigos
históricos**, incluidas reediciones. Estado de publicación y controles únicamente
en el [resumen de continuación](continuacion-importacion.md).
