# 163 · Sefina Rousseau

Investigadora y dos exclusivas: tres códigos nuevos, cero reediciones y cero
cartas estándar nuevas. El mazo oficial incluye tres copias físicas de El mundo
pintado, sin contabilizarlas como tres diseños nuevos.

## Reglas

- Su mano inicial sustituye el robo normal por trece cartas; las debilidades se
  apartan y reemplazan normalmente. Puede colocar hasta cinco eventos debajo,
  conservando ocho cartas y descartando el resto. No puede colocar El mundo
  pintado debajo ni hacer mulligan. Las modificaciones del tamaño inicial cambian
  tanto el robo como lo conservado, según la sección 2.6 de la
  [FAQ oficial](https://images-cdn.fantasyflightgames.com/filer_public/c1/d0/c1d0fab6-7fa6-4ce2-af6a-16416381a19b/ahc_faq_v25_february_2026-web.pdf).
- Los eventos bajo Sefina están fuera del juego, separados de mano y descarte,
  según la [FAQ de Sefina](https://arkhamdb.com/card/03003). Se pueden consultar
  desde su zona propia en la mesa, también online, sin revelar cartas de su mano.
  Su acción roba uno de esos eventos sin provocar ataques de oportunidad. El
  signo arcano da +3 y permite robar uno sin acción. Se respetan las prohibiciones
  de robo y se emiten las ventanas de cartas robadas.
- El mundo pintado copia un evento no Excepcional de debajo de Sefina, también
  si otro investigador juega la carta por un efecto, sin consumir
  ese original. Las acciones y las reacciones se ofrecen con las restricciones,
  designadores, ventanas, costes y objetivos del evento copiado. Se pagan recursos,
  costes adicionales, valores X y variantes mediante el mismo flujo de juego.
  Un evento rápido no se ofrece como acción normal; los ataques de oportunidad
  dependen del evento copiado.
- La carta física y el evento que resuelve se conservan por separado. No se añade
  una copia ficticia al descarte ni se consume una carta real del mismo código.
  La retirada obligatoria impide recuperar la copia como si fuera un evento real
  descartado. Una vinculación mantiene el texto copiado mientras está en juego;
  al abandonar el juego recupera la identidad física, o se retira si se descarta.
  Se cubren vinculaciones a Lugar, apoyo y Enemigo, pérdida del anfitrión y guardados.
- Si va a victoria, se convierte en El mundo pintado y no conserva los puntos del
  evento copiado. Soltar el alma puede seleccionarla como Hechizo antes de que
  copie un evento sin ese rasgo. La retirada durante resolución la hace inelegible
  para repetirla con Double, Double; véanse las
  [respuestas oficiales de El mundo pintado](https://arkhamdb.com/card/03012),
  que sustituyen la antigua respuesta sobre repetir el evento.
- Estrellas de las Híades retira un evento aleatorio de debajo de Sefina; si no
  hay ninguno, inflige un daño y un horror. Con cinco o más cartas restantes se
  baraja de nuevo; con cuatro no. Usa el generador determinista de la partida y
  conserva el resultado al guardar y recargar.

## Lista y presentación

[Lista oficial FFG 6645](https://arkhamdb.com/decklist/view/6645/sefina-rousseau-ffg-starter-deck-1.0)
archivada sin descripción, conservando códigos y cantidades. El diagnóstico
inicial encontró 27 códigos ya jugables y los tres del lote pendientes. La
integración comprueba tamaño 33, tres copias de la exclusiva, debilidad propia,
selección y comienzo de campaña. Solo el marcador 01000 se sustituye por la
misma debilidad básica real 12104 utilizada por los otros mazos iniciales.

Datos y textos EN/ES, narración y reverso en `sefina-rousseau/`, con huellas y
`scripts/prepare-sefina-rousseau.mjs`. Ocho escaneos, ocho miniaturas y un retrato
nuevos. Novedades y caché actualizadas. Sin navegador; presentación online
comprobada con renderizado por consola y miniatura representativa en visor local.

Tras el lote: **31 investigadores habilitados y 37 pendientes**, excluidas
alternativas, reediciones y Homúnculo perdido. Siguen pendientes 134 cartas
estándar. Siguiente grupo: revisar William Yorick y su lista oficial; los controles
finales están en el resumen común.

El diagnóstico final de consola agotó el transporte SSR de Vite. La lista exacta
pasó la validación de integración, con todos sus códigos implementados. La suite
pertinente, los tipos y el empaquetado están registrados en el resumen común.
