# 07 · Decisiones y cuestiones abiertas

Registro revisado el 19/10/2026. Conserva las decisiones iniciales e incorpora
el estado observado en el repositorio. Las cuestiones aún abiertas no impiden
el juego local. Para tareas de desarrollo y aceptación, consultar la
[hoja de ruta](05-hoja-de-ruta.md).

## 1. Enfoque de implementación

¿Reimplementación propia desde cero (recomendado), o intentar pedir licencia al
autor original para partir de su código? Ver [02](02-aspectos-legales.md).

> Respuesta (2026-10-15): **reimplementación propia desde cero**; el código
> original solo se usa como referencia de diseño.

> Actualización (19/10/2026): se consultaron la referencia local y los PDF
> disponibles para contrastar reglas y resolver discrepancias. La copia de
> referencia permanece fuera del repositorio; las convenciones del proyecto
> se recogen en el [documento 06](06-convenciones.md).

## 2. Para quién es la plataforma

¿Uso propio y de un grupo cerrado de amigos, o abierta al público en internet?
Cambia los requisitos de seguridad, hosting y el riesgo con FFG.

> Estado (19/10/2026): están implementados el registro abierto con verificación,
> Google y el modo invitado, según la decisión recogida en el [documento 21](21-cuentas-y-guardado-en-servidor.md).
> Queda concretar el alcance de apertura al público y las políticas operativas
> de privacidad, retención y copias descritas en el [documento 22](22-implementacion-cuentas-mysql.md).

## 3. Lenguaje y experiencia del equipo

¿Qué lenguajes domináis? Propuesta: TypeScript en todo. ¿Alguien sabe Haskell y
quiere mantenerlo?

> Respuesta (2026-10-15): **TypeScript**.

## 4. Contenido inicial

Propuesta: caja básica (Night of the Zealot) y crecer campaña a campaña.
¿Hay alguna campaña prioritaria?

> Respuesta: (2026-10-15) el reglamento aportado es el de la **nueva caja básica (2026)**;
> se empieza por su campaña, **Brethren of Ash** ("Spreading Flames").

> Actualización (19/10/2026): guía disponible y los tres escenarios con cierre
> técnico local. La Gala tiene las fases 1–3 completadas y está pendiente de
> victorias completas, aceptación visual y publicación estable.
> La siguiente campaña por añadir aún no está elegida en esta documentación.

## 5. Imágenes de cartas

¿Cartas renderizadas por plantilla (texto + iconos), imágenes que cada usuario
aporta en local, o ambas?

> Respuesta (2026-10-16): **imágenes de ArkhamDB cargadas al vuelo** por el
> navegador (no se guardan en el repositorio), con plantilla propia si fallan.

> Sustituida por el requisito posterior de almacenar y servir las imágenes
> desde nuestra web. Estado revisado el 19/10/2026: manifiesto e imágenes locales,
> prioridad ES, alternativa EN y plantilla cuando falta el archivo. Ver la
> [entrega de imágenes](18-auditoria-cierre-la-gala.md#imágenes-almacenadas-por-nuestra-aplicación).

## 6. Texto de las cartas

> Estado observado (19/10/2026): hay presentación EN/ES, textos de historia y
> datos/resúmenes locales para Brethren y los 62 códigos y caras de Gala.
> **G18 queda cerrado** con pruebas de respaldo EN/ES y fallos de carga;
> la aceptación visual pertenece a la fase 4 de la
> [auditoría 18](18-auditoria-cierre-la-gala.md). Los resúmenes locales no son
> una transcripción íntegra del texto oficial de cada carta.

## 7. Funciones extra

¿Interesan en algún momento: cartas caseras (homebrew), modo espectador, chat,
eventos épicos, el juego de tablero 3ª edición? (Propuesta: no en la v1.)

> Estado (19/10/2026): editor de cartas y herramientas de depuración siguen
> como ampliaciones futuras. Multijugador, lobby, reconexión a una partida
> compartida y espectador quedan fuera del alcance actual. No hay una prioridad
> de desarrollo confirmada aquí para chat, eventos épicos o el juego de tablero.

## 8. Hosting

¿Dónde se ejecutará: solo en local, un VPS propio, otro proveedor?

> Decisión recogida el 19/10/2026: **VPS propio con Plesk y MySQL/MariaDB**.
> Dominio incorporado: `arkham-online.es`. Workflow, paquete e instalador
> implementados; ver [guía 23](23-despliegue-plesk.md). La aceptación operativa
> de producción se mantiene separada de la implementación.

## 9. Código original en `E:\Arkham`

Propuesta: moverlo a una carpeta fuera del repositorio (p. ej.
`E:\referencia\ArkhamHorror`) y dejar `E:\Arkham` solo para nuestro proyecto.

> Respuesta (2026-10-15): **hecho**; movido a `E:\referencia\ArkhamHorror`.

> Ubicación actual revisada el 19/10/2026: `D:\referencia\ArkhamHorror-main`;
> el repositorio propio está en `D:\Arkham`.

## 10. Nombre del producto

> Estado observado (19/10/2026): **Arkham Online**, incorporado en la interfaz.
> La elección de nombre ya no es una tarea pendiente de desarrollo.
