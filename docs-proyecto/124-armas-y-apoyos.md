# 124 · Armas, apoyos y tarots

Lote `combat-support`: 12 códigos nuevos, 12 diseños o niveles distintos,
0 reediciones, sobre `bcdf1262`. Fuentes EN/ES y SHA-256 conservados en aprobaciones.
El adaptador de los dos tarots exige sus facciones, niveles y espacio impreso exactos.

| Código | Carta                   | Nivel |
| ------ | ----------------------- | ----- |
| 02304  | Subfusil Thompson       | 4     |
| 60411  | Péndulo de cristal      | 0     |
| 54001  | La Estrella • XVII      | 3     |
| 54011  | El Loco • 0             | 3     |
| 11119  | Mauser Tankgewehr M1918 | 5     |
| 11120  | Pisándoles los talones  | 5     |
| 11115  | Soberana de tormentas   | 4     |
| 11117  | Archibald MacVeigh      | 5     |
| 60276  | Informe de autopsia     | 3     |
| 60255  | Crónica del soñador     | 0     |
| 60331  | Beretta M1918           | 4     |
| 10064  | Archivo de chantaje     | 0     |

## Reglas y conexiones

- Subfusil Thompson (Chicago Typewriter): munición y daño impresos, acciones opcionales
  adicionales y +2 por cada acción realmente gastada, también costes impuestos por
  Miedo paralizador. Las habilidades con un tipo de acción reconocible pagan sus
  modificadores y registran ese tipo para no pagar de nuevo el impuesto de primera acción.
- Beretta: +4 y daño adicional; margen de dos permite preparar o añadir daño y margen
  de cuatro aplica ambos antes de resolver el daño. Mauser: solo dispara preparado,
  gasta un proyectil e inflige cuatro daños; recargar agota y repone un proyectil.
- Soberana de tormentas: suma voluntad, conserva el daño normal y después permite
  agotar para infligir daño separado, hasta tres, por símbolos resueltos. Las fichas
  ignoradas/canceladas no cuentan y puede atacar agotado sin ese daño adicional.
- Archibald: +1 intelecto y secretos de apoyos controlados para pagar eventos Inspiración;
  no duplica los donantes. Archivo de chantaje usa salud impresa, excluye Élite,
  desenfrenta y concede Indiferente hasta terminar la ronda.
- Crónica del soñador: secreto, comodín en la primera carta que su controlador compromete
  y horror opcional para una pista adicional. Informe de autopsia investiga tras una
  derrota local usando salud impresa, máximo cinco. Pisándoles los talones gasta una
  pista de sus usos y se agota tras entrar donde hay enemigos, para elegir pista o daño.
- Péndulo de cristal: +1 voluntad; predice un margen de éxito o fracaso en una prueba
  local, también de otro investigador, y roba para su controlador si coincide. La
  selección permite números mayores que nueve; el efecto no necesita que siga en juego.
- El Loco: descuento opcional de uno, pagando el agotamiento. La Estrella aumenta solo
  estadísticas de salud/cordura ya existentes en apoyos propios; capacidades de asignación,
  derrotas y presentación usan los mismos valores. Al perder o anular el aumento se
  comprueba la derrota de los apoyos llenos. Ambos tarots tienen su reacción de mano inicial.

Referencias: [Chicago Typewriter y FAQ](https://arkhamdb.com/card/02304),
[Beretta](https://arkhamdb.com/card/60331),
[Soberana de tormentas](https://arkhamdb.com/card/11115).
24 escaneos y 24 miniaturas nuevos; doce caras representativas revisadas.
Inventarios y huellas históricos sin cambios.

## Verificación y continuidad

39 casos de reglas y 12 de compra/inicio/presentación; conversión compartida reproducible.
Regresión seleccionada de motor, costes, apoyos, daño y escenarios consumidores:
564 casos correctos; las correcciones posteriores se comprueban en los archivos afectados.
Tipos cards/engine, lint/formato y compilación web; verificador de 4598 imágenes y
miniaturas. Reutilizar salvo cambios en reglas, contratos, registros, recursos o
configuración cubiertos. Sin navegador ni seguimiento de workflows.

El As de bastos queda pendiente: requiere reservar la acción hasta un momento posterior
al retiro de la carta y respetar las pérdidas de acciones. No se habilita su borrador.

Acumulado tras publicación: 1178 jugables; 1100 históricos, 883 históricos pendientes,
incluidos 492 estándar contando impresiones. Próximo grupo: acciones especiales y
apoyos pendientes, conservando bloqueos anteriores y sin reediciones de relleno.
