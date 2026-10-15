# 02 · Aspectos legales y de propiedad intelectual

> No es asesoramiento jurídico. Es un resumen de riesgos para decidir el enfoque.

## 1. El código original no tiene licencia

- El repositorio `halogenandtoast/ArkhamHorror` **no incluye fichero LICENSE** y
  GitHub no le asigna ninguna (`license: null`, comprobado vía API).
- Sin licencia, por defecto el autor conserva **todos los derechos**. Que el
  código sea visible en GitHub solo permite verlo y hacer *fork* dentro de
  GitHub; **no** autoriza copiarlo, modificarlo, redistribuirlo ni publicar una
  versión derivada.
- Consecuencia: "coger su código y mejorarlo" para tener **nuestra versión**
  requiere permiso del autor. Sin permiso, una plataforma derivada (aunque sea
  privada entre amigos) es jurídicamente frágil, y publicarla es claramente un
  riesgo.

### Opciones

| Opción | Qué implica | Riesgo |
|---|---|---|
| **A. Reimplementación limpia** (recomendada) | Estudiar el diseño y las reglas, y escribir nuestro propio código, en nuestro propio lenguaje/estructura, sin copiar ficheros ni fragmentos | Bajo respecto al autor |
| B. Pedir permiso / licencia | Contactar con el autor y obtener una licencia por escrito (p. ej. MIT o similar) | Bajo si la concede |
| C. Uso estrictamente personal | Ejecutar su código tal cual en local, sin modificar ni distribuir | Bajo, pero no es "nuestra versión" |

Las ideas, la arquitectura y las reglas del juego **no** están protegidas por
derechos de autor; el texto concreto del código sí. Por eso la opción A es viable.

**Por ello, el código original (ahora en `E:\referencia\ArkhamHorror`) no se
debe subir a nuestro repositorio de GitHub.** Se ha movido fuera del repositorio y nunca se ha hecho commit de él.

## 2. Propiedad intelectual de Fantasy Flight Games (FFG)

Arkham Horror LCG es de Fantasy Flight Games / Asmodee. Afecta a cualquier
implementación, incluida la nuestra:

| Material | Situación |
|---|---|
| Nombre "Arkham Horror", logotipos | Marca registrada. Evitar usarla como nombre del producto |
| Ilustraciones y escaneos de cartas | Derechos de FFG y de los ilustradores. **No** redistribuir |
| Texto de las cartas y de los libros de reglas/campaña | Derechos de FFG |
| Mecánicas y reglas como tales | No protegibles en sí mismas |

FFG ha tolerado históricamente herramientas de fans **gratuitas** (ArkhamDB,
este mismo proyecto, OCTGN), pero es tolerancia, no permiso. Pautas:

- Proyecto **sin ánimo de lucro**, sin publicidad ni pagos.
- Aviso visible "No producido, avalado ni afiliado a Fantasy Flight Games".
- No alojar imágenes de cartas en servidores públicos; idealmente cada usuario
  aporta las suyas o se muestra la carta renderizada solo con texto.
- Nombre propio del producto que no sea "Arkham Horror".

## 3. Datos de terceros

| Fuente | Notas |
|---|---|
| ArkhamDB (`cards.json`) | Datos mantenidos por la comunidad; revisar sus condiciones antes de reutilizar o enlazar su API |
| arkham.build | Requiere registro OAuth con su administrador. No usar las credenciales del proyecto original |
| Audio en `frontend/public/audio` | Tiene licencias propias (Kenney, Ylmir); conservar atribución si se reutiliza |
| Fuentes en `frontend/public/fonts` | Revisar licencia de cada una |

## 4. Los PDF de reglas

Son material con derechos de FFG. Para uso interno de desarrollo son útiles y
razonables; guardarlos **fuera de git** (ver [reglas/](reglas/README.md)) y no
copiar su texto literal dentro de la aplicación publicada.
