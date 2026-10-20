# 27 · Cierre del piloto de cartas de jugador

20/10/2026. Continuación del [primer lote](26-primer-lote-jugable-cartas-jugador.md).
Se completan las **17 cartas restantes** de las 24 preseleccionadas de Dunwich
(`dwl` y `tmm`). La [matriz actualizada](26-matriz-piloto-jugador.csv) recoge
el módulo y la prueba de cada una.

## Alcance y recuento

| Concepto | Registros |
| --- | ---: |
| Catálogo fuente conservado | 1.983 |
| Definiciones básicas anteriores | 104 |
| Piloto completo | 24 |
| Básicas más piloto | 128 |
| Registros fuera de esa incorporación | 1.855 |

Son registros del inventario de importación, con reediciones, variantes y
dependencias. No equivalen a efectos únicos ni contabilizan como nuevas cartas
del piloto el contenido registrado por escenarios.

## Cartas añadidas

Cachiporra, Provocación, Trabajo en equipo, Solución extraña, Atajo, Buscando
respuestas, Coraje líquido, Improvisar sobre la marcha, Doble o nada, Rito de
búsqueda, Velas rituales, Hacha de bombero, Reclamo, Kukri, «¡Tengo un plan!»,
Ahondar demasiado y ¡Ups!.

Cada carta tiene comportamiento TypeScript y pruebas propias. Los datos se
regeneran desde el inventario inmutable con `node scripts/prepare-dunwich-pilot.mjs`.
Se amplían nombres y resúmenes propios en español e inglés, sin escaneos ni
texto oficial íntegro. La incorporación local no consulta ArkhamDB durante la partida.

## Capacidades del motor y pruebas

- Continuaciones mediante mensajes serializables, conservando decisiones al guardar.
  Se prueba la restauración en la ventana anterior a aparición de un enemigo.
- Movimiento antes de aparición: el enemigo conserva su Lugar previsto aunque el
  investigador se marche con Improvisar sobre la marcha.
- Ventana tras cada ficha revelada para Velas rituales, independiente de la fuente
  de la prueba.
- Resultados calculados después de las reacciones: Kukri paga una acción adicional;
  Hacha y ¡Tengo un plan! calculan daño según los recursos o pistas vigentes.
- Doble o nada repite los resultados del éxito, incluidos los de habilidades
  asignadas; las reacciones y las consecuencias de fichas se resuelven una vez.
- Rito de búsqueda aplica pistas antes de terminar el turno cuando corresponde.
- Trabajo en equipo pide conformidad al cedente, conserva fichas y agotamiento,
  intercambia apoyos simultáneamente y comprueba ranuras. El descarte o retorno a
  mano de un apoyo transferido respeta al propietario original.
- Ahondar demasiado resuelve los encuentros en orden antes de pasar a victoria.

Las pruebas cubren fallos, decisiones opcionales, enemigos Élite, consumo de usos
y límites por ataque. Cada una de las 24 cartas inicia además un escenario real
con un mazo válido. Se mantienen las protecciones de importación de mazos:
conservar los códigos desconocidos y bloquearlos hasta implementarlos.

## Política de reglas y límites

Se mantiene la política inicial **sin tabú opcional**. Doble o nada usa su versión
original; no hay selector de listas de tabú. Véanse las aclaraciones de
[Double or Nothing](https://arkhamdb.com/card/02026) y
[Rite of Seeking](https://arkhamdb.com/card/02028).

Solución extraña registra la identificación en campaña; sus mejoras todavía no
están en este lote. Siguen pendientes el versionado general de reglas de los
guardados y las interacciones con cartas futuras. Las pruebas acreditan este lote,
no todas las combinaciones del catálogo restante.

## Próximo lote

Elegir cartas del inventario por dependencias compartidas, priorizando las
capacidades ya verificadas. Toda activación requiere módulo, prueba, presentación
EN/ES y aprobación explícita en el manifiesto. No se reescriben el inventario
histórico ni sus huellas.

## Verificación de esta continuación

Formato, lint, tipos y compilación correctos. Suite completa: **1.006 pruebas
correctas y 15 omitidas**; las omitidas no acreditan cobertura. La repetición
completa pasó tras corregir dos supuestos antiguos de las pruebas (coste ausente
en habilidades y comillas en nombres) y un tiempo de espera transitorio del
servidor durante la ejecución concurrente de comprobaciones.

La compilación conserva avisos de tamaño del paquete web y de una fuente externa
no resuelta durante la construcción. No impiden generar la web.

Sin commit, push ni despliegue. La actualización mediante rebase no se pudo
realizar por los cambios locales existentes; se han conservado.
