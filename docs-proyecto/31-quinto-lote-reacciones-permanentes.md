# 31 · Quinto lote: reacciones, apoyos con usos y permanentes

> Actualización: el [sexto lote](32-sexto-lote-fundamentos-clasicos.md) completa Meat Cleaver e incorpora la reedición aplazada.

21/10/2026. Continuación del [cuarto lote](30-cuarto-lote-reediciones.md), cuya
CI y despliegue se han verificado antes de empezar. Se incorporan **25 registros**
con reglas equivalentes a comportamientos propios revisados.

## Alcance

Se amplía la reutilización a apoyos con acciones y usos, efectos de símbolos,
reacciones desde la mano y seis reediciones de permanentes. La selección de
este grupo es de 25 porque no se añaden registros sin verificar para alcanzar
un tamaño fijo de lote.

La coincidencia de datos no basta: la reedición 05114 de Meat Cleaver permanece
aplazada. Se detectó que la implementación de origen 12077 solo cubre su
bonificación de combate, no el coste opcional de horror ni la curación tras
derrotar al enemigo. Esa corrección queda priorizada para una incorporación
posterior; el registro 05114 no se activa en este lote.

| Código | Carta | Comportamiento propio de referencia |
| --- | --- | --- |
| 60155 | M1911 | 12019 |
| 01020 | Machete | 12020 |
| 01520 | Machete | 12020 |
| 04103 | Scene of the Crime | 12024 |
| 05024 | Fingerprint Kit | 12031 |
| 05276 | Studious | 12042 |
| 04107 | Lucky Cigarette Case | 12044 |
| 60308 | Lucky Cigarette Case | 12044 |
| 09064 | Thieves' Kit | 12049 |
| 07114 | Breaking and Entering | 12050 |
| 05278 | Another Day, Another Dollar | 12056 |
| 60459 | Cosmic Flame | 12059 |
| 60460 | Second Sight | 12062 |
| 04199 | Premonition | 12064 |
| 01065 | Ward of Protection | 12065 |
| 01565 | Ward of Protection | 12065 |
| 08073 | Bandages | 12073 |
| 01079 | "Look what I found!" | 12078 |
| 60517 | "Look what I found!" | 12078 |
| 01579 | "Look what I found!" | 12078 |
| 02158 | Charisma | 12095 |
| 01694 | Charisma | 12095 |
| 02157 | Relic Hunter | 12096 |
| 01695 | Relic Hunter | 12096 |
| 60518 | Oops! | 02113 |

## Identidad y permanentes

El adaptador cambia las referencias a la propia carta dentro de los mensajes
serializables. Los eventos desde la mano pagan y descartan la edición correcta;
Premonition conserva el código real al sellar y resolver una ficha, también tras
guardar y restaurar. Las claves de reacción de la mano se distinguen por edición.
No se cambian identificadores de investigador, enemigo o apoyo. El adaptador no
muta los mensajes originales.

Los permanentes necesitan una aprobación dedicada con fuente de comportamiento
y evidencia de equivalencia. La conversión general sigue rechazando permanentes
sin ese adaptador, y no habilita excepcional, miríada ni exilio. Se prueban la
mano inicial adicional, recursos iniciales, ranuras de aliado y accesorio, entrada
fuera del mazo y protección frente a descarte.

## Procedencia y regeneración

- Manifiesto y módulos: packages/cards/src/reprints-wave-2/.
- Datos: packages/cards/src/data/reprints-wave-2.json.
- Regeneración: node scripts/prepare-dunwich-pilot.mjs reprints-wave-2.
- Auditoría: node scripts/verify-reprint-equivalence.mjs RUTA_INSTANTANEA_EN_JSON reprints-wave-2.

Se comprueban la huella de la instantánea original y los mismos campos mecánicos
del cuarto lote, incluido el texto comparado en memoria. Se almacenan huellas,
no texto oficial íntegro. Cada registro dispone de nombre EN/ES, resumen propio
y presentación renderizada local. No se reemplazan códigos de mazo por otra edición.

## Cobertura y recuento

Cada código tiene módulo y pruebas de efecto principal y disponibilidad en
mazos o compras con experiencia, con inicio real de escenario. Se comprueban
además usos vacíos, gasto del último suministro, penalización de símbolos sin
cargas, persistencia de la ficha sellada e identidad de los eventos reactivos.

Los cinco lotes suman **87 registros incorporados**, además de los 104 anteriores:
191 registros de esa base y ampliación. Quedan **1.792 registros** del inventario
fuera de la incorporación. Son registros con reediciones y variantes, no efectos únicos.

## Verificación

Formato, lint, tipos y compilación correctos. Suite completa: **1.244 pruebas
correctas y 15 omitidas**. Las omitidas no
acreditan cobertura en este entorno. Se ha repetido la comparación de las 25
reediciones contra la instantánea original y se mantiene el inventario histórico.
La compilación conserva los avisos anteriores de tamaño del paquete web y de
fuente externa durante la construcción.
