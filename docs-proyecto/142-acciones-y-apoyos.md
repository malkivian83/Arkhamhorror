# 142 · Acciones y apoyos de pruebas

Lote `action-support`: **20 códigos, 20 diseños o niveles nuevos, 0 reediciones**.
Se conserva el inventario histórico y sus huellas; solo se activa el grupo revisado.

| Código | Carta                   | Nivel |
| ------ | ----------------------- | ----: |
| 03028  | Sigilo                  |     0 |
| 52005  | Sigilo                  |     3 |
| 07309  | Jacob Morrison          |     3 |
| 07304  | El hilo de Ariadna      |     3 |
| 04155  | Sicario ejecutor        |     0 |
| 09090  | Posesión abominable     |     1 |
| 10118  | Persistencia            |     1 |
| 11052  | Vacile                  |     0 |
| 07022  | Grimorio críptico       |     0 |
| 05192  | Espada encantada        |     3 |
| 08104  | Profesor William Webb   |     0 |
| 08106  | Profesor William Webb   |     2 |
| 11081  | Cadena de ancla         |     0 |
| 11082  | Garfio                  |     0 |
| 11084  | Cartas náuticas         |     0 |
| 08087  | Apuntado preciso        |     1 |
| 08088  | Escopeta vieja          |     2 |
| 04304  | Queroseno               |     1 |
| 09094  | Devorador de pecados    |     3 |
| 07273  | Purificar la corrupción |     4 |

## Reglas y diferencias

- Sigilo (0/3) reduce la dificultad de evasión en dos, desengancha sin agotar y
  evita que ese enemigo vuelva a enfrentarse con su controlador durante ese turno.
  La mejora usa una habilidad rápida durante el turno; otros investigadores siguen
  siendo candidatos de enfrentamiento. Vacile, por el contrario, agota al
  enemigo y conserva el enfrentamiento; concede Alerta durante la prueba y roba
  solo al tener éxito.
- Sicario ejecutor añade un daño a la siguiente instancia de daño de ese
  enemigo durante el turno, no a todas las instancias ni solo al siguiente ataque.
  Una instancia de cero daño no consume el efecto.
- Cadena de ancla, Garfio y Cartas náuticas comparten su acción desde la mano y
  desde juego. En mano se descartan en lugar de agotarse. La copia que inicia la
  prueba conserva su efecto aunque haya dejado la mano. Al tener éxito permiten
  descartar otra carta para su efecto adicional; la Cadena respeta la exclusión
  de enemigos Élite. El daño adicional del Garfio forma parte del ataque.
- Espada encantada (3) ofrece gastar la carga después de tener éxito, antes del
  daño. Solo una derrota con la hoja potenciada roba una carta y cura un horror.
- Webb (0) sustituye una sola pista básica por un Objeto recuperado o una pista
  conectada; conserva las pistas adicionales. Webb (2) recupera el Objeto y puede
  sustituir además la pista. No se sustituye una pista de una investigación remota
  como si fuese de la localización propia.
- Jacob no se prepara en mantenimiento; puede prepararse por una Bendición
  revelada en su prueba y agotarse para modificar un fallo. El hilo de Ariadna
  presta secretos a apoyos de cualquier investigador en su misma localización;
  mover un secreto a recursos no es ganar recursos y no dispara esa reacción.
- Persistencia puede comprometerse desde el descarte, también como ayuda con
  confirmación de su dueño y restricciones de Peligro. Solo esa copia vuelve
  barajada al mazo al terminar la prueba. Posesión abominable elige su efecto al
  comprometerse sobre un apoyo: perdición y dos comodines, o un efecto diferido
  de reposición/retirada de perdición si hay éxito. Este último persiste si la
  habilidad vuelve a la mano. Reponer respeta el valor de usos del apoyo;
  [aclaración de la carta](https://arkhamdb.com/card/09090).
- Queroseno requiere una derrota en ese Lugar durante esa ronda. Cura hasta dos
  horrores repartidos entre investigadores y Aliados; su último suministro lo
  descarta sin perder la curación pendiente. Devorador de pecados mueve una
  perdición desde otro apoyo, luego lo prepara o coloca una carga compatible;
  su acción retira toda su perdición. Conserva Permanente y Excepcional.
- El Grimorio exige diez Maldiciones en la bolsa para traducirse y sustituye
  cinco por Bendiciones. Purificar la corrupción paga daño/horror para cancelar
  una Revelación no Debilidad, acumula corrupción y sale de juego al llegar a
  tres. Su habilidad rápida roba Encuentro como coste y permite curarse o retirar
  corrupción.
- Apuntado preciso convierte los cinco símbolos indicados —incluido el fallo automático—
  en cero durante la siguiente acción de combate del turno con Arma de fuego o
  A distancia. Conserva las fichas físicas para devolverlas correctamente. La
  Escopeta vieja entra con dos municiones mientras se resuelve un evento y con
  cero normalmente; su daño depende del margen y respeta el máximo de tres.

## Evidencia y recursos

- `approvals.json` conserva el paquete de origen `3c8ee4b5d8100766`, la revisión,
  los módulos y pruebas, y las huellas SHA-256 de las fuentes oficiales EN/ES.
  El generador reproduce los datos y rechaza códigos ya presentes en otros lotes.
- Pruebas de registro, efectos principales y diferencias; compra/catálogo único,
  traducciones oficiales y arte local EN/ES. No se abre navegador: la presentación
  conserva el componente de cartas existente.
- El lote añade 40 escaneos EN/ES y 40 miniaturas. Durante el trabajo se integra
  `c7c89a93` (Ciudad de los Antiguos), cuyo catálogo deja la cobertura global sin
  imágenes. Se completan también sus 31 códigos de escenario y nueve reversos:
  80 escaneos EN/ES y sus 80 miniaturas. No se modifican sus reglas.
- Verificación amplia: 624 archivos y 6897 casos de motor, cartas e importación.
  Cierre: 266 casos dirigidos de reglas, consumidores, conversión y web; tipos
  engine/cards, lint/formato y build web correctos; 6039 escaneos/miniaturas
  verificados. Sin pruebas de navegador.

Acumulado: **1471 jugables**, **646 históricos pendientes**, incluidos **271
estándar con impresión**. No se habilitan cartas por disponer solamente de datos.

Siguen pendientes grupos que requieren otras conexiones: elecciones múltiples de
Olive, cartas vinculadas y acceso a cartas adjuntas; Sigilo y los nuevos apoyos no
suplen esos requisitos. Primera guardia y Liberación mantienen sus bloqueos de
reparto privado/control del Mito.
