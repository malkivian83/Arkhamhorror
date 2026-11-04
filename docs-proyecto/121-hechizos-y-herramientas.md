# 121 · Hechizos y herramientas de campo

Lote `spell-field-tools`: 30 códigos nuevos; 30 cartas, niveles o variantes
con subtítulo distintos, sin reediciones. Se conservan el inventario congelado,
las fuentes EN/ES y sus huellas. La conversión exige adaptadores restringidos
para las dos permanentes y la carta Excepcional.

| Código | Carta | Nivel |
| --- | --- | --- |
| 60478 | Experiencia arcana | 4 |
| 60479 | Jim Culver · Músico embrujado | 4 |
| 60580 | Arco largo | 3 |
| 60474 | Maldición de Azathoth | 3 |
| 60475 | Daga ritual | 3 |
| 60463 | Favor de Baalshandor | 0 |
| 60465 | Forma espejada | 0 |
| 60555 | Daniel Jameson · Cazador curtido | 0 |
| 60556 | Perra de caza | 0 |
| 60561 | Lo mismo de siempre | 0 |
| 60461 | Fundirse en las sombras | 0 |
| 60482 | Fundirse en las sombras | 5 |
| 60416 | Voz de Ra | 0 |
| 60256 | Registros de ocultismo | 0 |
| 60259 | Pergamino de los faraones · Sin traducir | 0 |
| 10119 | Diablo · ¿Amigo o enemigo? | 2 |
| 60280 | Pergamino de los faraones · Palabras de Ra | 4 |
| 60281 | Pergamino de los faraones · Palabras de Set | 4 |
| 60282 | Comunión con el cosmos | 5 |
| 60175 | Recarga de munición en culata | 2 |
| 11024 | Preparado para lo que sea | 0 |
| 11027 | Alice Luxley · Poli intrépida | 2 |
| 11030 | Cargado y listo | 3 |
| 11049 | Anticitera · Reloj profético | 5 |
| 11104 | Walter Fitzpatrick · Jugando a dos bandas | 2 |
| 11102 | En dirección al horizonte | 2 |
| 11110 | Dakota Garofalo · De caza | 3 |
| 11112 | Apoyo sólido | 3 |
| 11113 | Armadura de trinchera | 3 |
| 11106 | Despertar verdadero | 2 |

## Reglas revisadas

- Hechizos y armas: pruebas y habilidades impresas, gastos de uno o dos secretos,
  daño y pistas adicionales por secreto; investigación previa para mejorar los
  Pergaminos. Arco largo ignora Indiferente y repone únicamente la flecha que falta.
  Maldición de Azathoth es Excepcional: cuesta seis PX y admite una copia. Coloca perdición como coste, retira una al derrotar y toda
  al revelar calavera o cosa antigua. Daga ritual suma voluntad y reacciona después
  de resolver el evento Hechizo, con daño y agotamiento como costes.
- Movimiento y apoyos: Fundirse en las sombras no gasta cargas para evitar, pero puede
  gastar una tras el éxito para moverse (una o dos conexiones según nivel); tablilla
  consume una carga y, si no queda ninguna, hace perder una acción y descarta el apoyo.
  Se respetan los bloqueos de movimiento y entrada. Dakota mueve y enfrenta;
  Perra de caza mueve una vez hacia el enemigo que acaba de entrar en juego.
- Eventos: Favor paga su daño adicional antes de los efectos, incluso si se
  cancelan; Forma espejada pone en juego, y devuelve al mazo solo la instancia que
  sigue en juego al final de ronda. Voz de Ra revela tres fichas sin reemplazo,
  conserva el grupo a través de reacciones y devuelve las fichas físicas. Comunión
  utiliza el horror total tras la elección, con máximo de cuatro pistas adicionales.
  La recarga distribuye cinco municiones. Preparado para lo que sea exige la primera acción
  y distingue robar un enemigo esta ronda de otros modos de entrada en juego.
- Restricciones: las seis cartas de rasgos del investigador se filtran en catálogo,
  compra y validación del mazo. No basta con que sean neutrales. Las cartas con
  límite de una en juego por investigador usan el límite por título. La armadura
  cancela el primer ataque de oportunidad de cada ronda, incluidos turnos ajenos.
  Despertar verdadero resuelve dos opciones distintas en el orden elegido.
- Reacciones: Jim exige daño u horror recibido; Daniel repite el combate o evasión
  fallidos tras sus consecuencias sin pagar sus costes de nuevo. Anticitera
  distingue márgenes exactos y concede su acción durante el siguiente turno.
  Alice protege la primera acción de investigar de cada turno y se agota al
  hacer daño tras descubrir pistas. Los gastos de usos y recursos siguen sus
  restricciones de tipo y proximidad.

## Correcciones del motor

Mover daño u horror deja de contarse como curar o infligir daño: comprueba que
exista la ficha, conserva las cantidades y comprueba la derrota del destino.
Los apoyos recién derrotados conservan su ventana de habilidad obligada, como
ya ocurría con las reacciones. Esto permite resolver la explosión de Diablo.
Los ataques registran si son de oportunidad y abren también la ventana obligada:
la armadura consulta el primer ataque de la ronda, incluso si entró después de
otro ataque o si sale de juego y vuelve a entrar.
Se añaden costes adicionales de juego, bonificaciones de usos iniciales y la
conservación temporal de fichas reveladas fuera de pruebas. Los nuevos campos
serializados son opcionales; se prueba una continuación tras guardar y cargar.

## Presentación y validación

Textos, nombres, rasgos y subtítulos oficiales EN/ES; 60 escaneos y 60 miniaturas
con huellas conservadas. Hoja de contacto representativa revisada sin navegador.
La imagen española descargada de Arco largo muestra coste 2, pero los datos
EN/ES y ambas fichas de ArkhamDB indican 3. La aplicación mantiene coste 3 y usa
su escaneo inglés también en español, conservando el texto español. El escaneo
español original queda registrado como evidencia y no se selecciona para mostrarlo.

Validación: reglas de las 30 cartas, costes y restricciones; compra, mejoras,
registro único, comienzo de escenario y presentación; motor y consumidores
afectados de movimiento de daño, reacciones, armas, hechizos, mazos y campaña.
Tipos cards/engine, lint/formato y build web. Reutilizar resultados salvo cambios
en las reglas, registros, recursos, contratos o dependencias cubiertos. Sin
pruebas de navegador ni seguimiento de CI/Deploy.

Acumulado: 1141 jugables; 1063 históricos jugables y 920 históricos pendientes,
incluidos 529 estándar (con impresiones).

Referencias: [Arco largo EN](https://arkhamdb.com/card/60580),
[Arco largo ES](https://es.arkhamdb.com/card/60580),
[Pergamino de los faraones](https://arkhamdb.com/card/60280),
[Daga ritual](https://arkhamdb.com/card/60475),
[Despertar verdadero](https://arkhamdb.com/card/11106) y
[referencia de reglas](https://arkhamdb.com/rules).
