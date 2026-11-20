# 155 · Robo, encuentros y apoyo

Doce códigos y diseños/niveles estándar nuevos; cero vinculadas nuevas y cero
reediciones. Textos oficiales íntegros EN/ES conservados con SHA-256 en
`field-support/source-{en,es}.json`, datos reproducibles y adaptadores cerrados
para el coste X de Absolución y la doble clase de Préstamo sin escrúpulos.
Veinticuatro escaneos y veinticuatro miniaturas nuevos, manteniendo todas las
huellas históricas.

| Código | Carta | Nivel |
| --- | --- | ---: |
| 09037 | Avambrazo del mártir | 3 |
| 09054 | Dr. William T. Maleson | 2 |
| 08049 | Contraespionaje | 1 |
| 09071 | Abrigo elegante | 1 |
| 10123 | Técnica de supervivencia | 2 |
| 06158 | Códice de otro mundo | 2 |
| 10024 | Absolución | 0 |
| 07267 | Ikiaq | 3 |
| 09114 | Katja Eastbank | 2 |
| 11100 | Sueños de la arcilla | 1 |
| 08113 | Préstamo sin escrúpulos | 3 |
| 09063 | Tesoro desfalcado | 0 |

- **Katja:** sustituye cada robo superior antes de las revelaciones; nunca una
  Debilidad ni una sexta carta. La recuperación cuesta una acción, es un robo
  real y resuelve la revelación de la carta recuperada.
- **Ikiaq:** captura solo debilidades básicas de investigadores locales, modifica
  voluntad/intelecto y conserva el propietario de cada carta. Al salir, incluso
  con su texto en blanco, sus propietarios deben robarlas. Se cubre también la
  intercepción durante los robos protegidos de A por todas, sin duplicar cartas.
- **Avambrazo:** +1 en pruebas de revelación de encuentros; redirige el encuentro
  local de otro investigador, excluyendo Peligro, antes de sus efectos.
- **Maleson (2):** puede intervenir en el robo de cualquier investigador; paga
  agotamiento y una pista propia. El destinatario elige entre ambos encuentros,
  con las ventanas de robo, cancelando todos los efectos del descartado.
- **Contraespionaje:** paga los aumentos opcionales de coste; distingue al
  investigador que roba el encuentro del que juega el evento. Cancela la
  revelación, conservando Oleada, y permite elegir el tipo de robo adicional.
- **Abrigo:** usa el origen del efecto ya conservado por el motor; distingue los
  efectos de cartas de los recursos básicos y movimientos. Dos copias pueden
  reaccionar entre sí una vez, sin bucles; incluye capacidades del investigador
  y su signo arcano.
- **Códice:** inspecciona las nueve superiores como búsqueda, descarta una copia
  no Élite en juego y devuelve todas las buscadas antes de barajar. Los Lugares
  descartados derrotan a sus investigadores y descartan sus enemigos, respetando primero las reglas
  especiales de retirada del escenario.
- **Técnica de supervivencia:** devuelve cartas propias vinculadas al Lugar,
  incluidas debilidades de jugador, y puede sumar dos a la prueba de su
  controlador sobre un Lugar o una traición vinculada a él.
- **Sueños:** solo puede comprometerse a pruebas de traición; tras el éxito entra
  en juego sin descartarse y puede retirarse para cancelar una revelación sin
  Peligro. Oleada permanece independiente de la revelación cancelada.
- **Préstamo:** la ganancia de diez es una reacción al jugarlo. Conserva su límite
  en juego y la prohibición de salir; verifica el saldo al terminar o al ser
  eliminado y exilia la carta de su propietario si quedan menos de diez.
- **Tesoro:** mueve recursos, sin gastarlos ni ganarlos; máximo diez. Distribuye
  una bonificación por cada pareja al retirarse o terminar, sin duplicarla tras
  la retirada; se consume una sola vez en la preparación siguiente. El contador
  `uses` representa los recursos visibles del apoyo, sin añadir un texto Usos.
- **Absolución:** paga X, revela un grupo de 3+X fichas físicas sin repetir las
  retenidas, respeta sustituciones/cancelaciones y el límite de bendiciones.
  Cura horror entre investigadores o Aliados locales por las bendiciones
  reveladas y devuelve el grupo a la bolsa.

Se corrigen además dos armas ya publicadas de la campaña del Portador: EX.O.L y
Rusted Blade usan los objetivos legales de combate para incluir jefes globales.
El resto de sus capacidades mantiene sus objetivos locales. La prueba de
Locura del reino usa eventos sin reacciones, para comprobar su descarte sin que
las nuevas cartas de cancelación añadan una ventana opcional ajena al caso.

Aclaraciones contrastadas: [Katja](https://arkhamdb.com/card/09114),
[Maleson](https://arkhamdb.com/card/09054),
[Absolución](https://arkhamdb.com/card/10024),
[A por todas](https://arkhamdb.com/card/04309) y las reglas de cancelación,
robo, cartas fuera del juego y Lugares. Se usa el texto sin Tabú.

Pendientes: Curación espiritual, Dayana y Cepa nutricia mantienen sus requisitos
previos. Lucha sucia necesita conservar el objetivo de las pruebas de negociar
además del combate inmediato restringido; no se activa por equivalencia parcial.

Verificación: regresión amplia inicial de motor/cartas/importación, seguida de
la corrección y repetición dirigida de los controles afectados. Las 42 pruebas
de reglas del lote pasan, junto con fuentes/modelos, presentación EN/ES,
guardados, mesa online, habilidades temporales, robo protegido, origen de
efectos y escenarios conectados. Tipos cards/engine/server/web y formato/lint
correctos; los 24 originales y 24 derivados se verifican mediante SHA-256.
