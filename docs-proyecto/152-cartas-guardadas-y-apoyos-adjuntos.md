# 152 · Cartas guardadas y apoyos adjuntos

Lote `asset-containers`, sobre `74b8f789`: **trece códigos y trece cartas o niveles
distintos nuevos**, sin reediciones ni vinculadas nuevas. Fuentes EN/ES completas,
huellas y aprobaciones en `packages/cards/src/asset-containers/`. Los catálogos e
inventarios históricos se conservan.

## Reglas revisadas

| Código | Carta / nivel | Implementación y diferencias |
| --- | --- | --- |
| `04037` | Mochila (0) | Reacción opcional: busca en seis cartas hasta tres Objetos o Suministros no Debilidad. Las guarda boca abajo y permite jugarlas como desde la mano, pagando costes y restricciones. Se descarta si no guarda ninguna. Coste impreso: 2. |
| `53011` | Mochila (2) | Busca entre doce cartas y cuesta 1; conserva el máximo de tres y las restantes reglas del nivel 0. |
| `08067` | Atlas astronómico (3) | Agota para mirar la carta superior: no busca ni roba. Guarda una no Debilidad, hasta cinco; una Debilidad permanece arriba. Compromete una copia elegible durante una prueba en su Lugar, una vez por prueba. La copia vuelve a la mano después de terminar con éxito; al fallar se descarta normalmente. El límite termina con la prueba aunque el Atlas esté en blanco en ese momento. |
| `10121` | Chaqueta de caza (2) | Agota y guarda una carta no Debilidad de la mano, hasta tres. Gana recursos por el total guardado. Al ser derrotada puede robar todas: el grupo sale del contenedor antes de resolver los robos. Descartarla por otra causa no concede esos robos. |
| `11059` | Contactos mafiosos (2) | Excepcional y límite de una copia. Reacciona al descarte real de un apoyo Ilícito controlado, agotándose; no a devolverlo a mano ni retirarlo del juego. Guarda una carta y no la sustituye si ya hay otra. Robarla cuesta una acción y dos recursos. Conserva propietario y distingue al investigador que roba de quien recibe la carta en su mano. |
| `04021` | Dra. Elli Horowitz (0) | Reacción opcional: busca un apoyo Reliquia entre nueve cartas y lo pone directamente en juego adjunto, sin pagar su coste. No ocupa ninguna ranura, conserva su texto y queda bajo control del investigador. Entra adjunto antes de comprobar ranuras. |
| `06324` | Abigail Foreman (4) | Adjunta o intercambia un Tomo, máximo uno; elimina solo sus ranuras de mano. Después de resolver su capacidad de acción, puede agotarse para repetir sus efectos, sin repetir el coste de acción, agotamiento ni secretos iniciales. Los costes adicionales dentro de los propios efectos siguen resolviéndose. |
| `09076` | Asesino a sueldo (3) | Al entrar puede poner un apoyo Ilícito de la mano en juego adjunto, sin pagarlo. El apoyo sigue ocupando sus ranuras. Agota al aliado y paga un recurso para resolver una capacidad de acción adjunta: omite los símbolos de acción, conserva los demás costes y fija el valor base de la prueba en cuatro. |
| `08089` | Pistolera de desenfundado rápido (4) | Adjunta o intercambia un Arma de fuego que ocupe una ranura de mano; máximo una. Elimina las ranuras de mano del adjunto, conservando las demás. Agota la Pistolera para resolver un ataque del adjunto sin pagar sus símbolos de acción; sigue gastando munición y los demás costes. |
| `09120` | Cinturón de herramientas (0) | Agota para adjuntar, intercambiar o desvincular una Herramienta. Sus adjuntos no ocupan ranuras y su texto queda en blanco, conservando rasgos y fichas. No se inventa un límite de adjuntos que la carta no imprime. Desvincular restaura el texto y comprueba las ranuras. |
| `09092` | Elle Rubash (2) | Agota para adjuntar o intercambiar un apoyo controlado con perdición, máximo dos. Una perdición por adjunto no cuenta para el umbral; las demás sí. Da +1 a las pruebas del apoyo adjunto. No elimina sus ranuras ni modifica sus fichas. |
| `08074` | Apaño improvisado (0) | Evento con tres usos de durabilidad, separado de los usos del apoyo. Se adjunta a un Objeto de un investigador en su Lugar. Su controlador gasta durabilidad para obtener +2 durante una prueba del apoyo. Al agotarse sus usos no se inventa una instrucción de descarte. |
| `07261` | Arma encantada (3) | Se adjunta a un Arma de un investigador en su Lugar, máximo una por apoyo. Le concede Reliquia y una ranura arcana adicional. Durante el ataque, el controlador del Arma puede agotar el evento para añadir la Voluntad de su propietario al Combate y +1 daño. El bonus de Combate no se aplica a una habilidad sustitutiva. La Reliquia concedida también es visible para las reglas existentes de Whitton Greene. |

## Reglas compartidas e integración

Las cartas boca abajo están fuera de juego: no conceden habilidades y no forman
parte de la mano. Jugar desde Mochila conserva sus restricciones, costes y copia
física; si hay copias en varios orígenes se elige el origen. Los adjuntos boca
arriba permanecen en juego. Intercambiarlos conserva usos, daño, horror, perdición,
control y mejoras, sin disparar salidas de juego.

La [respuesta oficial de febrero de 2025](https://arkhamdb.com/card/09076) permite
intercambiar entre contenedores: la carta que llega como resultado del intercambio
no necesita cumplir la condición de selección inicial del nuevo contenedor.
Se cubre el intercambio real entre Cinturón y Asesino a sueldo. Los ciclos de
adjuntos se rechazan. Al salir el contenedor, sus cartas van al descarte de sus
propietarios y los apoyos adjuntos salen mediante el flujo normal de descarte.

El [Atlas](https://arkhamdb.com/card/08067) conserva la autorización de comprometer
una carta adicional a una prueba ajena elegible. Las búsquedas de Mochila y Elli
utilizan la ventana compartida de Investigación del lote 151, con sus límites y
cancelación de búsquedas. Se respetan las restricciones de Peril y de capacidades
rápidas.

Guardados serializables con propietario de cada carta y relación entre apoyos;
el lector comprueba propietarios y rechaza ciclos. En la mesa se pueden consultar
las cartas guardadas propias y los apoyos adjuntos; se muestran los usos de las
mejoras. La proyección online conserva las relaciones y contadores públicos,
ocultando la identidad de las cartas boca abajo a los demás investigadores y
espectadores. La vista de un jugador ajeno no permite abrir su pila privada.

Presentación EN/ES completa, veintiséis escaneos y miniaturas, compra y preparación,
«Novedades», pruebas de reglas, fuentes, duplicados, guardado, SSR y privacidad
online. Se actualizan los consumidores que cuentan ranuras ocupadas y los que
necesitan los rasgos de los apoyos en juego. Resultados finales en el resumen de
continuación; no se realizan pruebas de navegador.

## Dos candidatas revisadas que siguen pendientes

- `05279` Dayana Esperence: hace falta conservar el evento adjunto durante su
  resolución, sin confundir su copia con las del descarte, y cancelar su resolución
  si Dayana sale al pagar los costes, según la
  [respuesta oficial](https://arkhamdb.com/card/05279). La infraestructura de Mochila
  consume la carta al jugarla y no se reutiliza como aproximación.
- `09114` Katja Eastbank: necesita la ventana posterior al robo de la carta
  superior y anterior a resolver sus efectos, con sustitución y nuevo robo. No
  equivale a reaccionar después de los efectos ni a buscar o mirar la carta.

Ninguna de las dos se activa parcialmente.
