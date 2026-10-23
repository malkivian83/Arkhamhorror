# 70 · Lobby, mazos e inicio compartido

23/10/2026. Continuación de la entrega 69. Se conservan sus cambios locales;
`git pull --rebase` no puede ejecutarse mientras haya cambios sin commit. No se
han apartado, subido ni desplegado cambios.

## Flujo disponible

La navegación incorpora «Jugar con amigos», ruta `/online`. Un usuario con cuenta
verificada crea la mesa, genera un enlace de invitación y lo comparte. El enlace
lleva el token en el fragmento, no en la consulta enviada al servidor. Un invitado
abre el enlace y confirma su incorporación. El anfitrión puede renovar o revocar
la invitación.

Cada miembro elige un mazo inicial o uno de sus mazos locales. Se envía una copia
al servidor; no se modifica su biblioteca ni se acepta un estado de juego del
cliente. El servidor valida mediante `newCampaign` las reglas de construcción y
el contenido disponible. No se permiten investigadores duplicados ni recompensas
de campañas personales. Se puede elegir el reparto de trauma inicial para
In the Thick of It.

El anfitrión configura campaña y dificultad. Cambiar configuración, mazos o
miembros invalida las confirmaciones de preparación. Con al menos dos miembros,
todos con mazo válido y confirmación, el anfitrión puede iniciar.

## Inicio autoritativo

El inicio bloquea la fila de la mesa, comprueba permisos y revisión y genera una
semilla en servidor. Crea la campaña y llama a `startScenario` en modo interactivo.
Se guardan campaña y estado inicial en el mismo JSON privado de la transacción.
La partida queda detenida en su primera pregunta del motor.

Una segunda petición de inicio devuelve el mismo resultado: no vuelve a crear
el escenario ni a barajar. Se revoca la invitación y se impide incorporar nuevos
miembros o cambiar mazos después del inicio. Cada usuario mantiene su asociación
al investigador a través de su selección persistida.

El GET devuelve un DTO explícito: miembros, investigadores seleccionados,
preparación, campaña, dificultad y resumen del escenario. No devuelve manos,
orden de mazos, semilla, cola de efectos, respuestas ni estado completo. Todos los
miembros pueden recuperar el mismo inicio tras recargar o reinstanciar el servicio.

No hay cambios de esquema adicionales a la migración 004. Las propiedades nuevas
son opcionales en almacenamiento para permitir abrir lobbies creados en la entrega
anterior. Las tablas normalizadas y la política de migración/versiones de partidas
siguen pendientes antes de ampliar el ciclo de juego.

## API añadida

Todas las rutas son POST bajo `/api/online/lobbies/:id` y requieren cuenta,
Origin/CSRF del middleware existente y revisión esperada:

| Ruta | Cuerpo adicional | Permiso |
| --- | --- | --- |
| `/configure` | `campaignId`, `difficulty` | Anfitrión |
| `/deck` | `deck: { investigator, cards, startingTrauma? }` | Mazo propio |
| `/ready` | `ready: boolean` | Preparación propia |
| `/start` | Ninguno | Anfitrión |

Un conflicto devuelve `stale_revision`. La interfaz actualiza la mesa y pide
revisar los datos antes de repetir la acción; no repite automáticamente mutaciones.
El sondeo visible cada cuatro segundos evita peticiones solapadas. Cambiar de
cuenta o ruta invalida las respuestas pendientes para no instalar datos antiguos.

## Pruebas

- Servicio: mazos inválidos, investigador ocupado, identidad ajena, revisión
  obsoleta, falta de preparación, invalidación de confirmaciones, configuración
  inválida, inicio simultáneo, recuperación del inicio y bloqueo posterior.
- HTTP: dos identidades crean/unifican mesa, eligen mazos, confirman e inician;
  ambos observan el mismo resultado. Se rechazan cuerpos inválidos.
- Cliente: conflictos, revisiones antiguas, llamadas solapadas y respuestas de
  una cuenta/ruta anterior.
- Renderizado Vue: acceso a cuenta, selección y preparación con inicio desactivado,
  y estado iniciado en inglés. Paridad EN/ES comprobada.

Resultado dirigido: 15 pruebas superadas y una omitida (MySQL real, requiere
`MYSQL_TEST_URL`). La concurrencia con adaptador de memoria no sustituye la
verificación con MySQL; esta limitación se conserva de la entrega anterior.
No se ha realizado una sesión visual en dos navegadores ni aplicado la migración
a producción. No se ha repetido la auditoría de reglas ni consultado CI/Deploy.

## Límite de esta entrega

El lobby es utilizable y el inicio compartido queda persistido, pero todavía no
se puede resolver la primera pregunta ni jugar el escenario desde la web online.
La pantalla lo indica expresamente. No se conecta esta partida a `/game`, que
continúa siendo el modo local, ni se copia su estado al navegador.

El siguiente tramo es la mesa interactiva: proyección por usuario, comandos con
identificador/pregunta/revisión, deduplicación persistente, propiedad de todas las
ventanas de decisión y recuperación de eventos. Una vez implementado se podrá
validar una partida completa con dos navegadores y después cuatro investigadores.
