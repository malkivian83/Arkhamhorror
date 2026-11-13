# 106 · Los confines de la Tierra

## Estado y continuación

Corazón I/II y epílogo implementados y habilitados: sellos, mapa de radios/anillos, pilones atacables, mazos, referencia de caos, enemigos, huida, resoluciones y escenas condicionales completas EN/ES. El punto de control III conserva los sellos y reanuda mediante la ruta de descanso («El otro lado 3»), con preparación nueva. Corregidos los efectos de armas sobre pilones, el reparto de sellos y la perdición inicial exclusiva de la parte I.

Picos y Ciudad ya enlazan sus constructores; el recorrido puede llegar al final. Incorporados los pasajes pendientes de Picos y Noche infinita, incluidas sus visitas y la escena adicional de Ellsworth/Claypool. Los nombres de los supervivientes aparecen traducidos en el registro. Las 148 caras de cartas EN/ES de Corazón y sus miniaturas están presentes.

Verificación: 71 casos de Corazón y regresiones dirigidas de campaña, armas, motor, vistas y narración; formato/lint, tipos de cartas/web/servidor y empaquetado web. Invalidan estos resultados los cambios en esas reglas, contratos, recursos o configuración; las comprobaciones visuales quedan para la persona usuaria. Guía oficial: tmp/pdfs/AHLCG_Los_confines_de_la_tierra.pdf, pp. 49–60 para Corazón.

Audios preparados sin llamadas a ElevenLabs: 108 pasajes y 17 caras pendientes, con texto completo, destino y huella en los manifiestos. Conservados 124 pasajes y 43 caras ya grabados. Usar los generadores existentes con una futura API con créditos; --refresh sólo actualiza el inventario local. Última implementación: commit `8abfbf69` en `main`, con subida autorizada. La actualización desde origin no incorporó cambios de código; siguen vigentes las comprobaciones anteriores. Siguiente paso: generación de las locuciones cuando se facilite la API. El estado anterior queda en historial/106-confines-de-la-tierra.md.

Hielo y muerte I está disponible desde el selector con los nueve compañeros,
el mazo ¡Tekeli-li!, la referencia de caos y las cartas EN/ES. Las pruebas de
campaña llegan a la resolución mediante el acto y mediante el plan final.
Comprueban el campamento, la experiencia, la bolsa persistente y el coste de
entrada que pagan solo los investigadores en el Lugar de origen. Retirar
Helada del barco persiste aunque la ficha perteneciera a la bolsa inicial.

El punto de control I, La desaparición, funciona en el registro local y en las
salas. El refugio determina cuántos compañeros quedan a salvo. La elección
persiste al guardar y dirige la campaña a la parte II o al punto de control II.
Las tres escenas del punto de control están narradas en español.

Hielo y muerte II está disponible en local desde la ruta de búsqueda. Recupera
el campamento y los Lugares revelados, prepara las cartas ocultas y registra
los rescates y las bajas al cerrar. Incluye cartas EN/ES y 14 locuciones de Salva.

El ataque y Hielo y muerte III están disponibles en local. Huir omite la parte
III y registra la huida. Combatir recupera el campamento y reparte los ocho
Eidolones ocultos de forma equitativa. Las resoluciones registran victoria,
huida o derrota con sus bonificaciones de experiencia.

Noche reposada está disponible en el registro local y en salas. Conserva las visitas y
sus efectos al recargar, y ofrece Espejismo letal si hay al menos tres bajas.
Incluye tres locuciones de Salva. Los Memoriales se anotan en el registro.
El motor reconoce los nueve Memoriales como recompensas de historia con sus
habilidades impresas. Obras completas de Poe devuelve los ¡Tekeli-li! de las
seis primeras cartas del investigador elegido. El Alijo de Takada sale de la
partida al jugarse y Anyu permite resolver sus opciones en el orden elegido.
Verificados los efectos de los nueve Memoriales, la continuidad del interludio,
el catálogo EN/ES y las regresiones de búsqueda, eventos y bonificaciones de prueba.
En salas, el anfitrión registra las visitas y elige la ruta, y todos los
jugadores pueden escuchar la narración y ver el avance.
Verificadas 62 pruebas dirigidas de salas, vista en línea, guardado local e
interludio, incluidas la autorización y la repetición de peticiones.

Espejismo letal está habilitado desde Noche reposada. El mapa de 19 Lugares conserva los
símbolos impresos, los destinos y el coste de Espejismo. La preparación
reutiliza los recuerdos descubiertos entre visitas. El registro distingue
los recuerdos desterrados y calcula su experiencia una sola vez.
Las pruebas del motor cubren el pago grupal de Espejismo en un Lugar
revelado, la elección de un destino y su entrada con las pistas ajustadas.
Anamnesis permite recibir 2 de horror o colocar perdición y comprobar
inmediatamente el avance del plan.
Sombra horripilante acumula perdición cuando un investigador descubre o toma
el control de pistas de su Lugar y pierde Indiferente cuando se agotan los
destinos de Espejismo de ese Lugar.
Bruma evanescente se vincula al Lugar más cercano con destinos pendientes,
añade pistas, encarece su exploración y se descarta al despejarlo.
Resolver Espejismo cuesta una acción. Los planes de las tres visitas permiten
volver a la Prisión de recuerdos pagando horror y aplican su penalización al
avanzar. La resolución registra las Historias desterradas y sus puntos de
experiencia sin duplicarlos.
La referencia de caos resuelve las cuatro fichas de símbolo según la dificultad.
Hay 28 locuciones de Salva incorporadas para pasajes de Espejismo y las
introducciones de los escenarios siguientes. Los textos están en EN/ES y el
manifiesto verifica las huellas de los textos en español y de los MP3.
Los nueve Recuerdos están conectados a sus Lugares terminales. Sus reacciones
o acciones de Negociar, la mejora a Decidido y el destierro del Lugar si el
Compañero murió están cubiertos en el motor. El constructor prepara las tres
visitas, sus 38 cartas de Encuentro y la restauración de recuerdos previos.
Se aplican los efectos impresos de los Lugares, incluida la aportación individual
de pistas en las Salas de la universidad. Los 34 reversos narrativos tienen
texto EN/ES y locución de Salva. La resolución devuelve la campaña a Hacia los
picos prohibidos. La preparación de las visitas segunda y tercera reutiliza el
registro de campaña y queda disponible para las rutas de los escenarios siguientes.

Revisión del 06/11/2026, corregida y con pruebas:

- **Bruma afín:** solo se descarta tras resolver su Obligado.
- **Kensler y Takada de determinación:** Kensler, al ser rápida, no provoca ataques. Takada obtiene 1 recurso aunque esté vacía.
- **Locura y muerte:** lleva a R1 sin leer «Sin resolución».
- **Fantasmagoría:** elige la Pesadilla más cercana a cualquier investigador.
- **Huida en local:** su narración se muestra antes de Noche reposada, como en salas.

Pendiente de contrastar con la guía escaneada:

- Reparto 3/3/2 de Eidolones con tres investigadores (la referencia aparta dos).
- ¡Tekeli-li! descartadas por Danforth de determinación.
- Desistir fuera del acto con el Terror de las estrellas.
- Memorial opcional y Espejismo omitido en Noche reposada.

Verificado sobre este cambio: pruebas de la carpeta de la campaña, Helada, selector y tipos de motor, cartas y web.

Claypool reutiliza la cancelación de fichas. La prueba puede terminar sin
modificador si cancela la única ficha sin reemplazarla. Fredericks usa una
restricción de ataque para toda la ronda, distinta de la restricción de Carcosa
que solo aplica durante la fase de enemigos.

Verificación sobre `57dac2a4`: 522 pruebas de motor, escenarios y campaña,
salas, selector, referencia y catálogo. Tipos, formato, lint y huellas de los
escaneos y miniaturas. Repetir controles si cambian reglas, textos, recursos o
registro.

Validación local de La desaparición: rutas y refugio, recarga de guardados,
permisos y reintentos de sala, y correspondencia de las locuciones.

Revisión de la guía oficial en español, pp. 13–17, y de las cartas EN/ES de ambos escenarios.
Corregida la elección de la debilidad ¡Tekeli-li! al buscar en todo el mazo en
la parte II. En la III se contrastaron aparición, reparto de cartas ocultas,
avance del plan, desistimiento y experiencia. La transición digital usa el
mismo guardado al continuar de inmediato o tras una pausa.

## Hoja de ruta

Pasos para tener la campaña completa en línea. `[x]` hecho, `[~]` en curso o
sin publicar, `[ ]` pendiente.

**Preparación**

1. [x] Guía de campaña e inventario EN/ES reproducible del paquete eoec.
2. [x] Revisión del PDF de la expansión de investigadores (no cambia la campaña).

**Mecánicas comunes**

3. [x] Helada, contrastada con las páginas 2–3 de la guía: −1 y otra revelación;
   la segunda revelada _de la bolsa_ en la misma prueba detiene las revelaciones
   y es fracaso automático (las selladas o nombradas no cuentan; Máscara de Sileno
   y Atenea marcan sus fichas como sacadas de la bolsa); sin efecto fuera de
   pruebas; máximo ocho entre bolsa y selladas; persiste en la bolsa de campaña.
   Textos EN/ES y ayuda de ficha. Pruebas en `packages/engine/src/frost.test.ts`.
   Verificado: suite completa el 04/11/2026; tras el ajuste de la bolsa, suite del
   motor, Máscara de Sileno, Gala de invierno, tipos de motor, cartas y web, y
   lint. Interpretación propia, sin texto en la guía: una Helada de la bolsa
   ignorada cuenta para la segunda. Revisión visual pendiente con el prólogo.
4. [~] Estado de expedición opcional en `CampaignLog`. El motor permite registrar
   el campamento y los suministros, y conserva identidad, estado, daño y horror
   de cada compañero. La selección impide que dos investigadores lleven al mismo
   personaje. Desistir conserva al compañero y la derrota lo elimina. La pregunta
   de preparación ofrece los compañeros disponibles y la opción de ir solo.
   Los nueve compañeros tienen cartas registradas en el escenario local.
5. [~] Mazo ¡Tekeli-li! de 16 copias compartidas. Se reconstruye en cada escenario
   descontando las copias asignadas en el registro de campaña. Las siete revelaciones
   tienen pruebas y texto EN/ES, y devuelven su copia al fondo. El escenario local
   prepara el mazo especial y conecta los efectos que entregan las debilidades.
6. [~] Punto de control I y salto de la parte II. Pendientes los demás puntos de control y el recorrido no lineal:
   reanudación de escenarios y visitas a Espejismo letal.

**Escenarios** (preparación, conjuntos de encuentros, cartas, resolución, pruebas)

7. [~] Prólogo con bolsas impresas por dificultad, elección del investigador jefe
   con nota y ficha persistentes, variante de Winifred y muerte reproducible antes
   de elegir compañero. Resúmenes EN/ES. Conectado al arranque de campaña local.
8. [x] Hielo y muerte I (08501a), jugable desde el selector hasta la resolución.
   Su resolución enlaza con La desaparición.
9. [x] Hielo y muerte II y III (08501b/c) y sus puntos de control, jugables en local.
10. [x] Noche reposada y Espejismo letal (08549).
11. [~] Hacia los picos prohibidos (08596), preparado sin habilitar (guía pp. 27–30).
    Hecho: diagonal de 5 Laderas al azar y La cumbre con niveles 0–5, entrada
    bloqueada si quedan pistas abajo, pasajes de la introducción con Helada o
    trauma, mitad de pistas iniciales si se oteó el paso, suministros en el nivel 0,
    fichas según el nivel, forzados al subir, planes que devuelven las pistas,
    Terror de las estrellas con el interludio Golpea la tragedia, desistir en La
    cumbre, R1/R2 con suministros tachados y Apoyos añadidos al mazo, y las cartas
    de Encuentro del escenario y de Antiguos. Los siete suministros de Expedición
    (`forbidden-peaks-supplies.ts`): el Trineo guarda las cartas en
    `scenarioDecks.peaksSledge` y ofrece jugarlas como habilidad del escenario a
    quien esté en su Lugar; la Radio reutiliza habilidades y reacciones de los
    compañeros vivos fuera de juego sobre un apoyo virtual y descarta las que
    necesitan el propio apoyo (Takada base); el Cristal de miasma se ofrece al
    revelar ¡Tekeli-li!; el Espécimen ignora la Helada en su prueba. Los escenarios
    posteriores deben reutilizar `sledgeAbilities` y `supplyStep`.
    Referencia de fichas con la carta 08596. Las bonificaciones de Danforth y Takada
    de Noche reposada se aplican al empezar (`startingBonuses` del escenario).
    Pruebas en `forbidden-peaks.test.ts` (24).
    Interludio II: Noche infinita (pp. 31–35) reutiliza `restful-night.ts` con
    `night: 'endless'`: visitas propias (cuatro si se encontró otro camino), Kensler
    solo si compartió su investigación, notas de las afueras y de Kensler, cartas o
    recursos extra para la Ciudad, Memoriales, y puerta del Espejismo si ya se visitó
    (añade 1 Helada) o hay tres bajas. El recorrido sigue a una segunda entrada de
    Espejismo letal y a la Ciudad. Pruebas en `endless-night.test.ts`.
    Pendiente: locuciones de los seis pasajes de Picos y
    de los cuatro pasajes de Noche infinita (cuota de ElevenLabs agotada el
    12/11/2026), cuyos textos esperan en `tmp/peaks-pending/`; después, activar
    Picos en el selector.
12. [~] Ciudad de los Antiguos (08621), guía pp. 36–43. Lotes previstos:
    1. [x] Llaves en el motor (`keys` en Lugares, investigadores y enemigos,
       `PlaceKey`, `SpendKeys`, `keysSpent`, `afterTakeKey`, gancho `keysBlocked`):
       tomar la llave de un Lugar sin pistas y darla en el mismo Lugar como
       habilidades libres; al ser eliminado, las llaves quedan en su Lugar. Se ven
       en Lugares, enemigos y zona del jugador. Pruebas en `keys.test.ts`.
    2. [x] `city.ts`, `city-cards.ts`, `city-encounters.ts`: la versión sigue a la
       columna con más compañeros vivos (empate: `edgeOfTheEarthCityVersion` del
       registro; elección del jefe integrada en la preparación); 16 Paisajes urbanos con cara al azar
       y una llave al azar cada uno, mapas de las pp. 39–41 conectados por lados,
       inicio elegido por el jefe (v. I) o fijo; Túnel oculto cerrado hasta el acto 1
       y con su prueba; actos y planes por versión con el gasto de llaves, recuerdos,
       búsqueda en columna o fila, mazo de Encuentros por versión y conjuntos
       apartados; capacidades de los diez Paisajes; fichas con llaves y Cámara
       laberíntica. Pruebas en `city.test.ts`. Cartas EN/ES y locuciones de
       planes y actos (08622–08629) incorporadas.
    3. [x] `city-encounter-rules.ts`: Antiguo benigno (aparece en un Lugar vacío
       con perdición, parlamentar, perdición al plan al ser derrotado), Antiguo
       revivido (toma una llave al enfrentarse, la suelta al dejar el juego, ataca a
       quien toma una llave en su Lugar), Comprensión de la verdad, Ruinas en mal
       estado, Congelado y Poseído (en la zona de amenaza; el motor los cura como 1
       daño/horror con `healsAs`), Pingüino albino gigante (`moveCost` de enemigo),
       ¡Mec! ¡Mec! ¡Mec! y los dos Shoggoths. El Terror de la Ciudad solo bloquea las
       llaves. Pruebas en `city-encounters.test.ts` (9).

    Revisión del 13/11/2026 de Picos, Noche infinita, llaves y Ciudad (lotes 1–2):
    ocho correcciones con pruebas. Trineo también en la Ciudad y en la segunda visita
    al Espejismo; Persiguiendo lo desconocido (v. II) devuelve una copia de
    ¡Tekeli-li! por carta; el Puente solo mueve a Puentes revelados; retirar las
    fichas de Antiguo persiste (`edgeOfTheEarthStartingElderThingRemoved`); recibir
    una llave dispara `afterTakeKey`; «Sin resolución» de Picos solo si todos caen;
    el Sendero barrido por el viento también se reduce a la mitad; en empates del
    enemigo más cercano elige el investigador.
    4. [x] Contemplar la locura, introducción condicional con elección de grupo y
       resoluciones (experiencia por cada par de llaves gastadas), textos íntegros EN/ES
       y locuciones. Noche final implementada con relatos completos; 19 pasajes
       de ese interludio aún sin audio, identificados por huella en el manifiesto.
13. [ ] El corazón de la locura I y II (08648a/b) y epílogo.

**Presentación y publicación**

14. [~] Cartas de encuentro en catálogo EN/ES, imágenes y manifiesto. El catálogo
    local incluye ¡Tekeli-li! y los nueve compañeros, con escaneos y miniaturas
    EN/ES. Completar los recursos de los escenarios siguientes.
15. [ ] Ayuda de fichas de cada escenario (tarjeta de referencia oficial).
    Incluirla en la entrega de cada escenario.
16. [ ] Narraciones con la voz indicada abajo.
17. [ ] Campaña en el selector, pruebas de sesión de campaña completa y
    regresiones de campañas previas.
18. [ ] Revisión visual por la persona usuaria y publicación.

Las cartas de jugador de la expansión de investigadores siguen el flujo de
importación (guía 59) y no bloquean la campaña.

Inventario reproducible: 266 códigos EN/ES, 24 conjuntos, 371 copias según el
catálogo fuente. Son entradas de datos, no 266 reglas implementadas ni un recuento
certificado de cartas físicas: hay que revisar caras y variantes antes de usar
las cantidades para preparar mazos. El catálogo local incluye las siete entradas
de ¡Tekeli-li! y dieciocho cartas de compañero.

## Narración

Los pasajes de historia ya implementados se muestran con el texto de la guía o
de la carta correspondiente. La preparación conserva sus instrucciones. Noche
reposada muestra el segundo pasaje al terminar las visitas y añade el tercero
si aparece la puerta.

Los 51 pasajes narrativos tienen locución de Salva (`hyKxCTlAqtnW188CgltM`).
Ocho reversos de plan reutilizan las pistas de las cartas y las resoluciones
III-1 y III-2 comparten pista porque el relato es idéntico.

`node scripts/generate-edge-of-the-earth-audio.mjs --generate` completa las
grabaciones pendientes. Se puede seleccionar una parte del trabajo con
`--only=clave1,clave2`. Las huellas del registro permiten recuperar el avance
y comprobar que cada grabación corresponde al texto mostrado.

La preparación ofrece narración en los planes y actos iniciales de las tres
partes de Hielo y muerte. Las 21 caras de plan y acto con texto narrativo
están grabadas con Salva y verificadas en el registro de cartas. Se generan con
`node scripts/generate-campaign-card-audio.mjs --campaign=edge-of-the-earth --generate`.

## Fuentes revisadas

- Guía española añadida: `reglas/AHLCG_Los_confines_de_la_tierra.pdf`.
  Revisión visual de las páginas 2–5 y 7–8; el escaneo no proporciona
  texto extraíble. Falta revisar la preparación completa, resoluciones y puntos
  de control de cada escenario al implementarlos. Los renders están en `tmp/eote/`.
- Reglas de la expansión de investigadores añadidas:
  `reglas/AHLCG_Investigadores_Los_confines_de_la_tierra.pdf` (4 páginas, texto
  extraíble). No contiene reglas de campaña; su efecto se resume en
  [Expansión de investigadores](#expansión-de-investigadores).
- Aplicación de referencia externa: `D:/referencia/ArkhamHorror-main`.
  Consultados `Campaign/Campaigns/EdgeOfTheEarth.hs`,
  `Campaigns/EdgeOfTheEarth/{CampaignSteps,Partner}.hs` y
  `Scenario/Scenarios/EdgeOfTheEarth/IceAndDeathPart1.hs`, bajo
  `backend/arkham-api/library/Arkham/`.
- Para los pasos 4–5 se contrastaron las correspondencias de compañeros,
  `Campaigns/EdgeOfTheEarth/{Helpers,Supplies}.hs` y los siete módulos de
  `Treachery/Cards/EdgeOfTheEarth/Tekelili/`, junto con los textos EN/ES.
- Datos EN/ES de `frontend/public/cards_{en,es}.json`, paquete **eoec**.
  El paquete de investigadores es distinto; seleccionar por prefijo numérico
  perdería entradas de esta campaña. El inventario guarda las huellas de ambas
  fuentes y valida códigos únicos, paridad EN/ES, tipo, conjunto y cantidades.

La referencia sirve para estudiar comportamiento y localizar recursos; las
reglas se implementan aquí y se contrastan con la guía/cartas. No se ha iniciado
su backend ni una sesión de navegador.

## Diferencias que condicionan el diseño

| Necesidad | Situación local y trabajo necesario |
| --- | --- |
| Helada | Implementada (paso 3). Primera ficha: −1 y otra revelación; segunda en la misma prueba: detener revelaciones y fracaso automático. Máximo ocho entre bolsa y fichas selladas. Fuera de pruebas no tiene efecto ni valor (FAQ de investigadores: con 21 o nada no suma y se puede seguir revelando o plantarse). Mantener las fichas reveladas fuera de la selección hasta terminar la prueba. |
| Compañero | El registro de expedición conserva los nueve personajes por código base, también al elegir su versión de determinación. Faltan las cartas y sus habilidades, y conectar la preparación y sus efectos a cada escenario. |
| ¡Tekeli-li! | Mazo especial de 16 debilidades: siete códigos con cantidades 3/3/2/2/2/2/2. Mantener un conjunto finito compartido, persistencia en los mazos de investigadores y devolución al mazo especial al resolverlas. No tratarlas como debilidades básicas comprables. |
| Puntos de control | `CampaignScenario.allowDeckChangesAfter` ya permite bloquear compras, pero el progreso normal incrementa `scenarioIndex`. Hace falta representar decisiones, partes omitidas y reanudación sin repetir preparaciones o recompensas. |
| Espejismo letal | Puede reaparecer entre escenarios; no modelarlo como una única casilla obligatoria de un recorrido lineal. Conservar visitas y estado de personajes entre ellas. |
| Refugio y suministros | Estado propio de Hielo y muerte y sus puntos de control; documentar tipos y consumidores antes de añadir campos al guardado. Los valores de refugio también intervienen en la calavera del primer escenario. |

La palabra clave Alerta ya existe en el proyecto; revisar sus pruebas y reutilizarla.
No confundir apoyos Aliado ordinarios con la nueva palabra clave Compañero.

## Expansión de investigadores

El PDF de investigadores cubre cartas de jugador, no la campaña; no cambia
escenarios, entregas ni el orden previsto. Contraste con el proyecto:

- **Multiclase**: la carta pertenece a todas sus clases y no es neutral; entra si
  el investigador accede a cualquiera de ellas, y no ocupa espacio limitado si
  otra de sus clases tiene acceso ilimitado. Ya soportado por `classes` en
  `PlayerCardDef`, `deckOptionAllows` y el recuento de `offClassLevelZeroLimit`
  en `packages/cards/src/decks.ts`. Añadir una prueba con el ejemplo de
  Monterrey Jack (Buscador/Superviviente frente a Buscador/Rebelde) al importar
  la primera multiclase de este paquete.
- **Investigado**: solo se obtiene mejorando la versión menor tras anotar la
  tarea en el registro; después cualquier investigador de la campaña puede
  mejorarla. Ya existe (Solución extraña, tomos de Harvey Walters); el Archivo de
  conductos debe reutilizar ese mecanismo con su nota "los investigadores han
  identificado el portal".
- **FAQ para la importación** (guía 59): neutral no es clase para Sinergia;
  El heraldo revelado encima del mazo impide cualquier manipulación del mazo;
  Bob Jenkins puede jugar sus propios Apoyos Objeto con su acción adicional;
  21 o nada se pasa por encima de 21; acción básica de Cerrar el círculo es la
  no modificada por un indicador de acción en negrita; Usos de la Escopeta vieja
  solo se refieren a la entrada en juego, salvo que un Evento aluda a Usos.
  Ninguna de estas cartas está implementada todavía; no confundir El heraldo con
  El heraldo de Elokoss (`brethren-of-ash`).

## Mapa de escenarios de la referencia

Son cinco escenarios narrativos, ocho módulos de preparación y una campaña de
4–10 sesiones según la guía; no ocho escenarios obligatorios consecutivos.

| Código de módulo | Escenario |
| --- | --- |
| 08501a | Hielo y muerte, parte I |
| 08501b | Hielo y muerte, parte II, opcional desde el punto de control 1 |
| 08501c | Hielo y muerte, parte III, opcional desde el punto de control 2 |
| 08549 | Espejismo letal, visitas condicionadas desde los interludios |
| 08596 | Hacia los picos prohibidos |
| 08621 | Ciudad de los Antiguos |
| 08648a | El corazón de la locura, parte I |
| 08648b | El corazón de la locura, parte II |

No confundir `08501a/b/c` (identificadores de módulos) con el código `08501`
de la carta de referencia. Lo mismo exige atención en las dos partes finales.

## Entregas y criterios de aceptación

1. **Helada.** Extender símbolo, resolución, límites y presentación EN/ES.
   Probar primera y segunda Helada, modificadores acumulados, ausencia de
   reposición prematura, cancelación/ignoración y revelaciones adicionales,
   fin de prueba, sellado y bolsa persistente. Revisar consumidores exhaustivos
   de símbolos y compatibilidad con guardados existentes.
2. **Estado de expedición y ¡Tekeli-li!** Definir estado tipado y valores
   iniciales compatibles con guardados previos. Probar selección de compañeros,
   derrota/desistir, heridas entre partidas y transición a determinación.
   Probar conservación de las 16 copias entre mazo especial y mazos de jugador,
   devolución, agotamiento y reanudación. Implementar y probar cada efecto.
3. **Prólogo, puntos de control y primera parte.** Bolsas por dificultad
   contrastadas con página 3, elecciones del prólogo y muerte aleatoria
   reproducible antes de seleccionar compañero. Preparación y reglas de
   Hielo y muerte I, resolución, refugio, suministros y guardado. Validar rutas
   al continuar o pausar, restricciones de mejora y partes omitidas.
4. **Completar el recorrido.** Partes II/III, interludios, Espejismo letal y
   después Picos, Ciudad y Corazón. Añadir pruebas de rutas y regresiones de
   campañas previas cuando se amplíe la progresión compartida.

Para Hielo y muerte I, la referencia reúne `ice_and_death`, `the_crash`,
`deadly_weather`, `hazards_of_antarctica`, `silence_and_mystery`, `tekelili`
y Antiguos males del básico; aparta `creatures_in_the_ice`. El catálogo de eoec
no contiene ese conjunto básico: reutilizar su implementación revisada.
Comienzo en el lugar del accidente y tres Lugares adicionales en juego;
Lugares Inexplorado apartados. Planes Cold Welcome → Into the White →
Running Out of Time; acto Search for a Camp Site. Perdición inicial adicional:
una en difícil y dos en experto. Contrastar estos detalles con las páginas de
preparación y las cartas antes de escribir las pruebas.

Cada entrega exige comportamiento probado, textos EN/ES, registro explícito y
conexiones; el inventario por sí solo no habilita contenido. Revisiones visuales
de la aplicación quedan a cargo de la persona usuaria, sin pruebas de navegador.

## Reproducir la preparación

```powershell
node scripts/inventory-edge-of-the-earth.mjs D:/referencia/ArkhamHorror-main
node scripts/inventory-edge-of-the-earth.mjs D:/referencia/ArkhamHorror-main --check
```

Salida: [inventario EN/ES](106-confines-inventario.json). El comando no modifica
datos de juego. `--check` verifica además que el inventario coincide exactamente
con las fuentes, incluidas sus huellas; un cambio de catálogo obliga a revisarlo.

La preparación inicial verificó el inventario y el formato y lint del generador.
Repetir la comprobación del inventario si cambian las fuentes o su generador.
