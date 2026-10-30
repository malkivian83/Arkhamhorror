# 97 · Apoyos y pruebas

Lote `support-skills`: 19 códigos y 19 cartas o niveles nuevos, sin reediciones.
Se reconcilió el trabajo preparado antes de actualizar a `cf231865`: Daring
Maneuver 0/2, Police Badge, Clarity of Mind 3 y Healing Words 3 ya estaban
incorporadas y se excluyen. No se reaplica el stash completo ni se sobrescriben
las implementaciones recién publicadas.

## Alcance

- Las diez Composturas: Combat Training, Scientific Theory, Moxie, Grounded y
  Plucky, niveles 1/3. Límite de una Compostura por controlador, coste de recursos
  en pruebas propias, bonificaciones continuas de nivel 3 y restricción de Grounded
  a pruebas de cartas Hechizo. La prioridad de asignación restringe al investigador,
  conservando la elección de otros apoyos; respeta daño/horror directo y capacidades
  impresas de daño/horror de cada versión.
- Arcane Initiate 0/3: perdición obligatoria al entrar, o elección entre perdición y
  dos horrores en nivel 3; búsqueda entre tres cartas para robar un Hechizo de
  cualquier tipo, con agotamiento y barajado.
- Fine Clothes reduce en dos la dificultad de pruebas de Parlamento usando la
  ventana de inicio y `ReduceSkillTestDifficulty`, con mínimo cero.
- Forbidden Knowledge mueve secretos a recursos, sin contarlo como ganar recursos
  ni disparar reacciones de ganancia. Agotamiento, horror como coste y descarte al
  quedarse sin secretos. La distinción se comprueba contra una reacción de control.
- Spirit Athame: agotamiento para sumar dos en pruebas de Hechizo, o ataque con
  Combate +2, sin daño adicional.
- Joey "The Rat" Vigil 0: paga un recurso adicional para jugar un Objeto de la
  mano, conservando coste, permisos y costes adicionales; la capacidad rápida no
  paga una acción de jugar ni provoca ataques de oportunidad.
- Ace in the Hole 3: rápido durante el turno real propio, tres acciones adicionales;
  Excepcional, coste cero y una copia por mazo. Adaptador de datos específico.
- Alchemical Transmutation 0/2: agotamiento y carga; pruebas de dificultad 1/0,
  recursos por margen hasta tres/cuatro, y daño si se revela un símbolo negativo
  o fallo automático. Cuatro cargas en nivel 2 frente a tres en nivel 0.

## Fuentes y presentación

Instantáneas EN/ES junto al módulo, con SHA-256 en `approvals.json`. Preparación
reproducible con `scripts/prepare-support-skills.mjs`, inventario histórico intacto.
Reglas contrastadas con las fichas y FAQ de ArkhamDB, especialmente
[Grounded](https://arkhamdb.com/card/03113),
[Compostura](https://arkhamdb.com/card/08027),
[Forbidden Knowledge](https://arkhamdb.com/card/01058) y
[Joey](https://arkhamdb.com/card/02265).

Textos, nombres y rasgos oficiales EN/ES. Se añaden 38 escaneos y 38 miniaturas,
con procedencias y huellas en los inventarios compartidos. Hoja de contacto de
16 caras representativas inspeccionada, incluidos ambos niveles de Compostura e
Iniciada, As en la manga y Transmutación mejorada. Sin navegador; la revisión en
aplicación queda para el usuario.

## Validación

Pruebas compartidas de diferencias y efecto principal, prioridad de asignación,
directo, costes, permisos, recursos movidos frente a ganados; integración de los
19 códigos en catálogo, compra e inicio y presentación EN/ES. Comprobación
automática de unicidad en todos los JSON y de recursos sin entradas duplicadas.
Controles generales y publicación se registran en el resumen de continuación.
