# 120 · Disparo rápido

Lote `quick-shot`: Disparo rápido (11031, nivel 3). Un código y una carta/nivel
nuevo, sin reediciones.

Evento rápido de coste 2, jugable durante tu turno: inflige un daño a un enemigo
de tu Lugar, incluidos Distante y Élite, respetando inmunidades. No es un ataque,
no hace prueba de habilidad ni provoca ataques de oportunidad. Su reacción solo
se ofrece al robar esta carta durante tu turno; añadirla a la mano no equivale a
robarla. La reacción juega la carta reduciendo su coste en dos, sin ignorar otros
modificadores ni las restricciones para jugar eventos.

Se corrige la comprobación de recursos de las reacciones desde la mano: cuando
su primer mensaje juega la propia carta, se considera el descuento de ese
mensaje. Las demás reacciones conservan la comprobación habitual. Se prueba el
robo sin recursos y el caso con un sobrecoste, tanto asequible como inasequible.
Miríada permite tres copias y paga sus tres puntos de experiencia una sola vez;
la tienda rechaza una cuarta copia.

Validación: cinco pruebas de reglas, compra y presentación EN/ES, conversión de
aprobaciones y consumidores de reacciones (conditional-assets, nathaniel-cho,
damage-turn y pruebas engine/mechanics). Tipos cards/engine, formato/lint y build
web. Escaneos y miniaturas originales EN/ES con huellas y hoja de contacto
revisada. Reutilizar salvo cambios en reglas, registros, recursos o dependencias
cubiertos. Sin pruebas de navegador ni seguimiento de CI/Deploy.

Acumulado: 1111 jugables; 1033 históricos jugables y 950 históricos pendientes,
incluidos 559 estándar (con impresiones).

Fuente: [Disparo rápido](https://arkhamdb.com/card/11031), sin FAQ específica.
Se implementa su coste de experiencia impreso, sin aplicar la lista de tabúes.
