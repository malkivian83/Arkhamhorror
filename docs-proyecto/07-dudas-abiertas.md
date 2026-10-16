# 07 · Dudas abiertas

Decisiones que necesitamos antes de empezar a programar. Anotar la respuesta y
la fecha debajo de cada una.

## 1. Enfoque legal (bloqueante)

¿Reimplementación propia desde cero (recomendado), o intentar pedir licencia al
autor original para partir de su código? Ver [02](02-aspectos-legales.md).

> Respuesta (2026-10-15): **reimplementación propia desde cero**; el código
> original solo se usa como referencia de diseño.

## 2. Para quién es la plataforma

¿Uso propio y de un grupo cerrado de amigos, o abierta al público en internet?
Cambia los requisitos de seguridad, hosting y el riesgo con FFG.

> Respuesta:

## 3. Lenguaje y experiencia del equipo

¿Qué lenguajes domináis? Propuesta: TypeScript en todo. ¿Alguien sabe Haskell y
quiere mantenerlo?

> Respuesta (2026-10-15): **TypeScript**.

## 4. Contenido inicial

Propuesta: caja básica (Night of the Zealot) y crecer campaña a campaña.
¿Hay alguna campaña prioritaria?

> Respuesta: (2026-10-15) el reglamento aportado es el de la **nueva caja básica (2026)**;
> se empieza por su campaña, **Brethren of Ash** ("Spreading Flames"). Falta la guía de campaña.

## 5. Imágenes de cartas

¿Cartas renderizadas por plantilla (texto + iconos), imágenes que cada usuario
aporta en local, o ambas?

> Respuesta (2026-10-16): **imágenes de ArkhamDB cargadas al vuelo** por el
> navegador (no se guardan en el repositorio), con plantilla propia si fallan.

## 6. Texto de las cartas

¿De dónde sale el texto EN/ES? Opciones: introducirlo a mano, importarlo de una
fuente cuyas condiciones lo permitan, o mostrar solo nombre y estadísticas.

> Respuesta:

## 7. Funciones extra

¿Interesan en algún momento: cartas caseras (homebrew), modo espectador, chat,
eventos épicos, el juego de tablero 3ª edición? (Propuesta: no en la v1.)

> Respuesta:

## 8. Hosting

¿Dónde se ejecutará: solo en local, un VPS propio, otro proveedor?

> Respuesta:

## 9. Código original en `E:\Arkham`

Propuesta: moverlo a una carpeta fuera del repositorio (p. ej.
`E:\referencia\ArkhamHorror`) y dejar `E:\Arkham` solo para nuestro proyecto.

> Respuesta (2026-10-15): **hecho**; movido a `E:\referencia\ArkhamHorror`.
